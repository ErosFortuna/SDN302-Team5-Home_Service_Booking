const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const User = require('../src/modules/users/user.model.js');
const AuthSession = require('../src/modules/auth/session.model.js');
const {
  createSessionForUser,
  rotateRefreshToken,
  revokeAllUserSessions,
  setTokenPersistenceForTests,
  hashRefreshToken,
} = require('../src/modules/auth/token.service.js');

function installSessionStore(t) {
  const sessions = new Map();
  const original = {
    findOne: AuthSession.findOne,
    findById: AuthSession.findById,
    findOneAndUpdate: AuthSession.findOneAndUpdate,
    create: AuthSession.create,
    updateOne: AuthSession.updateOne,
    updateMany: AuthSession.updateMany,
  };

  const applyUpdate = (session, update) => {
    if (update.$set) Object.assign(session, update.$set);
    return session;
  };

  AuthSession.create = async (document) => {
    const session = {
      ...document,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    sessions.set(session.tokenHash, session);
    return session;
  };
  AuthSession.findOne = async (filter) => sessions.get(filter.tokenHash) || null;
  AuthSession.findById = async (id) =>
    [...sessions.values()].find((session) => String(session._id) === String(id)) || null;
  AuthSession.findOneAndUpdate = async (filter, update) => {
    const session = [...sessions.values()].find(
      (item) => String(item._id) === String(filter._id),
    );
    if (!session) return null;
    if (filter.revokedAt === null && session.revokedAt) return null;
    if (filter.tokenHash && session.tokenHash !== filter.tokenHash) return null;
    return applyUpdate(session, update);
  };
  AuthSession.updateOne = async (filter, update) => {
    const session = [...sessions.values()].find(
      (item) => String(item._id) === String(filter._id),
    );
    if (!session) return { modifiedCount: 0 };
    if (filter.revokedAt === null && session.revokedAt) return { modifiedCount: 0 };
    applyUpdate(session, update);
    return { modifiedCount: 1 };
  };
  AuthSession.updateMany = async (filter, update) => {
    let modifiedCount = 0;
    for (const session of sessions.values()) {
      if (filter.familyId && session.familyId !== filter.familyId) continue;
      if (filter.user && String(session.user) !== String(filter.user)) continue;
      if (filter.revokedAt === null && session.revokedAt) continue;
      applyUpdate(session, update);
      modifiedCount += 1;
    }
    return { modifiedCount };
  };

  setTokenPersistenceForTests(true);
  t.after(() => {
    Object.assign(AuthSession, original);
    setTokenPersistenceForTests(null);
  });
  return sessions;
}

function makeUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Refresh User',
    email: 'refresh@example.com',
    phone: '0901234567',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    emailVerified: true,
    tokenVersion: 0,
    async save() {
      return this;
    },
    ...overrides,
  };
}

function installUserMock(t, user) {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  User.findById = () => ({
    select: () => Promise.resolve(user),
    then: (resolve) => Promise.resolve(user).then(resolve),
  });
  User.findOne = () => ({
    select: () => Promise.resolve(user),
  });
  User.findByIdAndUpdate = async (id, update) => {
    if (update?.$inc?.tokenVersion) {
      user.tokenVersion = (user.tokenVersion || 0) + update.$inc.tokenVersion;
    }
    return user;
  };
  t.after(() => {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  });
}

function validLoginUser(overrides = {}) {
  const user = makeUser(overrides);
  user.comparePassword = async (candidate) => candidate === 'CorrectPassword123!';
  user.passwordHash = 'hash';
  return user;
}

