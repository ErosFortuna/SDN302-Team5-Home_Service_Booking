const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { env } = require('../config/env.js');

/**
 * Checks whether the incoming request is directed to the PayOS webhook endpoint.
 * Webhook callbacks from payment gateways must never be blocked by rate limiters.
 *
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isPayOSWebhook(req) {
  const url = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
  const path = (req.path || '').replace(/\/+$/, '');
  return (
    url === '/api/payments/payos/webhook' ||
    url === '/payments/payos/webhook' ||
    url.endsWith('/payments/payos/webhook') ||
    path === '/api/payments/payos/webhook' ||
    path === '/payments/payos/webhook' ||
    path === '/payos/webhook'
  );
}

/**
 * Checks whether rate limiting should be skipped during automated testing.
 * Can be explicitly enabled in tests by passing options.enableInTest = true
 * or setting process.env.ENABLE_RATE_LIMIT_TEST = 'true'.
 *
 * @param {object} [options]
 * @returns {boolean}
 */
function shouldSkipInTest(options = {}) {
  if (options.enableInTest || process.env.ENABLE_RATE_LIMIT_TEST === 'true') {
    return false;
  }
  return process.env.NODE_ENV === 'test' || env.nodeEnv === 'test';
}

/**
 * Creates a global rate limiter instance (default 300 requests / 15 minutes per IP).
 * PayOS webhook is always exempt from rate limiting.
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createGlobalRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.rateLimitGlobalWindowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit:
      options.limit !== undefined
        ? options.limit
        : (req) => Number(process.env.RATE_LIMIT_GLOBAL_MAX || env.rateLimitGlobalMax || 300),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (isPayOSWebhook(req)) return true;
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message: options.message || 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau.',
    },
    ...options.extra,
  });
}

/**
 * Creates an upload rate limiter instance scoped per user (default 10 requests / 1 minute).
 * Falls back to IP if user is unauthenticated.
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createUploadRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.rateLimitUploadWindowMs || 60 * 1000;
  return rateLimit({
    windowMs,
    limit:
      options.limit !== undefined
        ? options.limit
        : (req) => Number(process.env.RATE_LIMIT_UPLOAD_MAX || env.rateLimitUploadMax || 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.user?._id) return String(req.user._id);
      if (req.user?.id) return String(req.user.id);
      if (req.user?.sub) return String(req.user.sub);
      return ipKeyGenerator(req);
    },
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message: options.message || 'Quá nhiều yêu cầu tải lên. Vui lòng thử lại sau 1 phút.',
    },
    ...options.extra,
  });
}

/**
 * Creates an availability rate limiter instance for public endpoints (default 60 requests / 1 minute per IP).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createAvailabilityRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.rateLimitAvailabilityWindowMs || 60 * 1000;
  return rateLimit({
    windowMs,
    limit:
      options.limit !== undefined
        ? options.limit
        : (req) => Number(process.env.RATE_LIMIT_AVAILABILITY_MAX || env.rateLimitAvailabilityMax || 60),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message: options.message || 'Quá nhiều yêu cầu kiểm tra lịch trống. Vui lòng thử lại sau 1 phút.',
    },
    ...options.extra,
  });
}

const globalRateLimiter = createGlobalRateLimiter();
const uploadRateLimiter = createUploadRateLimiter();
const availabilityRateLimiter = createAvailabilityRateLimiter();

module.exports = {
  isPayOSWebhook,
  shouldSkipInTest,
  createGlobalRateLimiter,
  createUploadRateLimiter,
  createAvailabilityRateLimiter,
  globalRateLimiter,
  uploadRateLimiter,
  availabilityRateLimiter,
};

