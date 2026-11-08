/**
 * Migration Script: Create Booking Partial Unique Index (V-12)
 *
 * Creates the partial unique index on (provider, scheduledStartAt) for active booking statuses
 * (PENDING_CONFIRMATION, CONFIRMED, PROVIDER_ON_THE_WAY, ARRIVED, IN_PROGRESS, AWAITING_APPROVAL).
 *
 * Safe by default:
 *   node be/scripts/migrate-create-booking-indexes.js          # Dry-run (checks for duplicates, no changes)
 *   node be/scripts/migrate-create-booking-indexes.js --apply  # Applies index creation on the database
 *
 * Khi chạy với --apply, script tự động quét kiểm tra trùng (provider, scheduledStartAt) ở trạng thái active.
 * Nếu còn trùng, in danh sách chi tiết các nhóm trùng và thoát với mã lỗi (exit 1), tuyệt đối không tạo index.
 */

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } = require('../src/modules/bookings/booking.status.js');

const INDEX_SPEC = { provider: 1, scheduledStartAt: 1 };
const INDEX_NAME = 'provider_1_scheduledStartAt_unique_active';

/**
 * Quét các bản ghi booking trùng lặp theo (provider, scheduledStartAt) trong các trạng thái active.
 * @param {import('mongodb').Collection} bookingsColl
 * @returns {Promise<Array<object>>}
 */
