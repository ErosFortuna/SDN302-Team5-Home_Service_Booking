const mongoose = require('mongoose');
const { env } = require('../config/env.js');
const { AppError } = require('./app-error.js');

/**
 * Starts a MongoDB session and transaction for multi-step operations.
 *
 * Concurrency & Transaction Policy (V-12):
 * - If starting session or transaction succeeds: returns { session, inTransaction: true }.
 * - If starting session or transaction fails:
 *   - In production (env.nodeEnv === 'production'):
 *     ALWAYS throws AppError(503, "Dịch vụ tạm thời không khả dụng do hệ thống cơ sở dữ liệu không thể khởi tạo transaction");
 *   - In non-production (dev/test):
 *     - If env.allowNoTransaction (ALLOW_NO_TRANSACTION === true):
 *       logs console.warn and returns { session: null, inTransaction: false }.
 *     - Otherwise:
 *       throws AppError(503, "Giao dịch cơ sở dữ liệu không khả dụng. Trên môi trường dev/standalone, hãy cấu hình replica set hoặc đặt biến môi trường ALLOW_NO_TRANSACTION=true để chạy chế độ đơn lẻ.");
 */
async function startManagedTransaction() {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    return { session, inTransaction: true };
  } catch (err) {
    if (session) {
      try {
        await session.endSession();
      } catch {}
      session = null;
    }
    const isProduction = env.nodeEnv === 'production';
    if (isProduction) {
      throw new AppError(
        503,
        'Dịch vụ tạm thời không khả dụng do hệ thống cơ sở dữ liệu không thể khởi tạo transaction',
        { originalError: err.message }
      );
    }
    if (env.allowNoTransaction) {
      console.warn(
        '[Warning] Running multi-step operation without MongoDB transaction because ALLOW_NO_TRANSACTION=true in development/test environment. Do not use this mode in production!'
      );
      return { session: null, inTransaction: false };
    }
    throw new AppError(
      503,
      'Giao dịch cơ sở dữ liệu không khả dụng. Trên môi trường dev/standalone, hãy cấu hình replica set hoặc đặt biến môi trường ALLOW_NO_TRANSACTION=true để chạy chế độ đơn lẻ.',
      { originalError: err.message }
    );
  }
}

const MAX_TX_RETRIES = 3;

/**
 * Checks whether an error is a transient transaction error or write conflict,
 * which qualifies for retry in MongoDB multi-document transactions.
 */
function isTransientOrWriteConflict(err) {
  if (!err) return false;
  if (typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError')) {
    return true;
  }
  if (err.code === 112 || err.codeName === 'WriteConflict') {
    return true;
  }
  if (/WriteConflict|TransientTransactionError/i.test(err.message)) {
    return true;
  }
  return false;
}

module.exports = {
  startManagedTransaction,
  isTransientOrWriteConflict,
  MAX_TX_RETRIES,
};

