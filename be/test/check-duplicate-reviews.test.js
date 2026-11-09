const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  DUPLICATE_REVIEWS_PIPELINE,
  groupReviewsByBooking,
  findDuplicateReviews,
  runCheckDuplicateReviews,
} = require('../scripts/check-duplicate-reviews.js');

test('Check Duplicate Reviews: groupReviewsByBooking identifies bookings with count > 1 using stub data', () => {
  const booking1Id = new mongoose.Types.ObjectId().toString();
  const booking2Id = new mongoose.Types.ObjectId().toString();
  const booking3Id = new mongoose.Types.ObjectId().toString();

  const stubReviews = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking1Id,
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Nguyen Van A',
      comment: 'Secret comment 1',
      rating: 5,
      isVisible: true,
      createdAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking2Id, // Single review for booking2
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Tran Van B',
      comment: 'Secret comment 2',
      rating: 4,
      isVisible: true,
      createdAt: new Date('2026-11-02T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking1Id, // Duplicate for booking1
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Nguyen Van A duplicate',
      comment: 'Secret comment duplicate',
      rating: 3,
      isVisible: false,
      createdAt: new Date('2026-11-03T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking3Id,
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Le Thi C',
      comment: 'Secret comment 3',
      rating: 5,
      isVisible: true,
      createdAt: new Date('2026-11-04T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking3Id,
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Le Thi C duplicate 1',
      comment: 'Secret comment duplicate 1',
      rating: 4,
      isVisible: true,
      createdAt: new Date('2026-11-05T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      booking: booking3Id,
      customer: new mongoose.Types.ObjectId().toString(),
      authorName: 'Le Thi C duplicate 2',
      comment: 'Secret comment duplicate 2',
      rating: 2,
      isVisible: false,
      createdAt: new Date('2026-11-06T10:00:00Z'),
    },
  ];

  const duplicates = groupReviewsByBooking(stubReviews);

  // Booking3 has 3 reviews, Booking1 has 2 reviews. Booking2 has 1 (omitted).
  assert.equal(duplicates.length, 2, 'Should identify exactly 2 bookings with duplicate reviews');
  assert.equal(duplicates[0].bookingId, booking3Id);
  assert.equal(duplicates[0].count, 3);
  assert.equal(duplicates[1].bookingId, booking1Id);
  assert.equal(duplicates[1].count, 2);

  // Security check: Verify that comment, customer, and personal author data are NOT leaked
  for (const group of duplicates) {
    assert.ok(group.bookingId, 'bookingId must exist');
    assert.ok(typeof group.count === 'number', 'count must be numeric');
    assert.equal(group.comment, undefined, 'group must not contain comment');
    assert.equal(group.customer, undefined, 'group must not contain customer PII');

    for (const rev of group.reviews) {
      assert.ok(rev.reviewId, 'reviewId must be present');
      assert.ok(rev.createdAt instanceof Date, 'createdAt must be present');
      assert.ok(typeof rev.rating === 'number', 'rating must be present');
      assert.ok(typeof rev.isVisible === 'boolean', 'isVisible must be present');

      // PII / Comment assertions
      assert.equal(rev.comment, undefined, 'Review comment must not be included');
      assert.equal(rev.customer, undefined, 'Review customer must not be included');
      assert.equal(rev.authorName, undefined, 'Author name must not be included');
    }
  }
});

test('Check Duplicate Reviews: DUPLICATE_REVIEWS_PIPELINE structure and findDuplicateReviews aggregation', async () => {
  // 1. Verify pipeline stages
  assert.equal(DUPLICATE_REVIEWS_PIPELINE.length, 5);
  assert.deepEqual(DUPLICATE_REVIEWS_PIPELINE[0], {
    $match: { booking: { $exists: true, $ne: null } },
  });
  assert.equal(DUPLICATE_REVIEWS_PIPELINE[1].$group._id, '$booking');
  assert.deepEqual(DUPLICATE_REVIEWS_PIPELINE[2], {
    $match: { count: { $gt: 1 } },
  });
  assert.deepEqual(DUPLICATE_REVIEWS_PIPELINE[3], {
    $project: {
      _id: 0,
      bookingId: '$_id',
      count: 1,
      reviews: 1,
    },
  });

  // 2. Test findDuplicateReviews with a stubbed collection
  const bookingId = new mongoose.Types.ObjectId().toString();
  const mockRows = [
    {
      bookingId,
      count: 2,
      reviews: [
        {
          reviewId: new mongoose.Types.ObjectId().toString(),
          createdAt: new Date('2026-11-01T12:00:00Z'),
          rating: 5,
          isVisible: true,
        },
        {
          reviewId: new mongoose.Types.ObjectId().toString(),
          createdAt: new Date('2026-11-01T13:00:00Z'),
          rating: 4,
          isVisible: true,
        },
      ],
    },
  ];

  let passedPipeline = null;
  const mockColl = {
    aggregate: (pipeline) => {
      passedPipeline = pipeline;
      return {
        toArray: async () => mockRows,
      };
    },
  };

  const result = await findDuplicateReviews(mockColl);
  assert.deepEqual(passedPipeline, DUPLICATE_REVIEWS_PIPELINE);
  assert.equal(result.length, 1);
  assert.equal(result[0].bookingId, bookingId);
  assert.equal(result[0].count, 2);
});

test('Check Duplicate Reviews: runCheckDuplicateReviews returns exitCode 0 when clean and exitCode 1 when duplicates exist', async () => {
  const logged = [];
  const errors = [];
  const mockLogger = {
    log: (...args) => logged.push(args.join(' ')),
    error: (...args) => errors.push(args.join(' ')),
  };

  // Case 1: Clean database
  const cleanDb = {
    collection: (name) => {
      assert.equal(name, 'reviews');
      return {
        aggregate: () => ({
          toArray: async () => [],
        }),
      };
    },
  };

  const cleanRes = await runCheckDuplicateReviews({
    exitProcess: false,
    db: cleanDb,
    logger: mockLogger,
  });

  assert.equal(cleanRes.exitCode, 0, 'Clean database must return exitCode 0');
  assert.deepEqual(cleanRes.duplicates, []);
  assert.ok(logged.some((msg) => msg.includes('Số booking bị trùng review: 0')));

  // Case 2: Database with duplicate reviews
  const dupBookingId = new mongoose.Types.ObjectId().toString();
  const dupRev1Id = new mongoose.Types.ObjectId().toString();
  const dupRev2Id = new mongoose.Types.ObjectId().toString();

  const dirtyDb = {
    collection: (name) => {
      assert.equal(name, 'reviews');
      return {
        aggregate: () => ({
          toArray: async () => [
            {
              bookingId: dupBookingId,
              count: 2,
              reviews: [
                {
                  reviewId: dupRev1Id,
                  createdAt: new Date('2026-11-01T10:00:00Z'),
                  rating: 5,
                  isVisible: true,
                },
                {
                  reviewId: dupRev2Id,
                  createdAt: new Date('2026-11-01T11:00:00Z'),
                  rating: 4,
                  isVisible: false,
                },
              ],
            },
          ],
        }),
      };
    },
  };

  const dirtyRes = await runCheckDuplicateReviews({
    exitProcess: false,
    db: dirtyDb,
    logger: mockLogger,
  });

  assert.equal(dirtyRes.exitCode, 1, 'Database with duplicates must return exitCode 1');
  assert.equal(dirtyRes.duplicates.length, 1);
  assert.equal(dirtyRes.duplicates[0].bookingId, dupBookingId);

  // Check error log output contains bookingId, reviewId, rating, isVisible, but NO comments
  assert.ok(errors.some((msg) => msg.includes(dupBookingId)));
  assert.ok(errors.some((msg) => msg.includes(dupRev1Id)));
  assert.ok(errors.some((msg) => msg.includes('Đánh giá: 5')));
  assert.ok(errors.some((msg) => msg.includes('Hiển thị: true')));
});

