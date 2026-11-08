const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const Review = require('../src/modules/reviews/review.model.js');
const User = require('../src/modules/users/user.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const reviewsRouter = require('../src/modules/reviews/review.routes.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('review query accepts supported filters and sort orders', () => {
  assert.deepEqual(reviewsRouter.parseReviewQuery({
    page: '2',
    limit: '10',
    rating: '5',
    sortBy: 'highest',
  }), {
    page: 2,
    limit: 10,
    rating: 5,
    sortBy: 'highest',
  });
  assert.deepEqual(reviewsRouter.parseReviewQuery({ rating: 'all' }), {
    page: 1,
    limit: 20,
    rating: undefined,
    sortBy: 'newest',
  });
  assert.equal(reviewsRouter.parseReviewQuery({ rating: '6' }), null);
  assert.equal(reviewsRouter.parseReviewQuery({ sortBy: 'random' }), null);
});

test('review DTO matches the shared web review shape', () => {
  const dto = reviewsRouter.toReviewDto({
    _id: { toString: () => 'review-id' },
    rating: 5,
    comment: 'Great work',
    response: 'Thank you',
    createdAt: '2026-11-04T00:00:00.000Z',
    customer: {
      _id: { toString: () => 'customer-id' },
      fullName: 'Customer',
      avatarUrl: 'avatar.png',
    },
    booking: { service: { name: 'Repair' } },
  });

  assert.deepEqual(dto, {
    id: 'review-id',
    rating: 5,
    comment: 'Great work',
    response: 'Thank you',
    createdAt: '2026-11-04T00:00:00.000Z',
    customer: {
      id: 'customer-id',
      fullName: 'Customer',
      avatarUrl: 'avatar.png',
    },
    serviceName: 'Repair',
  });
});

test('rating summary returns overall counts and percentages', () => {
  assert.deepEqual(reviewsRouter.toRatingSummary({
    total: 3,
    average: 4.3,
    star1: 0,
    star2: 0,
    star3: 1,
    star4: 0,
    star5: 2,
  }), {
    average: 4.3,
    total: 3,
    breakdown: {
      1: { count: 0, percentage: 0 },
      2: { count: 0, percentage: 0 },
      3: { count: 1, percentage: 33 },
      4: { count: 0, percentage: 0 },
      5: { count: 2, percentage: 67 },
    },
  });
});

test('public review endpoint returns filtered reviews in the shared response shape', async () => {
  const providerId = new mongoose.Types.ObjectId().toString();
  const originalFind = Review.find;
  const originalCountDocuments = Review.countDocuments;
  const originalAggregate = Review.aggregate;
  let appliedFilter;
  let appliedSort;

  Review.find = (filter) => {
    appliedFilter = filter;
    const query = {
      sort(value) {
        appliedSort = value;
        return query;
      },
      skip() { return query; },
      limit() { return query; },
      populate() { return query; },
      then(resolve, reject) {
        return Promise.resolve([{
          _id: new mongoose.Types.ObjectId(),
          rating: 5,
          comment: 'Great work',
          createdAt: new Date('2026-11-04T00:00:00.000Z'),
          customer: { _id: new mongoose.Types.ObjectId(), fullName: 'Customer' },
          booking: { service: { name: 'Repair' } },
        }]).then(resolve, reject);
      },
    };
    return query;
  };
  Review.countDocuments = async () => 1;
  Review.aggregate = async (pipeline) => {
    assert.deepEqual(pipeline[0].$match, {
      provider: new mongoose.Types.ObjectId(providerId),
      isVisible: true,
    });
    return [{
      average: 5,
      total: 1,
      star1: 0,
      star2: 0,
      star3: 0,
      star4: 0,
      star5: 1,
    }];
  };

  try {
    const app = express();
    app.use(reviewsRouter);
    const response = await dispatch(app, {
      url: `/providers/${providerId}/reviews?rating=5&sortBy=highest`,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(appliedFilter, {
      provider: new mongoose.Types.ObjectId(providerId),
      isVisible: true,
      rating: 5,
    });
    assert.deepEqual(appliedSort, { rating: -1, createdAt: -1 });
    assert.equal(response.body.data.reviews[0].serviceName, 'Repair');
    assert.equal(response.body.data.reviews[0].customer.fullName, 'Customer');
    assert.equal(response.body.summary.total, 1);
    assert.equal(response.body.pagination.totalItems, 1);
    assert.equal(response.body.pagination.total, 1);
  } finally {
    Review.find = originalFind;
    Review.countDocuments = originalCountDocuments;
    Review.aggregate = originalAggregate;
  }
});

test('provider can reply to own review and response is trimmed', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();
  let saved = false;
  const review = {
    _id: reviewId,
    provider: providerId,
    customer: { _id: new mongoose.Types.ObjectId(), fullName: 'Customer' },
    rating: 4,
    comment: 'Good service',
    response: null,
    createdAt: new Date('2026-11-04T00:00:00.000Z'),
    isVisible: true,
    booking: null,
    async save() { saved = true; },
  };
  const originalUserFindById = User.findById;
  const originalReviewFindById = Review.findById;
  User.findById = () => ({
    select: async () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE' }),
  });
  Review.findById = async () => review;
  const token = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);
    const response = await dispatch(app, {
      method: 'PATCH',
      url: `/reviews/${reviewId}/response`,
      headers: { Authorization: `Bearer ${token}` },
      body: { response: '  Cảm ơn bạn đã tin tưởng!  ' },
    });

    assert.equal(response.status, 200);
    assert.equal(saved, true);
    assert.equal(review.response, 'Cảm ơn bạn đã tin tưởng!');
    assert.equal(response.body.data.response, 'Cảm ơn bạn đã tin tưởng!');
  } finally {
    User.findById = originalUserFindById;
    Review.findById = originalReviewFindById;
  }
});