test('V-11: login issues a 15-minute access token and refresh token for native clients', async (t) => {
  installSessionStore(t);
  const user = validLoginUser();
  installUserMock(t, user);

  const response = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'x-client-type': 'mobile' },
    body: { email: user.email, password: 'CorrectPassword123!' },
  });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.data.accessToken);
  assert.ok(response.body.data.refreshToken, 'native clients need a refresh token');
  const decoded = jwt.decode(response.body.data.accessToken);
  const ttl = decoded.exp - decoded.iat;
  assert.ok(ttl > 0 && ttl <= 15 * 60, `access token TTL should be <= 15m, got ${ttl}s`);
  assert.ok(decoded.sid, 'access token should carry the session id');
  assert.equal(response.body.data.refreshToken.includes('.'), false);
});

test('V-21: web login returns no refresh token in JSON and sets HttpOnly cookies', async (t) => {
  installSessionStore(t);
  const user = validLoginUser();
  installUserMock(t, user);

  const response = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'x-client-type': 'web', origin: 'http://localhost:3000' },
    body: { email: user.email, password: 'CorrectPassword123!' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.refreshToken, undefined);
  const cookies = response.headers['set-cookie'] || [];
  const refreshCookie = cookies.find((cookie) => cookie.startsWith(`${env.refreshCookieName}=`));
  const csrfCookie = cookies.find((cookie) => cookie.startsWith(`${env.csrfCookieName}=`));
  assert.ok(refreshCookie, 'refresh cookie must be set');
  assert.match(refreshCookie, /HttpOnly/i);
  assert.match(refreshCookie, new RegExp(`Path=${env.cookiePath}`, 'i'));
  assert.ok(csrfCookie, 'CSRF cookie must be set');
  assert.doesNotMatch(csrfCookie, /HttpOnly/i);
});

test('V-11: refresh rotates the token and revokes the previous session', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user, { ip: '10.0.0.1' });

  const response = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { 'x-client-type': 'mobile' },
    body: { refreshToken: first.token },
  });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.data.accessToken);
  assert.ok(response.body.data.refreshToken);
  assert.notEqual(response.body.data.refreshToken, first.token);

  const oldSession = sessions.get(hashRefreshToken(first.token));
  assert.ok(oldSession.revokedAt);
  assert.equal(oldSession.revokedReason, 'ROTATED');
  assert.equal(oldSession.replacedByTokenHash, hashRefreshToken(response.body.data.refreshToken));
});

test('V-11: concurrent refresh requests yield one rotation and one safe retry', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);

  const results = await Promise.all([
    rotateRefreshToken(first.token, { ip: '10.0.0.1' }),
    rotateRefreshToken(first.token, { ip: '10.0.0.2' }),
  ]);
  const statuses = results.map((result) => result.status).sort();
  assert.deepEqual(statuses, ['ok', 'retry']);

  const rotated = [...sessions.values()].filter((session) => session.revokedReason === 'ROTATED');
  assert.equal(rotated.length, 1, 'only one rotation may commit');
});

test('V-11: reuse outside the grace window revokes the whole token family', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);

  const rotated = await rotateRefreshToken(first.token);
  assert.equal(rotated.status, 'ok');

  const savedGrace = env.refreshTokenGraceMs;
  env.refreshTokenGraceMs = 1000;
  t.after(() => {
    env.refreshTokenGraceMs = savedGrace;
  });

  // Simulate the old token being replayed well after the rotation grace window.
  const oldSession = sessions.get(hashRefreshToken(first.token));
  oldSession.revokedAt = new Date(Date.now() - 10_000);

  const reuse = await rotateRefreshToken(first.token);
  assert.equal(reuse.status, 'reuse');

  const family = [...sessions.values()].filter(
    (session) => session.familyId === sessions.get(hashRefreshToken(first.token)).familyId,
  );
  assert.ok(family.length >= 2);
  assert.ok(family.every((session) => session.revokedAt), 'entire family must be revoked');
  const activeDescendant = family.find((session) => session.generation === 1);
  assert.equal(activeDescendant.revokedReason, 'REUSE_DETECTED');
});

