const crypto = require('crypto');
const { env, normalizeOrigin } = require('../../config/env.js');

/**
 * V-21: HttpOnly refresh cookie + double-submit CSRF helpers for the web client.
 *
 * The refresh token is never exposed to browser JavaScript for requests that
 * identify as web (x-client-type: web). Native clients receive the refresh token
 * in the JSON body and store it in OS secure storage instead.
 */

function parseCookieHeader(header) {
  const cookies = {};
  if (!header || typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (!name) continue;
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }
  return cookies;
}

function readCookie(req, name) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  return Object.prototype.hasOwnProperty.call(cookies, name) ? cookies[name] : null;
}

function cookieBaseOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: env.cookiePath,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, {
    ...cookieBaseOptions(),
    maxAge: env.refreshTokenTtlMs,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, cookieBaseOptions());
}

function setCsrfCookie(res, token) {
  const csrfToken = token || crypto.randomBytes(32).toString('base64url');
  res.cookie(env.csrfCookieName, csrfToken, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: env.refreshTokenTtlMs,
  });
  return csrfToken;
}

function clearCsrfCookie(res) {
  res.clearCookie(env.csrfCookieName, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
  });
}

function clearAuthCookies(res) {
  clearRefreshCookie(res);
  clearCsrfCookie(res);
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAllowedOrigins() {
  const configured = (env.clientUrl || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  if (env.nodeEnv === 'development') {
    // Local Next.js dev server origins are allowed without weakening production.
    return configured.concat(['http://localhost:3000', 'http://127.0.0.1:3000']);
  }
  return configured;
}

/**
 * Validates the double-submit CSRF token and Origin header for cookie-based
 * refresh/logout requests. Header-based (mobile) requests skip this check.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateCsrfRequest(req) {
  const headerToken = req.get('x-csrf-token');
  const cookieToken = readCookie(req, env.csrfCookieName);
  if (!headerToken || !cookieToken || !safeEqual(headerToken, cookieToken)) {
    return { ok: false, reason: 'CSRF_TOKEN_MISMATCH' };
  }

  const origin = req.get('origin');
  if (!origin) {
    return { ok: false, reason: 'ORIGIN_MISSING' };
  }
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(normalizeOrigin(origin))) {
    return { ok: false, reason: 'ORIGIN_NOT_ALLOWED' };
  }
  return { ok: true };
}

function isWebClient(req) {
  return String(req.get('x-client-type') || '').toLowerCase() === 'web';
}

function getRefreshTokenFromRequest(req) {
  const bodyToken =
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.trim()
      ? req.body.refreshToken.trim()
      : null;
  const cookieToken = readCookie(req, env.refreshCookieName);
  return {
    bodyToken,
    cookieToken,
    token: bodyToken || cookieToken,
    usedCookie: !bodyToken && Boolean(cookieToken),
  };
}

module.exports = {
  parseCookieHeader,
  readCookie,
  setRefreshCookie,
  clearRefreshCookie,
  setCsrfCookie,
  clearCsrfCookie,
  clearAuthCookies,
  validateCsrfRequest,
  isWebClient,
  getRefreshTokenFromRequest,
  getAllowedOrigins,
};