test('review response endpoint rejects non-providers, other providers, and empty replies', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const otherProviderId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();
  let userRole = 'PROVIDER';
  const review = {
    provider: otherProviderId,
    isVisible: true,
    async save() {},
  };
  const originalUserFindById = User.findById;
  const originalReviewFindById = Review.findById;
  User.findById = () => ({
    select: async () => ({ _id: providerId, role: userRole, status: 'ACTIVE' }),
  });
  Review.findById = async () => review;
  const token = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);
    const headers = { Authorization: `Bearer ${token}` };
    const wrongOwner = await dispatch(app, {
      method: 'PATCH',
      url: `/reviews/${reviewId}/response`,
      headers,
      body: { response: 'Reply' },
    });
    assert.equal(wrongOwner.status, 403);

    review.provider = providerId;
    userRole = 'CUSTOMER';
    const customer = await dispatch(app, {
      method: 'PATCH',
      url: `/reviews/${reviewId}/response`,
      headers,
      body: { response: 'Reply' },
    });
    assert.equal(customer.status, 403);

    userRole = 'PROVIDER';
    const emptyReply = await dispatch(app, {
      method: 'PATCH',
      url: `/reviews/${reviewId}/response`,
      headers,
      body: { response: '   ' },
    });
    assert.equal(emptyReply.status, 400);
  } finally {
    User.findById = originalUserFindById;
    Review.findById = originalReviewFindById;
  }
});

test('V-27: creating review executes inside transaction and updates rating atomically', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalReviewFindOne = Review.findOne;
  const originalReviewCreate = Review.create;
  const originalReviewFindById = Review.findById;
  const originalReviewAggregate = Review.aggregate;
  const originalProfileFindOneAndUpdate = ProviderProfile.findOneAndUpdate;

  let sessionStarted = false;
  let committed = false;
  let capturedSession = null;
  let capturedProfileUpdate = null;

  const mockSession = {
    startTransaction() {},
    commitTransaction: async () => { committed = true; },
    abortTransaction: async () => {},
    endSession: async () => {},
  };

  mongoose.startSession = async () => {
    sessionStarted = true;
    return mockSession;
  };

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async (id) => {
    if (id.toString() === bookingId.toString()) {
      return {
        _id: bookingId,
        customer: customerId,
        provider: providerId,
        status: 'COMPLETED',
      };
    }
    return null;
  };

  Review.findOne = async () => null;

  Review.create = async ([payload], opts) => {
    capturedSession = opts?.session;
    return [{
      _id: reviewId,
      booking: payload.booking,
      customer: payload.customer,
      provider: payload.provider,
      rating: payload.rating,
      comment: payload.comment,
    }];
  };

  Review.findById = (id) => ({
    populate: async () => ({
      _id: id,
      rating: 5,
      comment: 'Dịch vụ rất tốt',
      customer: { _id: customerId, fullName: 'Nguyễn Văn A' },
    }),
  });

  Review.aggregate = () => [{ averageRating: 5.0, reviewCount: 1 }];

  ProviderProfile.findOneAndUpdate = async (filter, update, opts) => {
    capturedProfileUpdate = { filter, update, opts };
    return { user: providerId };
  };

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5, comment: 'Dịch vụ rất tốt' },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(sessionStarted, true);
    assert.equal(committed, true);
    assert.equal(capturedSession, mockSession);
    assert.equal(capturedProfileUpdate.opts?.session, mockSession);
    assert.equal(capturedProfileUpdate.update.$set.averageRating, 5.0);
    assert.equal(capturedProfileUpdate.update.$set.reviewCount, 1);
  } finally {
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
    Review.findOne = originalReviewFindOne;
    Review.create = originalReviewCreate;
    Review.findById = originalReviewFindById;
    Review.aggregate = originalReviewAggregate;
    ProviderProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  }
});

