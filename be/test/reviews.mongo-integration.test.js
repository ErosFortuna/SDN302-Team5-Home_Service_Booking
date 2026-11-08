const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { env } = require('../src/config/env.js');
const Review = require('../src/modules/reviews/review.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const User = require('../src/modules/users/user.model.js');
const reviewsRouter = require('../src/modules/reviews/review.routes.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('V-27 Real MongoDB Replica Set: Concurrent & Multi-Booking Review Integration Tests', async (t) => {
  let repl = null;

  if (t && typeof t.after === 'function') {
    t.after(async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
      } catch {}
      try {
        if (repl) await repl.stop();
      } catch {}
    });
  }

  try {
    repl = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    const uri = repl.getUri();
    await mongoose.connect(uri);
  } catch (err) {
    if (err.message && /EACCES|permission|ENOTFOUND|Download failed/i.test(err.message)) {
      console.warn('[SKIP] Skipping MongoMemoryReplSet test: network or loopback socket is restricted in current sandbox environment.');
      return;
    }
    throw err;
  }

  try {
    // Ensure all model indexes (especially unique index on reviews.booking) are created
    await User.syncIndexes();
    await ProviderProfile.syncIndexes();
    await Booking.syncIndexes();
    await Review.syncIndexes();

    // 1. Seed Provider and ProviderProfile
    const providerUser = await User.create({
      fullName: 'Thợ Kiểm Thử RealMongo',
      email: `provider${Date.now()}@test.local`,
      passwordHash: 'dummy-hashed-pwd-123',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });

    await ProviderProfile.create({
      user: providerUser._id,
      businessName: 'Dịch Vụ Test RealMongo',
      city: 'Đà Nẵng',
      serviceAreas: ['Hải Châu'],
      verificationStatus: 'VERIFIED',
      userStatus: 'ACTIVE',
      isDeleted: false,
      averageRating: 0,
      reviewCount: 0,
    });

    // 2. Seed Customers
    const customer1 = await User.create({
      fullName: 'Khách Hàng 1',
      email: `customer1_${Date.now()}@test.local`,
      passwordHash: 'dummy-hashed-pwd-123',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    const customer2 = await User.create({
      fullName: 'Khách Hàng 2',
      email: `customer2_${Date.now()}@test.local`,
      passwordHash: 'dummy-hashed-pwd-123',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    // 3. Seed Completed Bookings
    const booking1 = await Booking.create({
      customer: customer1._id,
      provider: providerUser._id,
      service: new mongoose.Types.ObjectId(),
      request: new mongoose.Types.ObjectId(),
      status: 'COMPLETED',
      price: 200000,
      address: { street: '123 Lê Duẩn', city: 'Đà Nẵng' },
      scheduledStartAt: new Date('2026-11-01T08:00:00Z'),
      scheduledEndAt: new Date('2026-11-01T10:00:00Z'),
    });

    const booking2 = await Booking.create({
      customer: customer2._id,
      provider: providerUser._id,
      service: new mongoose.Types.ObjectId(),
      request: new mongoose.Types.ObjectId(),
      status: 'COMPLETED',
      price: 350000,
      address: { street: '456 Bạch Đằng', city: 'Đà Nẵng' },
      scheduledStartAt: new Date('2026-11-02T08:00:00Z'),
      scheduledEndAt: new Date('2026-11-02T10:00:00Z'),
    });

    const tokenCust1 = jwt.sign({ sub: customer1._id.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1h' });
    const tokenCust2 = jwt.sign({ sub: customer2._id.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1h' });

    const app = express();
    app.use(reviewsRouter);

    // =========================================================================
    // SCENARIO 1: Two concurrent reviews for the SAME booking -> exactly ONE succeeds
    // =========================================================================
    const [resA, resB] = await Promise.all([
      dispatch(app, {
        method: 'POST',
        url: `/bookings/${booking1._id}/reviews`,
        headers: { Authorization: `Bearer ${tokenCust1}` },
        body: { rating: 5, comment: 'Đánh giá đồng thời 1' },
      }),
      dispatch(app, {
        method: 'POST',
        url: `/bookings/${booking1._id}/reviews`,
        headers: { Authorization: `Bearer ${tokenCust1}` },
        body: { rating: 4, comment: 'Đánh giá đồng thời 2' },
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Exactly one concurrent review must succeed (201) and the other must fail (409)');

    const successfulRes = resA.status === 201 ? resA : resB;
    const rejectedRes = resA.status === 409 ? resA : resB;

    assert.equal(successfulRes.body.success, true);
    assert.equal(rejectedRes.body.success, false);
    assert.equal(rejectedRes.body.message, 'Booking already has a review');

    // Verify DB state: exactly 1 review exists for booking1
    const reviewsInDbForBooking1 = await Review.find({ booking: booking1._id });
    assert.equal(reviewsInDbForBooking1.length, 1);
    const firstRating = reviewsInDbForBooking1[0].rating;

    // Verify provider rating matches the single accepted review
    let profileAfterBooking1 = await ProviderProfile.findOne({ user: providerUser._id });
    assert.equal(profileAfterBooking1.averageRating, firstRating);
    assert.equal(profileAfterBooking1.reviewCount, 1);

    // =========================================================================
    // SCENARIO 2: Two reviews for two DIFFERENT bookings for the SAME provider
    //             -> provider rating is correctly calculated and updated
    // =========================================================================
    // Customer 2 reviews booking2 with rating 3
    const resBooking2 = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${booking2._id}/reviews`,
      headers: { Authorization: `Bearer ${tokenCust2}` },
      body: { rating: 3, comment: 'Dịch vụ mức khá' },
    });

    assert.equal(resBooking2.status, 201);
    assert.equal(resBooking2.body.success, true);
    assert.equal(resBooking2.body.data.rating, 3);

    // Check all reviews for provider: 1 review with firstRating (4 or 5) + 1 review with rating 3
    const allReviews = await Review.find({ provider: providerUser._id });
    assert.equal(allReviews.length, 2);

    const expectedAverage = (firstRating + 3) / 2;
    const profileAfterBooking2 = await ProviderProfile.findOne({ user: providerUser._id });

    assert.equal(profileAfterBooking2.reviewCount, 2);
    assert.equal(profileAfterBooking2.averageRating, expectedAverage);
  } finally {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {}
    try {
      if (repl) await repl.stop();
    } catch {}
  }
});
