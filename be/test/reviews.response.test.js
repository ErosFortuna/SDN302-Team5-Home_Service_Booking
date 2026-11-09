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

test('review response is restricted to the reviewed provider and valid content', async () => {
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
