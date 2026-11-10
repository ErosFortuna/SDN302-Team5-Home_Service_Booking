/**
 * Migration Script: Replace legacy unique index on bookings.request
 *
 * The legacy `request_1` unique index allowed only one booking per service request
 * for its entire lifetime. That blocks staff from re-dispatching a request after a
 * provider declines (the previous booking is kept as CANCELLED for audit).
 *
 * This migration drops the legacy unique index and creates a partial unique index
 * on `request` that only applies to active bookings, so a request can keep historical
 * cancelled bookings while still having at most one active booking at a time.
 *
 * Safe by default:
 *   node be/scripts/migrate-booking-request-index.js          # Dry-run
 *   node be/scripts/migrate-booking-request-index.js --apply  # Applies the migration
 */

// CLI script does not serve HTTP; ensure safe fallback for CLIENT_URL if unset
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const { ACTIVE_BOOKING_STATUSES } = require('../src/modules/bookings/booking.status.js');

const LEGACY_INDEX_NAME = 'request_1';
const INDEX_SPEC = { request: 1 };
const INDEX_NAME = 'request_1_active';

async function findActiveDuplicateRequests(bookingsColl) {
  return bookingsColl
    .aggregate([
      {
        $match: {
          status: { $in: [...ACTIVE_BOOKING_STATUSES] },
          request: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$request',
          count: { $sum: 1 },
          bookingIds: { $push: '$_id' },
          statuses: { $push: '$status' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

async function runRequestIndexMigration(options = {}) {
  const isApply = options.isApply !== undefined ? options.isApply : process.argv.includes('--apply');
  const exitProcess = options.exitProcess !== false;
  const customDb = options.db;

  console.log('\n======================================================');
  console.log('[MIGRATION] Booking request index (allow re-dispatch after decline)');
  console.log(`[MODE] ${isApply ? '>>> APPLY <<<' : 'DRY RUN'}`);
  console.log('======================================================\n');

  if (!customDb) {
    await connectDB();
  }
  const db = customDb || mongoose.connection.db;
  const bookingsColl = db.collection('bookings');

  console.log('[BƯỚC 1]: Kiểm tra booking trùng request ở trạng thái active...');
  const duplicates = await findActiveDuplicateRequests(bookingsColl);
  if (duplicates.length > 0) {
    console.error(`\n[LỖI]: Tìm thấy ${duplicates.length} request có nhiều hơn một booking active:`);
    duplicates.forEach((dup, i) => {
      console.error(`  #${i + 1} request=${dup._id} count=${dup.count} bookings=${dup.bookingIds.join(', ')}`);
    });
    console.error('\n-> Hãy xử lý các booking trùng (chuyển sang CANCELLED) trước khi chạy --apply.\n');

    if (!customDb) {
      await mongoose.disconnect();
    }
    if (exitProcess) {
      process.exit(1);
    }
    return { success: false, reason: 'DUPLICATES_FOUND', duplicates };
  }
  console.log('  -> Không có request nào có nhiều booking active.\n');

  console.log('[BƯỚC 2]: Kiểm tra index hiện có trên collection bookings...');
  const existingIndexes = await bookingsColl.indexes();
  const legacyIndex = existingIndexes.find(
    (idx) => idx.name === LEGACY_INDEX_NAME && idx.unique === true
  );
  const hasTargetIndex = existingIndexes.some(
    (idx) =>
      idx.name === INDEX_NAME ||
      (idx.key && idx.key.request === 1 && idx.unique === true && idx.partialFilterExpression)
  );

  console.log(`- Legacy unique index '${LEGACY_INDEX_NAME}': ${legacyIndex ? 'CÓ (sẽ bị xóa)' : 'không có'}`);
  console.log(`- Partial unique index '${INDEX_NAME}': ${hasTargetIndex ? 'ĐÃ tồn tại' : 'CHƯA tồn tại'}\n`);

  if (isApply) {
    if (legacyIndex) {
      await bookingsColl.dropIndex(LEGACY_INDEX_NAME);
      console.log(`[APPLY]: Đã xóa index '${LEGACY_INDEX_NAME}'.`);
    }
    if (!hasTargetIndex) {
      const createdName = await bookingsColl.createIndex(INDEX_SPEC, {
        unique: true,
        partialFilterExpression: {
          status: { $in: [...ACTIVE_BOOKING_STATUSES] },
        },
        name: INDEX_NAME,
        background: true,
      });
      console.log(`[APPLY]: Đã tạo index '${createdName}'.`);
    }
  } else {
    console.log('[DRY RUN]: Điều kiện đạt yêu cầu. Chạy lại với --apply để áp dụng.\n');
  }

  console.log('======================================================');
  console.log(`[MIGRATION COMPLETE] ${isApply ? 'APPLY' : 'DRY RUN'}`);
  console.log('======================================================\n');

  if (!customDb) {
    await mongoose.disconnect();
  }
  if (exitProcess) {
    process.exit(0);
  }
  return { success: true, droppedLegacy: isApply && Boolean(legacyIndex), created: isApply && !hasTargetIndex };
}

if (require.main === module) {
  runRequestIndexMigration().catch((err) => {
    console.error('[LỖI MIGRATION]', err);
    process.exit(1);
  });
}

module.exports = {
  LEGACY_INDEX_NAME,
  INDEX_SPEC,
  INDEX_NAME,
  findActiveDuplicateRequests,
  runRequestIndexMigration,
};
