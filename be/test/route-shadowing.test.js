const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
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
  };
  return obj;
}

test('Route Shadowing Investigation: Test GET /api/providers/search and GET /api/providers/requests/incoming', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const originalUserFindById = User.findById;
  const originalProfileFindOne = ProviderProfile.findOne;
  const originalProfileFind = ProviderProfile.find;
  const originalBookingFind = Booking.find;
  const originalBookingCount = Booking.countDocuments;

  User.findById = () => ({
    select: async () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE' }),
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

  const token = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '5m' });

  try {
    // 1. GET /api/providers/search
    const resSearch = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/search',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(resSearch.status, 200, 'GET /api/providers/search should return 200');
    assert.equal(resSearch.body.success, true);

    // 2. GET /api/providers/requests/incoming
    const resIncoming = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/requests/incoming',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(resIncoming.status, 200, 'GET /api/providers/requests/incoming should return 200');
    assert.equal(resIncoming.body.success, true);

    // 3. GET /api/providers/:providerId (Public Profile)
    const publicTargetId = new mongoose.Types.ObjectId().toString();
    const resPublic = await dispatch(app, {
      method: 'GET',
      url: `/api/providers/${publicTargetId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(resPublic.status, 200, 'GET /api/providers/:providerId should return 200');
  } finally {
    User.findById = originalUserFindById;
    ProviderProfile.findOne = originalProfileFindOne;
    ProviderProfile.find = originalProfileFind;
    Booking.find = originalBookingFind;
    Booking.countDocuments = originalBookingCount;
  }
});