test('V-27: when updateProviderRating fails inside transaction, transaction aborts and error is not swallowed', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalReviewFindOne = Review.findOne;
  const originalReviewCreate = Review.create;
  const originalReviewFindById = Review.findById;
  const originalReviewAggregate = Review.aggregate;

  let aborted = false;

  const mockSession = {
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => { aborted = true; },
    endSession: async () => {},
  };

  mongoose.startSession = async () => mockSession;

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  Review.findOne = async () => null;
  Review.create = async ([payload]) => [{ _id: reviewId, ...payload }];

  Review.aggregate = () => {
    throw new Error('Database aggregate failure on rating update');
  };

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);
    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, message: err.message });
    });

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(aborted, true);
    assert.equal(response.status, 500);
    assert.match(response.body.message, /Database aggregate failure/);
  } finally {
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
    Review.findOne = originalReviewFindOne;
    Review.create = originalReviewCreate;
    Review.findById = originalReviewFindById;
    Review.aggregate = originalReviewAggregate;
  }
});

test('V-27: in production mode, startSession failure fails immediately with 503', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalNodeEnv = env.nodeEnv;
  env.nodeEnv = 'production';

  mongoose.startSession = async () => {
    throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
  };

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    });

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(response.status, 503);
    assert.match(response.body.message, /không thể khởi tạo transaction/);
  } finally {
    env.nodeEnv = originalNodeEnv;
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
  }
});

test('V-27: in dev mode without ALLOW_NO_TRANSACTION, startSession failure returns 503', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalNodeEnv = env.nodeEnv;
  const originalAllow = env.allowNoTransaction;
  env.nodeEnv = 'development';
  env.allowNoTransaction = false;

  mongoose.startSession = async () => {
    throw new Error('No replica set');
  };

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    });

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(response.status, 503);
    assert.match(response.body.message, /Giao dịch cơ sở dữ liệu không khả dụng/);
  } finally {
    env.nodeEnv = originalNodeEnv;
    env.allowNoTransaction = originalAllow;
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
  }
});

test('V-27: in dev mode with ALLOW_NO_TRANSACTION=true, falls back to non-transactional write', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const reviewId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalReviewFindOne = Review.findOne;
  const originalReviewCreate = Review.create;
  const originalReviewFindById = Review.findById;
  const originalReviewAggregate = Review.aggregate;
  const originalProfileFindOneAndUpdate = ProviderProfile.findOneAndUpdate;
  const originalNodeEnv = env.nodeEnv;
  const originalAllow = env.allowNoTransaction;
  env.nodeEnv = 'development';
  env.allowNoTransaction = true;

  mongoose.startSession = async () => {
    throw new Error('No replica set in local dev');
  };

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  Review.findOne = async () => null;
  Review.create = async ([payload]) => [{ _id: reviewId, ...payload }];
  Review.findById = (id) => ({
    populate: async () => ({ _id: id, rating: 5, customer: { _id: customerId } }),
  });
  Review.aggregate = () => [{ averageRating: 5.0, reviewCount: 1 }];
  ProviderProfile.findOneAndUpdate = async () => ({ user: providerId });

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
  } finally {
    env.nodeEnv = originalNodeEnv;
    env.allowNoTransaction = originalAllow;
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
    Review.findOne = originalReviewFindOne;
    Review.create = originalReviewCreate;
    Review.findById = originalReviewFindById;
    Review.aggregate = originalReviewAggregate;
    ProviderProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
  }
});

test('V-27: duplicate review returns 409 when review already exists for booking', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalReviewFindOne = Review.findOne;

  let aborted = false;
  const mockSession = {
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => { aborted = true; },
    endSession: async () => {},
  };
  mongoose.startSession = async () => mockSession;

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  Review.findOne = async () => ({ _id: new mongoose.Types.ObjectId(), booking: bookingId });

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.success, false);
    assert.equal(aborted, true);
    assert.equal(response.body.message, 'Booking already has a review');
  } finally {
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
    Review.findOne = originalReviewFindOne;
  }
});

test('V-27: duplicate review returns 409 on unique key collision (E11000)', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalStartSession = mongoose.startSession;
  const originalUserFindById = User.findById;
  const originalBookingFindById = Booking.findById;
  const originalReviewFindOne = Review.findOne;
  const originalReviewCreate = Review.create;

  let aborted = false;
  const mockSession = {
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => { aborted = true; },
    endSession: async () => {},
  };
  mongoose.startSession = async () => mockSession;

  User.findById = () => ({
    select: async () => ({ _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });

  Booking.findById = async () => ({
    _id: bookingId,
    customer: customerId,
    provider: providerId,
    status: 'COMPLETED',
  });

  Review.findOne = async () => null;

  Review.create = async () => {
    const duplicateErr = new Error('E11000 duplicate key error collection: homecare.reviews index: booking_1 dup key');
    duplicateErr.code = 11000;
    throw duplicateErr;
  };

  const token = jwt.sign({ sub: customerId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const app = express();
    app.use(reviewsRouter);

    const response = await dispatch(app, {
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      headers: { Authorization: `Bearer ${token}` },
      body: { rating: 5 },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.success, false);
    assert.equal(aborted, true);
    assert.equal(response.body.message, 'Booking already has a review');
  } finally {
    mongoose.startSession = originalStartSession;
    User.findById = originalUserFindById;
    Booking.findById = originalBookingFindById;
    Review.findOne = originalReviewFindOne;
    Review.create = originalReviewCreate;
  }
});
