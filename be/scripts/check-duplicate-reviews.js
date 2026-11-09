/**
 * scripts/check-duplicate-reviews.js
 *
 * READ-ONLY audit script:
 * Identifies bookings that have more than 1 review (grouped by `booking`, count > 1).
 *
 * Prints:
 *   - Total duplicate bookings count.
 *   - For each duplicate booking: bookingId, count, and review details (reviewId, createdAt, rating, isVisible).
 *   - Strictly DOES NOT print review comments or any personal / customer information (PII).
 *
 * Exits with code 1 if duplicate reviews exist, 0 if clean.
 *
 * Usage:
 *   node scripts/check-duplicate-reviews.js
 *   npm run reviews:check-duplicates
 */

process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db.js');

const DUPLICATE_REVIEWS_PIPELINE = [
  {
    $match: {
      booking: { $exists: true, $ne: null },
    },
  },
  {
    $group: {
      _id: '$booking',
      count: { $sum: 1 },
      reviews: {
        $push: {
          reviewId: '$_id',
          createdAt: '$createdAt',
          rating: '$rating',
          isVisible: '$isVisible',
        },
      },
    },
  },
  {
    $match: {
      count: { $gt: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      bookingId: '$_id',
      count: 1,
      reviews: 1,
    },
  },
  {
    $sort: { count: -1 },
  },
];

/**
 * Pure helper function to group an array of review documents by bookingId in-memory.
 * Only extracts reviewId, createdAt, rating, and isVisible (no comments, no PII).
 *
 * @param {Array<object>} reviews
 * @returns {Array<object>} Duplicates sorted by count descending
 */
function groupReviewsByBooking(reviews = []) {
  const map = new Map();

  for (const r of reviews) {
    if (!r || r.booking == null) continue;
    const bookingKey = String(r.booking);
    if (!map.has(bookingKey)) {
      map.set(bookingKey, {
        bookingId: r.booking,
        count: 0,
        reviews: [],
      });
    }

    const group = map.get(bookingKey);
    group.count += 1;
    group.reviews.push({
      reviewId: r._id,
      createdAt: r.createdAt,
      rating: r.rating,
      isVisible: r.isVisible,
    });
  }

  return Array.from(map.values())
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count);
}

/**
 * Executes duplicate review aggregation against a MongoDB collection.
 *
 * @param {import('mongodb').Collection} reviewsColl
 * @returns {Promise<Array<object>>}
 */
async function findDuplicateReviews(reviewsColl) {
  const cursorOrResult = reviewsColl.aggregate(DUPLICATE_REVIEWS_PIPELINE);
  if (cursorOrResult && typeof cursorOrResult.toArray === 'function') {
    return await cursorOrResult.toArray();
  }
  if (cursorOrResult && typeof cursorOrResult.exec === 'function') {
    return await cursorOrResult.exec();
  }
  return await cursorOrResult;
}

/**
 * Main execution logic.
 *
 * @param {object} [options]
 * @param {boolean} [options.exitProcess=true]
 * @param {object} [options.db]
 * @param {object} [options.logger=console]
 * @returns {Promise<{ duplicates: Array<object>, exitCode: number }>}
 */
async function runCheckDuplicateReviews(options = {}) {
  const exitProcess = options.exitProcess !== false;
  const customDb = options.db;
  const logger = options.logger || console;

  let shouldDisconnect = false;
  if (!customDb) {
    await connectDB();
    shouldDisconnect = true;
  }

  try {
    const db = customDb || mongoose.connection.db;
    const reviewsColl = db.collection('reviews');
    const duplicates = await findDuplicateReviews(reviewsColl);

    logger.log('\n======================================================');
    logger.log('[AUDIT / READ-ONLY] Kiểm tra trùng lặp Review theo Booking');
    logger.log('======================================================\n');

    if (!duplicates || duplicates.length === 0) {
      logger.log('- Số booking bị trùng review: 0');
      logger.log('-> Dữ liệu sạch: Không phát hiện booking nào có nhiều hơn 1 review.');
      logger.log('-> Cơ sở dữ liệu an toàn để đồng bộ unique index { booking: 1 }.\n');
      if (exitProcess) {
        process.exit(0);
      }
      return { duplicates: [], exitCode: 0 };
    }

    logger.error(`[CẢNH BÁO] Phát hiện ${duplicates.length} booking bị trùng lặp review (count > 1):\n`);
    duplicates.forEach((item, index) => {
      logger.error(`Booking #${index + 1}: ${item.bookingId}`);
      logger.error(`  - Số review: ${item.count}`);
      if (Array.isArray(item.reviews)) {
        item.reviews.forEach((rev) => {
          const createdAtIso = rev.createdAt ? new Date(rev.createdAt).toISOString() : 'N/A';
          logger.error(`    * Review ID: ${rev.reviewId} | Ngày tạo: ${createdAtIso} | Đánh giá: ${rev.rating} | Hiển thị: ${rev.isVisible}`);
        });
      }
      logger.error('');
    });

    logger.error('-> Cần xử lý các review trùng lặp trước khi chạy tạo unique index (npm run indexes:sync -- --apply).\n');

    if (exitProcess) {
      process.exit(1);
    }
    return { duplicates, exitCode: 1 };
  } finally {
    if (shouldDisconnect) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  runCheckDuplicateReviews().catch((err) => {
    console.error('[LỖI] Kiểm tra trùng lặp review thất bại:', err);
    process.exit(1);
  });
}

module.exports = {
  DUPLICATE_REVIEWS_PIPELINE,
  groupReviewsByBooking,
  findDuplicateReviews,
  runCheckDuplicateReviews,
};