async function findActiveDuplicateBookings(bookingsColl) {
  return bookingsColl
    .aggregate([
      {
        $match: {
          status: { $in: [...ACTIVE_BOOKING_STATUSES] },
          provider: { $exists: true, $ne: null },
          scheduledStartAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            provider: '$provider',
            scheduledStartAt: '$scheduledStartAt',
          },
          count: { $sum: 1 },
          bookingIds: { $push: '$_id' },
          statuses: { $push: '$status' },
          customers: { $push: '$customer' },
          createdAts: { $push: '$createdAt' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])
    .toArray();
}

/**
 * Thực thi migration tạo index hoặc dry-run.
 * Có thể truyền tùy chọn để hỗ trợ kiểm thử tự động (unit test / integration test).
 */
async function runIndexMigration(options = {}) {
  const isApply = options.isApply !== undefined ? options.isApply : process.argv.includes('--apply');
  const exitProcess = options.exitProcess !== false;
  const customDb = options.db;

  console.log('\n======================================================');
  console.log('[MIGRATION] Create Booking Partial Unique Index (V-12)');
  console.log(`[MODE] ${isApply ? '>>> APPLY (Creating Index on Database) <<<' : 'DRY RUN (Preview & Duplicate Check Only)'}`);
  console.log('======================================================\n');

  if (!customDb) {
    await connectDB();
  }
  const db = customDb || mongoose.connection.db;
  const bookingsColl = db.collection('bookings');

  // 1. Quét kiểm tra trùng lặp trên (provider, scheduledStartAt) ở trạng thái active
  console.log('[BƯỚC 1]: Quét bản ghi trùng lịch trên (provider, scheduledStartAt) ở trạng thái active...');
  const duplicates = await findActiveDuplicateBookings(bookingsColl);

  if (duplicates.length > 0) {
    console.error(`\n[LỖI NGHIÊM TRỌNG]: Tìm thấy ${duplicates.length} nhóm bản ghi trùng lịch ở trạng thái active:`);
    duplicates.forEach((dup, i) => {
      console.error(`\n  Nhóm #${i + 1}:`);
      console.error(`    - Thợ (provider): ${dup._id.provider}`);
      console.error(`    - Thời gian bắt đầu (scheduledStartAt): ${new Date(dup._id.scheduledStartAt).toISOString()}`);
      console.error(`    - Số lượng trùng lặp: ${dup.count}`);
      dup.bookingIds.forEach((id, idx) => {
        const st = dup.statuses ? dup.statuses[idx] : 'N/A';
        const cust = dup.customers ? dup.customers[idx] : 'N/A';
        const created = dup.createdAts ? new Date(dup.createdAts[idx]).toISOString() : 'N/A';
        console.error(`      * Booking ID: ${id} | Trạng thái: ${st} | Khách: ${cust} | Tạo lúc: ${created}`);
      });
    });

    console.error('\n-> [DỪNG THI HÀNH]: Khi chạy với --apply, script tự động kiểm tra và TỪ CHỐI tạo index nếu còn bản ghi trùng lặp.');
    console.error('-> Vui lòng dọn dẹp các bản ghi trùng lặp (ví dụ chuyển trạng thái sang CANCELLED) trước khi chạy migration.');
    console.error('-> Lưu ý: Chỉ sử dụng các trạng thái hợp lệ trong booking.status.js (CANCELLED, COMPLETED, NO_SHOW). Không dùng các trạng thái không tồn tại như DECLINED hay EXPIRED.\n');

    if (!customDb) {
      await mongoose.disconnect();
    }
    if (exitProcess) {
      process.exit(1);
    }
    return { success: false, reason: 'DUPLICATES_FOUND', duplicates };
  }

  console.log('  -> Không có bản ghi trùng lặp nào ở trạng thái còn hiệu lực. Database sạch.\n');

  // 2. Kiểm tra index hiện có trên collection 'bookings'
  console.log('[BƯỚC 2]: Kiểm tra các index hiện có trên collection bookings...');
  const existingIndexes = await bookingsColl.indexes();
  const hasTargetIndex = existingIndexes.some(
    (idx) =>
      idx.name === INDEX_NAME ||
      (idx.key && idx.key.provider === 1 && idx.key.scheduledStartAt === 1 && idx.unique === true)
  );

  console.log(`- Đã tìm thấy ${existingIndexes.length} index hiện có trên collection 'bookings'.`);
  if (hasTargetIndex) {
    console.log(`  -> Index '${INDEX_NAME}' (hoặc index tương đương) ĐÃ TỒN TẠI trên collection 'bookings'.\n`);
  } else {
    console.log(`  -> Index '${INDEX_NAME}' CHƯA tồn tại.\n`);
  }

  // 3. Thực hiện tạo index nếu ở chế độ --apply
  if (isApply) {
    if (hasTargetIndex) {
      console.log(`[APPLY]: Index '${INDEX_NAME}' đã tồn tại sẵn, không cần tạo lại.`);
    } else {
      console.log(`[APPLY]: Đang tạo partial unique index '${INDEX_NAME}'...`);
      const createdName = await bookingsColl.createIndex(INDEX_SPEC, {
        unique: true,
        partialFilterExpression: {
          status: { $in: [...ACTIVE_BOOKING_STATUSES] },
        },
        name: INDEX_NAME,
        background: true,
      });
      console.log(`  -> THÀNH CÔNG: Đã tạo index '${createdName}' trên collection 'bookings'.`);
    }
  } else {
    console.log('[DRY RUN]: Điều kiện đạt yêu cầu.');
    console.log('  -> Để tạo index trên cơ sở dữ liệu thật, hãy chạy:');
    console.log('     node be/scripts/migrate-create-booking-indexes.js --apply\n');
  }

  console.log('======================================================');
  console.log(`[MIGRATION COMPLETE] Hoàn thành ở chế độ ${isApply ? 'APPLY' : 'DRY RUN'}.`);
  console.log('======================================================\n');

  if (!customDb) {
    await mongoose.disconnect();
  }
  if (exitProcess) {
    process.exit(0);
  }
  return { success: true, created: isApply && !hasTargetIndex };
}

if (require.main === module) {
  runIndexMigration().catch((err) => {
    console.error('[LỖI MIGRATION]', err);
    process.exit(1);
  });
}

module.exports = {
  INDEX_SPEC,
  INDEX_NAME,
  findActiveDuplicateBookings,
  runIndexMigration,
};


