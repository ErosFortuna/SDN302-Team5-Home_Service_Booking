const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

function chainMock(resolveVal = []) {
  const obj = {
    sort() { return obj; },
    skip() { return obj; },
    limit() { return obj; },
    select() { return obj; },
    populate() { return obj; },
    lean: async () => resolveVal,
    then(resolve, reject) {
      return Promise.resolve(resolveVal).then(resolve, reject);
    },
  };
  return obj;
}

test('Route Shadowing Investigation: Test GET /api/providers/search, incoming requests and public routes', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const originalUserFindById = User.findById;
  const originalProfileFindOne = ProviderProfile.findOne;
  const originalProfileFind = ProviderProfile.find;
  const originalBookingFind = Booking.find;
  const originalBookingCount = Booking.countDocuments;
  const originalReviewFind = Review.find;
  const originalReviewCount = Review.countDocuments;
  const originalReviewAggregate = Review.aggregate;

  User.findById = (id) => ({
    select: async () => ({
      _id: id,
      role: id?.toString() === customerId.toString() ? 'CUSTOMER' : 'PROVIDER',
      status: 'ACTIVE',
    }),
  });
  ProviderProfile.findOne = () => ({
    populate() { return this; },
    lean: async () => ({
      _id: new mongoose.Types.ObjectId(),
      user: { _id: providerId, role: 'PROVIDER', status: 'ACTIVE' },
      verificationStatus: 'VERIFIED',
      isDeleted: false,
      serviceAreas: ['Dist 1'],
      skills: [],
    }),
  });
  ProviderProfile.find = () => chainMock([]);
  Booking.find = () => chainMock([]);
  Booking.countDocuments = async () => 0;
  Review.find = () => chainMock([]);
  Review.countDocuments = async () => 0;
  Review.aggregate = async () => [];

  const providerToken = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '5m' });
  const customerToken = jwt.sign({ sub: customerId.toString() }, env.jwtSecret, { expiresIn: '5m' });

  try {
    // 1. GET /api/providers/search (Authenticated search)
    const resSearch = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/search',
      headers: { authorization: `Bearer ${providerToken}` },
    });
    assert.equal(resSearch.status, 200, 'GET /api/providers/search should return 200');
    assert.equal(resSearch.body.success, true);

    // 2. GET /api/providers/requests/incoming (Provider-only route)
    // 2a. Provider accessing: 200
    const resIncoming = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/requests/incoming',
      headers: { authorization: `Bearer ${providerToken}` },
    });
    assert.equal(resIncoming.status, 200, 'GET /api/providers/requests/incoming should return 200 for provider');
    assert.equal(resIncoming.body.success, true);

    // 2b. Customer accessing incoming requests: 403 Forbidden
    const resIncomingCust = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/requests/incoming',
      headers: { authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resIncomingCust.status, 403, 'Customer should be 403 on /requests/incoming');

    // 2c. Guest accessing incoming requests: 401 Unauthorized
    const resIncomingGuest = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/requests/incoming',
    });
    assert.equal(resIncomingGuest.status, 401, 'Guest should be 401 on /requests/incoming');

    // 3. GET /api/providers/:providerId (Public Profile - NO AUTH REQUIRED)
    const publicTargetId = new mongoose.Types.ObjectId().toString();
    // 3a. Guest accessing public profile: 200 OK
    const resPublicGuest = await dispatch(app, {
      method: 'GET',
      url: `/api/providers/${publicTargetId}`,
    });
    assert.equal(resPublicGuest.status, 200, 'Guest should be able to view public profile (200)');
    assert.equal(resPublicGuest.body.success, true);

    // 3b. Customer accessing public profile: 200 OK
    const resPublicCust = await dispatch(app, {
      method: 'GET',
      url: `/api/providers/${publicTargetId}`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resPublicCust.status, 200, 'Customer should be able to view public profile (200)');
    assert.equal(resPublicCust.body.success, true);

    // 4. GET /api/providers/:providerId/reviews (Public Reviews - NO AUTH REQUIRED)
    // 4a. Guest accessing reviews: 200 OK
    const resReviewsGuest = await dispatch(app, {
      method: 'GET',
      url: `/api/providers/${publicTargetId}/reviews?page=1&limit=5`,
    });
    assert.equal(resReviewsGuest.status, 200, 'Guest should be able to view provider reviews (200)');
    assert.equal(resReviewsGuest.body.success, true);

    // 4b. Customer accessing reviews: 200 OK (previously blocked with 403!)
    const resReviewsCust = await dispatch(app, {
      method: 'GET',
      url: `/api/providers/${publicTargetId}/reviews?page=1&limit=5`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resReviewsCust.status, 200, 'Customer should be able to view provider reviews (200)');
    assert.equal(resReviewsCust.body.success, true);

  } finally {
    User.findById = originalUserFindById;
    ProviderProfile.findOne = originalProfileFindOne;
    ProviderProfile.find = originalProfileFind;
    Booking.find = originalBookingFind;
    Booking.countDocuments = originalBookingCount;
    Review.find = originalReviewFind;
    Review.countDocuments = originalReviewCount;
    Review.aggregate = originalReviewAggregate;
  }
});
