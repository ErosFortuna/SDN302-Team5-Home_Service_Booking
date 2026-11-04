const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const Review = require('../src/modules/reviews/review.model.js');
const User = require('../src/modules/users/user.model.js');
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
