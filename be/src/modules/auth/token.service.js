const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env.js');
const { logAuditEvent } = require('../../shared/audit-logger.js');
const AuthSession = require('./session.model.js');
const User = require('../users/user.model.js');

/**
 * V-11/V-21: Access + refresh token service.
 *
 * - Access tokens stay short-lived (default 15m) and carry tokenVersion.
 * - Refresh tokens are high-entropy opaque strings; only SHA-256 hashes are
 *   stored in MongoDB.
 * - Every refresh rotates the token. Reuse outside a small grace window revokes
 *   the entire token family. The grace window keeps concurrent refresh requests
 *   (multiple tabs) from randomly logging the user out; clients should still
 *   single-flight refreshes.
 */

let persistenceOverride = null;

function isPersistenceEnabled() {
  if (persistenceOverride !== null) return persistenceOverride;
  return mongoose.connection.readyState === 1;
}

function setTokenPersistenceForTests(enabled) {
  persistenceOverride = enabled === null ? null : Boolean(enabled);
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex');
}

function accessTokenSignOptions() {
  return {
    expiresIn: env.jwtExpiresIn,
    ...(env.jwtIssuer ? { issuer: env.jwtIssuer } : {}),
    ...(env.jwtAudience ? { audience: env.jwtAudience } : {}),
  };
}

function verifyAccessToken(rawToken) {
  return jwt.verify(rawToken, env.jwtSecret, {
    ...(env.jwtIssuer ? { issuer: env.jwtIssuer } : {}),
    ...(env.jwtAudience ? { audience: env.jwtAudience } : {}),
  });
}

function signAccessToken(user, session) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
    ...(session?._id ? { sid: session._id.toString() } : {}),
  };
  return jwt.sign(payload, env.jwtSecret, accessTokenSignOptions());
}

/**
 * Creates a refresh session. When persistence is disabled (unit tests or a
 * disconnected MongoDB) a transient in-memory session descriptor is returned so
 * authentication responses still have a session id to embed in the access token.
 */
async function createSessionForUser(user, options = {}) {
  const now = Date.now();
  const {
    ip,
    userAgent,
    familyId = crypto.randomUUID(),
    generation = 0,
    familyExpiresAt,
    token = generateRefreshToken(),
    tokenHash = hashRefreshToken(token),
    expiresAt,
  } = options;

  const resolvedFamilyExpiresAt =
    familyExpiresAt instanceof Date
      ? familyExpiresAt
      : new Date(now + env.refreshTokenMaxLifetimeMs);
  const resolvedExpiresAt =
    expiresAt instanceof Date
      ? expiresAt
      : new Date(Math.min(now + env.refreshTokenTtlMs, resolvedFamilyExpiresAt.getTime()));

  const document = {
    user: user._id,
    tokenHash,
    familyId,
    generation,
    familyExpiresAt: resolvedFamilyExpiresAt,
    expiresAt: resolvedExpiresAt,
    revokedAt: null,
    ...(typeof ip === 'string' ? { createdByIp: ip.slice(0, 100) } : {}),
    ...(typeof userAgent === 'string' ? { userAgent: userAgent.slice(0, 300) } : {}),
  };

  if (!isPersistenceEnabled()) {
    return {
      token,
      session: { ...document, _id: new mongoose.Types.ObjectId() },
    };
  }

  const session = await AuthSession.create(document);
  return { token, session };
}

async function revokeFamily(familyId, reason) {
  if (!isPersistenceEnabled()) return;
  try {
    await AuthSession.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  } catch (error) {
    console.error('[auth] Failed to revoke token family:', error?.message || 'unknown error');
  }
}

async function revokeAllUserSessions(userId, reason) {
  if (!isPersistenceEnabled()) return;
  try {
    await AuthSession.updateMany(
      { user: userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } },
    );
  } catch (error) {
    console.error('[auth] Failed to revoke user sessions:', error?.message || 'unknown error');
  }
}

async function revokeSessionByRawToken(rawToken, reason) {
  if (!isPersistenceEnabled() || !rawToken) return null;
  try {
    const tokenHash = hashRefreshToken(rawToken);
    return await AuthSession.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason, lastUsedAt: new Date() } },
      { new: true },
    );
  } catch (error) {
    console.error('[auth] Failed to revoke refresh session:', error?.message || 'unknown error');
    return null;
  }
}

