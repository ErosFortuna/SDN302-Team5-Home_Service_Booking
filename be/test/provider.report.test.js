const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/modules/users/user.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('provider performance report scopes metrics to authenticated provider and rejects other roles', async (t) => {
  const oldFindById = User.findById;
  const oldAggregate = Booking.aggregate;
  const providerId = new mongoose.Types.ObjectId();
  const user = { _id: providerId, role: 'PROVIDER', status: 'ACTIVE', tokenVersion: 0 };
  const aggregateCalls = [];
  User.findById = () => ({ select: () => Promise.resolve(user) });
  Booking.aggregate = async (pipeline) => {
    aggregateCalls.push(pipeline);
    if (pipeline.some((stage) => stage.$unwind === '$statusHistory')) {
      return [{ respondedRequests: 2, averageResponseMinutes: 18.5 }];
    }
    if (pipeline[0].$match.status === 'COMPLETED') {
      return [{ summary: [{ totalRevenue: 250000, completedBookings: 1 }], series: [{ _id: '2026-11-10', revenue: 250000, completedBookings: 1 }] }];
    }
    return [{ summary: [{ totalRequests: 4 }], series: [{ _id: '2026-11-10', bookingCount: 2 }] }];
  };
  t.after(() => {
    User.findById = oldFindById;
    Booking.aggregate = oldAggregate;
  });

  const token = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });
  const response = await dispatch(app, {
    url: '/api/provider/reports/performance?startDate=2026-11-01&endDate=2026-11-11&granularity=day&requestGranularity=week',
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.summary.totalRevenue, 250000);
  assert.equal(response.body.data.summary.averageResponseMinutes, 18.5);
  assert.equal(response.body.data.requestSeries[0].sharePercent, 50);
  assert.equal(aggregateCalls.length, 3);
  for (const pipeline of aggregateCalls) assert.deepEqual(pipeline[0].$match.provider, providerId);

  user.role = 'CUSTOMER';
  const forbidden = await dispatch(app, {
    url: '/api/provider/reports/performance',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.statusCode, 403);
});

test('provider performance report validates request chart granularity', async (t) => {
  const oldFindById = User.findById;
  const providerId = new mongoose.Types.ObjectId();
  const user = { _id: providerId, role: 'PROVIDER', status: 'ACTIVE', tokenVersion: 0 };
  User.findById = () => ({ select: () => Promise.resolve(user) });
  t.after(() => { User.findById = oldFindById; });
  const token = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });
  const response = await dispatch(app, {
    url: '/api/provider/reports/performance?requestGranularity=month',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.statusCode, 400);
});
