const { env } = require('../../config/env.js');

/**
 * In-memory usage map for user upload volume:
 * userId -> { bytesUsed: number, resetAt: number }
 */
const userUploadUsage = new Map();

/**
 * Default cleanup interval: 1 hour.
 * unref() is called to avoid keeping the Node.js event loop alive.
 */
const CLEANUP_INTERVAL_MS = Number(process.env.UPLOAD_QUOTA_CLEANUP_INTERVAL_MS || 60 * 60 * 1000);
let cleanupInterval = null;

function startCleanupTimer() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupExpiredUsage, CLEANUP_INTERVAL_MS);
    if (typeof cleanupInterval.unref === 'function') {
      cleanupInterval.unref();
    }
  }
}
startCleanupTimer();

/**
 * Checks whether upload quota limiting should be skipped during automated testing.
 * Can be explicitly enabled in tests by setting process.env.ENABLE_UPLOAD_QUOTA_TEST = 'true'
 * or passing options.enableInTest = true.
 */
function shouldSkipQuotaInTest(options = {}) {
  if (options.enableInTest || process.env.ENABLE_UPLOAD_QUOTA_TEST === 'true') {
    return false;
  }
  return process.env.NODE_ENV === 'test' || env.nodeEnv === 'test';
}

/**
 * Periodically prunes expired usage entries to avoid memory leaks.
 */
function cleanupExpiredUsage() {
  const now = Date.now();
  for (const [key, record] of userUploadUsage.entries()) {
    if (now >= record.resetAt) {
      userUploadUsage.delete(key);
    }
  }
}

/**
 * Resets the in-memory upload quota tracking map.
 * Primarily used by test suites.
 */
function resetUploadQuota() {
  userUploadUsage.clear();
}

/**
 * Returns current number of entries in the in-memory usage map.
 */
function getUsageMapSize() {
  return userUploadUsage.size;
}

/**
 * Gets current upload quota usage for a given user identifier.
 * @param {string} userId
 * @returns {{ bytesUsed: number, resetAt: number, limitBytes: number } | null}
 */
function getUserUploadQuota(userId) {
  const usage = userUploadUsage.get(String(userId));
  if (!usage) return null;
  const limitMb = Number(process.env.UPLOAD_USER_DAILY_LIMIT_MB || env.uploadUserDailyLimitMb || 50);
  return {
    bytesUsed: usage.bytesUsed,
    resetAt: usage.resetAt,
    limitBytes: limitMb * 1024 * 1024,
  };
}

/**
 * Middleware that enforces upload volume quota per user within a rolling time window.
 * Default: 50MB per 24 hours (configurable via UPLOAD_USER_DAILY_LIMIT_MB and UPLOAD_USER_DAILY_WINDOW_MS).
 *
 * Must be mounted after multer parses req.files and after JWT protect sets req.user.
 */
function uploadQuotaMiddleware(req, res, next) {
  if (shouldSkipQuotaInTest()) {
    return next();
  }

  // Calculate incoming upload size from files
  const files = req.files || (req.file ? [req.file] : []);
  if (!files || files.length === 0) {
    return next();
  }

  const incomingBytes = files.reduce((sum, file) => {
    const size = typeof file.size === 'number' && file.size > 0
      ? file.size
      : (file.buffer ? file.buffer.length : 0);
    return sum + size;
  }, 0);

  if (incomingBytes <= 0) {
    return next();
  }

  const userId = req.user?._id
    ? String(req.user._id)
    : (req.user?.id
        ? String(req.user.id)
        : (req.user?.sub
            ? String(req.user.sub)
            : (req.ip || 'unknown')));

  const limitMb = Number(process.env.UPLOAD_USER_DAILY_LIMIT_MB || env.uploadUserDailyLimitMb || 50);
  const windowMs = Number(process.env.UPLOAD_USER_DAILY_WINDOW_MS || env.uploadUserDailyWindowMs || 24 * 60 * 60 * 1000);
  const maxBytes = limitMb * 1024 * 1024;
  const now = Date.now();

  // Periodic cleanup if map grows large
  if (userUploadUsage.size > 1000) {
    cleanupExpiredUsage();
  }

  let usage = userUploadUsage.get(userId);
  if (!usage || now >= usage.resetAt) {
    usage = { bytesUsed: 0, resetAt: now + windowMs };
    userUploadUsage.set(userId, usage);
  }

  if (usage.bytesUsed + incomingBytes > maxBytes) {
    const retryAfterSeconds = Math.max(1, Math.ceil((usage.resetAt - now) / 1000));
    const windowHours = Math.round(windowMs / (60 * 60 * 1000));
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Đã vượt quá giới hạn dung lượng tải lên (${limitMb}MB trong ${windowHours} giờ). Vui lòng thử lại sau.`,
      details: {
        limitBytes: maxBytes,
        usedBytes: usage.bytesUsed,
        incomingBytes,
        retryAfterSeconds,
      },
    });
  }

  // Optimistically reserve quota
  usage.bytesUsed += incomingBytes;

  // Rollback mechanism:
  // - Listens to both 'finish' and 'close'
  // - Guard flag prevents double rollback
  // - Ensures quota never drops below 0
  // - Only rolls back bytes that failed to upload (refunds incomingBytes - req.successfulUploadBytes)
  let rolledBack = false;
  const handleRollback = () => {
    if (rolledBack) return;
    rolledBack = true;

    const isSuccess = res.statusCode >= 200 && res.statusCode < 300 && res.writableEnded;
    if (isSuccess) {
      return;
    }

    const current = userUploadUsage.get(userId);
    if (!current) return;

    const successfulBytes = typeof req.successfulUploadBytes === 'number' && req.successfulUploadBytes >= 0
      ? req.successfulUploadBytes
      : 0;
    const refundBytes = Math.max(0, incomingBytes - successfulBytes);

    current.bytesUsed = Math.max(0, current.bytesUsed - refundBytes);
  };

  res.on('finish', handleRollback);
  res.on('close', handleRollback);

  next();
}

module.exports = {
  uploadQuotaMiddleware,
  resetUploadQuota,
  getUserUploadQuota,
  getUsageMapSize,
  cleanupExpiredUsage,
  shouldSkipQuotaInTest,
  cleanupInterval,
  userUploadUsage,
};