test('V-11: reuse inside the grace window returns retry without revoking the family', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);
  assert.equal((await rotateRefreshToken(first.token)).status, 'ok');

  const retry = await rotateRefreshToken(first.token);
  assert.equal(retry.status, 'retry');

  const newSession = [...sessions.values()].find(
    (session) => session.generation === 1 && !session.revokedAt,
  );
  assert.ok(newSession, 'new rotated session must stay active');
});

test('V-11: expired refresh sessions are rejected and revoked', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);
  const stored = sessions.get(hashRefreshToken(first.token));
  stored.expiresAt = new Date(Date.now() - 1000);

  const result = await rotateRefreshToken(first.token);
  assert.equal(result.status, 'expired');
  assert.equal(stored.revokedReason, 'EXPIRED');
});

test('V-11: absolute family lifetime is enforced across rotations', async (t) => {
  installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user, {
    familyExpiresAt: new Date(Date.now() - 1000),
  });
  const result = await rotateRefreshToken(first.token);
  assert.equal(result.status, 'expired');
});

test('V-11: logout revokes refresh sessions and invalidates access tokens', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);
  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: '15m' },
  );

  const response = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/logout',
    headers: { authorization: `Bearer ${accessToken}`, 'x-client-type': 'mobile' },
    body: { refreshToken: first.token },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(user.tokenVersion, 1);
  const stored = sessions.get(hashRefreshToken(first.token));
  assert.ok(stored.revokedAt);
  assert.equal(stored.revokedReason, 'LOGOUT');
});

test('V-11: password change and admin revocation revoke all refresh sessions', async (t) => {
  const sessions = installSessionStore(t);
  const user = makeUser();
  await createSessionForUser(user);
  await createSessionForUser(user);
  assert.equal([...sessions.values()].filter((session) => !session.revokedAt).length, 2);

  await revokeAllUserSessions(user._id, 'PASSWORD_CHANGED');
  assert.equal([...sessions.values()].filter((session) => !session.revokedAt).length, 0);
  assert.ok(
    [...sessions.values()].every((session) => session.revokedReason === 'PASSWORD_CHANGED'),
  );
});

test('V-21: cookie-based refresh requires a matching CSRF token and allowed Origin', async (t) => {
  installSessionStore(t);
  const user = makeUser();
  installUserMock(t, user);
  const first = await createSessionForUser(user);

  const cookieHeader = `${env.refreshCookieName}=${first.token}; ${env.csrfCookieName}=csrf-token-123`;

  const missingCsrf = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { cookie: cookieHeader, 'x-client-type': 'web', origin: 'http://localhost:3000' },
  });
  assert.equal(missingCsrf.statusCode, 403);

  const wrongOrigin = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: {
      cookie: cookieHeader,
      'x-csrf-token': 'csrf-token-123',
      'x-client-type': 'web',
      origin: 'https://evil.example',
    },
  });
  assert.equal(wrongOrigin.statusCode, 403);

  const valid = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: {
      cookie: cookieHeader,
      'x-csrf-token': 'csrf-token-123',
      'x-client-type': 'web',
      origin: 'http://localhost:3000',
    },
  });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body.data.refreshToken, undefined);
  const cookies = valid.headers['set-cookie'] || [];
  assert.ok(cookies.some((cookie) => cookie.startsWith(`${env.refreshCookieName}=`)));
});

test('V-11: missing, malformed or unknown refresh tokens are rejected with 401', async (t) => {
  installSessionStore(t);
  const missing = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { 'x-client-type': 'mobile' },
    body: {},
  });
  assert.equal(missing.statusCode, 401);

  const malformed = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { 'x-client-type': 'mobile' },
    body: { refreshToken: 'short' },
  });
  assert.equal(malformed.statusCode, 401);

  const unknown = await dispatch(app, {
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { 'x-client-type': 'mobile' },
    body: { refreshToken: 'a'.repeat(64) },
  });
  assert.equal(unknown.statusCode, 401);
});