async function findSessionByRawToken(rawToken) {
  if (!isPersistenceEnabled() || !rawToken) return null;
  return AuthSession.findOne({ tokenHash: hashRefreshToken(rawToken) });
}

/**
 * Rotates a refresh token.
 *
 * @returns {Promise<
 *   | { status: 'ok', token: string, session: object, user: object }
 *   | { status: 'retry' }
 *   | { status: 'reuse' | 'expired' | 'unauthorized' | 'invalid' }
 * >}
 */
async function rotateRefreshToken(rawToken, { ip, userAgent } = {}) {
  if (typeof rawToken !== 'string' || rawToken.length < 32) {
    return { status: 'invalid' };
  }
  if (!isPersistenceEnabled()) {
    return { status: 'invalid' };
  }

  const tokenHash = hashRefreshToken(rawToken);
  const session = await AuthSession.findOne({ tokenHash });
  if (!session) return { status: 'invalid' };

  const now = Date.now();
  if (
    !session.expiresAt ||
    session.expiresAt.getTime() <= now ||
    (session.familyExpiresAt && session.familyExpiresAt.getTime() <= now)
  ) {
    await AuthSession.updateOne(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: new Date(now), revokedReason: 'EXPIRED' } },
    );
    return { status: 'expired' };
  }

  if (session.revokedAt) {
    const revokedAgo = now - session.revokedAt.getTime();
    const withinGrace =
      session.revokedReason === 'ROTATED' &&
      revokedAgo >= 0 &&
      revokedAgo <= env.refreshTokenGraceMs &&
      Boolean(session.replacedByTokenHash);
    if (withinGrace) {
      // A concurrent request already rotated this token. Do not treat it as
      // theft; the client should retry with the freshly issued cookie/token.
      return { status: 'retry' };
    }

    await revokeFamily(session.familyId, 'REUSE_DETECTED');
    logAuditEvent({
      actorId: session.user,
      role: null,
      action: 'REFRESH_TOKEN_REUSE',
      targetType: 'USER',
      targetId: session.user,
      ip: ip || null,
      result: 'FAILURE',
      details: { reason: 'REUSE_DETECTED' },
    });
    return { status: 'reuse' };
  }

  const user = await User.findById(session.user).select('+passwordHash');
  if (!user || user.status !== 'ACTIVE' || !user.emailVerified) {
    await revokeFamily(session.familyId, 'USER_INACTIVE');
    return { status: 'unauthorized' };
  }

  const newToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newToken);
  const rotatedAt = new Date(now);

  // Atomic compare-and-set guarantees only one concurrent rotation wins.
  const rotated = await AuthSession.findOneAndUpdate(
    { _id: session._id, revokedAt: null },
    {
      $set: {
        revokedAt: rotatedAt,
        revokedReason: 'ROTATED',
        replacedByTokenHash: newTokenHash,
        rotatedAt,
        lastUsedAt: rotatedAt,
      },
    },
    { new: true },
  );

  if (!rotated) {
    const latest = await AuthSession.findById(session._id);
    if (
      latest?.revokedAt &&
      latest.revokedReason === 'ROTATED' &&
      now - latest.revokedAt.getTime() <= env.refreshTokenGraceMs
    ) {
      return { status: 'retry' };
    }
    await revokeFamily(session.familyId, 'REUSE_DETECTED');
    return { status: 'reuse' };
  }

  const expiresAt = new Date(
    Math.min(now + env.refreshTokenTtlMs, session.familyExpiresAt.getTime()),
  );
  const created = await createSessionForUser(user, {
    ip,
    userAgent,
    familyId: session.familyId,
    generation: (session.generation || 0) + 1,
    familyExpiresAt: session.familyExpiresAt,
    token: newToken,
    tokenHash: newTokenHash,
    expiresAt,
  });

  logAuditEvent({
    actorId: user._id,
    role: user.role,
    action: 'TOKEN_REFRESH',
    targetType: 'USER',
    targetId: user._id,
    ip: ip || null,
    result: 'SUCCESS',
    details: { generation: (session.generation || 0) + 1 },
  });

  return { status: 'ok', token: created.token, session: created.session, user };
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
  createSessionForUser,
  rotateRefreshToken,
  revokeFamily,
  revokeAllUserSessions,
  revokeSessionByRawToken,
  findSessionByRawToken,
  isPersistenceEnabled,
  setTokenPersistenceForTests,
};
