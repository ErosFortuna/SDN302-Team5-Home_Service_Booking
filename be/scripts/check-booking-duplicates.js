/**
 * Script: Check Booking Duplicates (Dry-Run / Read-Only)
 *
 * Checks if the existing database contains duplicate bookings for (provider, scheduledStartAt)
 * under active/effective statuses (non-cancelled: PENDING_CONFIRMATION, CONFIRMED,
 * PROVIDER_ON_THE_WAY, ARRIVED, IN_PROGRESS, AWAITING_APPROVAL).
 *
 * If duplicate records exist, applying the partial unique index on MongoDB will fail with E11000.
 * This script is READ-ONLY by default and DOES NOT modify data or create any index.
 *
 * Usage:
 *   node be/scripts/check-booking-duplicates.js
 */

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const { ACTIVE_BOOKING_STATUSES } = require('../src/modules/bookings/booking.status.js');

async function checkDuplicates() {
  console.log('\n======================================================');
  console.log('[AUDIT / DRY-RUN] Check Booking Duplicates on (provider, scheduledStartAt)');
  console.log('[MODE] READ-ONLY (No data or indexes will be modified)');
  console.log('======================================================\n');

  await connectDB();
  const db = mongoose.connection.db;
  const bookingsColl = db.collection('bookings');

  // 1. Overall stats
  const totalBookings = await bookingsColl.countDocuments();
  const activeBookingsCount = await bookingsColl.countDocuments({
    status: { $in: [...ACTIVE_BOOKING_STATUSES] },
  });

  console.log(`- Tổng số booking trong cơ sở dữ liệu: ${totalBookings}`);
  console.log(`- Số lượng booking đang ở trạng thái còn hiệu lực: ${activeBookingsCount}`);
  console.log(`  (Trạng thái áp dụng index: ${ACTIVE_BOOKING_STATUSES.join(', ')})\n`);

  // 2. Find duplicates for ACTIVE bookings (the exact filter of the partial unique index)
  const activeDuplicates = await bookingsColl
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
          customerIds: { $push: '$customer' },
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

  if (activeDuplicates.length === 0) {
    console.log('[KẾT QUẢ KIỂM TRA INDEX]:');
    console.log('  -> KHÔNG phát hiện bản ghi trùng lặp nào ở trạng thái còn hiệu lực.');
    console.log('  -> An toàn để tạo partial unique index { provider: 1, scheduledStartAt: 1 }');
  } else {
    console.error(`[CẢNH BÁO]: Tìm thấy ${activeDuplicates.length} nhóm bản ghi TRÙNG LỊCH còn hiệu lực:`);
    activeDuplicates.forEach((dup, index) => {
      console.error(`\n  Nhóm #${index + 1}:`);
      console.error(`    - Thợ (provider): ${dup._id.provider}`);
      console.error(`    - Thời gian bắt đầu: ${new Date(dup._id.scheduledStartAt).toISOString()}`);
      console.error(`    - Số lượng booking trùng: ${dup.count}`);
      dup.bookingIds.forEach((id, i) => {
        console.error(`      * Booking ID: ${id} | Trạng thái: ${dup.statuses[i]} | Khách: ${dup.customerIds[i]}`);
      });
    });
    console.error('\n  -> [RỦI RO]: Lệnh tạo partial unique index sẽ BỊ LỖI (E11000) trên DB này');
    console.error('     cho đến khi các booking trùng lặp ở trên được xử lý (hủy/đổi lịch).');
    console.error('  -> HƯỚNG DẪN DỌN DẸP: Cập nhật trạng thái của bản ghi thừa sang trạng thái hợp lệ trong booking.status.js');
    console.error('     (như CANCELLED, COMPLETED, NO_SHOW). Không dùng các trạng thái không tồn tại như DECLINED hay EXPIRED.');
  }

  // 3. Optional audit: Check duplicates among ALL non-cancelled bookings (including COMPLETED)
  const allNonCancelledDuplicates = await bookingsColl
    .aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED', 'NO_SHOW'] },
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
          statuses: { $push: '$status' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  const completedOnlyDuplicates = allNonCancelledDuplicates.filter(
    (dup) => !activeDuplicates.some(
      (a) => String(a._id.provider) === String(dup._id.provider) &&
             new Date(a._id.scheduledStartAt).getTime() === new Date(dup._id.scheduledStartAt).getTime()
    )
  );

  if (completedOnlyDuplicates.length > 0) {
    console.log(`\n[THÔNG TIN LỊCH SỬ THÊM]: Có ${completedOnlyDuplicates.length} nhóm trùng giờ đã HOÀN THÀNH (COMPLETED) trong quá khứ.`);
    console.log('  -> Các bản ghi COMPLETED này nằm ngoài filter của partial unique index nên sẽ KHÔNG cản trở việc tạo index.');
  }

  console.log('\n======================================================');
  console.log('[HOÀN TẤT KIỂM TRA] Kết thúc chế độ dry-run read-only.');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(activeDuplicates.length > 0 ? 1 : 0);
}

checkDuplicates().catch((err) => {
  console.error('[LỖI CHẠY SCRIPT]', err);
  process.exit(1);
});

