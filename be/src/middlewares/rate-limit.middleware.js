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

/**
 * Creates a login rate limiter instance scoped per account (email + IP) (default 5 failed attempts / 15 minutes).
 * Counts only failed attempts (skipSuccessfulRequests: true).
 * Falls back to IP if email is missing or invalid.
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createLoginAccountRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.rateLimitLoginAccountWindowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit:
      options.limit !== undefined
        ? options.limit
        : (req) => Number(process.env.RATE_LIMIT_LOGIN_ACCOUNT_MAX || env.rateLimitLoginAccountMax || 5),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const ip = ipKeyGenerator(req);
      if (email) {
        return `login:fail:${email}:${ip}`;
      }
      return `login:fail:ip:${ip}`;
    },
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        'Tài khoản đang bị tạm khóa đăng nhập do thử sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
    },
    ...options.extra,
  });
}

function createChangePasswordRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit: options.limit !== undefined ? options.limit : 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `change-password:${String(req.user?._id || req.user?.id || 'unknown')}:${ipKeyGenerator(req.ip)}`,
    skip: (req) => (options.skip && options.skip(req)) || shouldSkipInTest(options),
    message: {
      success: false,
      message: options.message || 'Quá nhiều lần thử đổi mật khẩu. Vui lòng thử lại sau 15 phút.',
    },
    ...options.extra,
  });
}

/**
 * Creates a registration rate limiter instance scoped per IP (default 5 registrations / 1 hour).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createRegisterRateLimiter(options = {}) {
  const windowMs = options.windowMs || env.rateLimitRegisterWindowMs || 60 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit:
      options.limit !== undefined
        ? options.limit
        : (req) => Number(process.env.RATE_LIMIT_REGISTER_MAX || env.rateLimitRegisterMax || 5),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `register:ip:${ipKeyGenerator(req)}`,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        'Quá nhiều yêu cầu đăng ký từ địa chỉ IP này. Vui lòng thử lại sau 1 giờ.',
    },
    ...options.extra,
  });
}

/**
 * Creates a forgot password rate limiter instance scoped per IP (default 10 requests / 15 minutes).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createForgotPasswordIpRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit: options.limit !== undefined ? options.limit : 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `forgot:ip:${ipKeyGenerator(req)}`,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        "Quá nhiều yêu cầu quên mật khẩu từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.",
    },
    ...options.extra,
  });
}

/**
 * Creates a forgot password rate limiter instance scoped per email (default 5 requests / 15 minutes).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createForgotPasswordEmailRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit: options.limit !== undefined ? options.limit : 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      return email ? `forgot:email:${email}` : `forgot:ip:${ipKeyGenerator(req)}`;
    },
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        "Quá nhiều yêu cầu gửi mã cho email này. Vui lòng thử lại sau 15 phút.",
    },
    ...options.extra,
  });
}

/**
 * Creates a reset password rate limiter instance scoped per IP (default 10 requests / 15 minutes).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createResetPasswordIpRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit: options.limit !== undefined ? options.limit : 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `reset:ip:${ipKeyGenerator(req)}`,
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        "Quá nhiều yêu cầu đặt lại mật khẩu từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.",
    },
    ...options.extra,
  });
}

/**
 * Creates a reset password rate limiter instance scoped per email (default 5 requests / 15 minutes).
 *
 * @param {object} [options]
 * @returns {import('express').RequestHandler}
 */
function createResetPasswordEmailRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  return rateLimit({
    windowMs,
    limit: options.limit !== undefined ? options.limit : 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      return email ? `reset:email:${email}` : `reset:ip:${ipKeyGenerator(req)}`;
    },
    skip: (req) => {
      if (options.skip && options.skip(req)) return true;
      if (shouldSkipInTest(options)) return true;
      return false;
    },
    message: {
      success: false,
      message:
        options.message ||
        "Quá nhiều yêu cầu đặt lại mật khẩu cho tài khoản này. Vui lòng thử lại sau 15 phút.",
    },
    ...options.extra,
  });
}

const globalRateLimiter = createGlobalRateLimiter();
const uploadRateLimiter = createUploadRateLimiter();
const availabilityRateLimiter = createAvailabilityRateLimiter();
const loginAccountRateLimiter = createLoginAccountRateLimiter();
const changePasswordRateLimiter = createChangePasswordRateLimiter();
const registerRateLimiter = createRegisterRateLimiter();
const forgotPasswordIpRateLimiter = createForgotPasswordIpRateLimiter();
const forgotPasswordEmailRateLimiter = createForgotPasswordEmailRateLimiter();
const resetPasswordIpRateLimiter = createResetPasswordIpRateLimiter();
const resetPasswordEmailRateLimiter = createResetPasswordEmailRateLimiter();

module.exports = {
  isPayOSWebhook,
  shouldSkipInTest,
  createGlobalRateLimiter,
  createUploadRateLimiter,
  createAvailabilityRateLimiter,
  createLoginAccountRateLimiter,
  createChangePasswordRateLimiter,
  createRegisterRateLimiter,
  createForgotPasswordIpRateLimiter,
  createForgotPasswordEmailRateLimiter,
  createResetPasswordIpRateLimiter,
  createResetPasswordEmailRateLimiter,
  globalRateLimiter,
  uploadRateLimiter,
  availabilityRateLimiter,
  loginAccountRateLimiter,
  changePasswordRateLimiter,
  registerRateLimiter,
  forgotPasswordIpRateLimiter,
  forgotPasswordEmailRateLimiter,
  resetPasswordIpRateLimiter,
  resetPasswordEmailRateLimiter,
};

