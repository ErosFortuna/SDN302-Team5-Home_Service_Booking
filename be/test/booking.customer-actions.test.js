const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCustomerReschedule,
  validateCustomerCancellation,
} = require('../src/modules/bookings/booking.validation.js');
const {
  rescheduleCustomerBooking,
  cancelCustomerBooking,
} = require('../src/modules/bookings/booking.controller.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const mongoose = require('mongoose');
const { AppError } = require('../src/shared/app-error.js');

test('reschedule validation parses a valid start time and trims the optional note', () => {
  const req = {
    body: {
      scheduledStartAt: '2026-11-05T02:00:00.000Z',
      note: '  Customer requested a new time  ',
    },
  };
  let nextCalled = false;

  validateCustomerReschedule(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.ok(req.body.scheduledStartAt instanceof Date);
  assert.equal(req.body.note, 'Customer requested a new time');
});

test('reschedule validation rejects extra fields and invalid dates', () => {
  assert.throws(
    () => validateCustomerReschedule({ body: { scheduledStartAt: 'invalid' } }, {}, () => {}),
    /Validation failed/,
  );
  assert.throws(
    () => validateCustomerReschedule({
      body: { scheduledStartAt: '2026-11-05T02:00:00.000Z', status: 'CANCELLED' },
    }, {}, () => {}),
    /Validation failed/,
  );
});

test('customer cancellation validation requires a bounded reason and rejects extra fields', () => {
  const req = { body: { reason: '  I need to change my plans  ' } };
  let nextCalled = false;

  validateCustomerCancellation(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.reason, 'I need to change my plans');
  assert.throws(
    () => validateCustomerCancellation({ body: { reason: 'no' } }, {}, () => {}),
    /Validation failed/,
  );
  assert.throws(
    () => validateCustomerCancellation({ body: { reason: 'valid reason', status: 'CANCELLED' } }, {}, () => {}),
    /Validation failed/,
  );
});

test('customers cannot reschedule a booking after service has started', async () => {
  await assert.rejects(
    () => rescheduleCustomerBooking({
      booking: {
        status: 'IN_PROGRESS',
        scheduledStartAt: new Date(Date.now() + 60_000),
        scheduledEndAt: new Date(Date.now() + 120_000),
      },
      user: { _id: 'customer-id' },
      body: { scheduledStartAt: new Date(Date.now() + 180_000) },
    }, {}),
    (error) => error instanceof AppError && error.statusCode === 409,
  );
});

test('customers cannot cancel a completed booking', async () => {
  await assert.rejects(
    () => cancelCustomerBooking({
      booking: {
        status: 'COMPLETED',
        scheduledStartAt: new Date(Date.now() + 60_000),
      },
      user: { _id: 'customer-id' },
      body: { reason: 'No longer needed' },
    }, {}),
    (error) => error instanceof AppError && error.statusCode === 409,
  );
});

test('rescheduling does not require the linked request to already have BOOKED status', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Booking.findOne,
    findOneAndUpdate: Booking.findOneAndUpdate,
    updateOne: ServiceRequest.updateOne,
  };
  const oldStart = new Date(Date.now() + 60 * 60 * 1000);
  const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
  let requestFilter;
  const updatedBooking = {
    status: 'CONFIRMED',
    toJSON: () => ({ status: 'CONFIRMED' }),
    populate: async () => updatedBooking,
  };

  mongoose.startSession = async () => {
    throw new Error('Transactions unavailable in unit test');
  };
  Booking.findOne = () => ({ select: () => ({ lean: async () => null }) });
  Booking.findOneAndUpdate = async () => updatedBooking;
  ServiceRequest.updateOne = async (filter) => {
    requestFilter = filter;
    return { matchedCount: 1 };
  };

  try {
    let response;
    await rescheduleCustomerBooking({
      booking: {
        _id: 'booking-id',
        customer: 'customer-id',
        provider: 'provider-id',
        request: 'request-id',
        status: 'CONFIRMED',
        scheduledStartAt: oldStart,
        scheduledEndAt: new Date(oldStart.getTime() + 60 * 60 * 1000),
      },
      user: { _id: 'customer-id' },
      body: { scheduledStartAt: newStart },
    }, {
      json: (body) => {
        response = body;
      },
    });

    assert.equal(response.success, true);
    assert.deepEqual(requestFilter, { _id: 'request-id', customer: 'customer-id' });
  } finally {
    mongoose.startSession = originals.startSession;
    Booking.findOne = originals.findOne;
    Booking.findOneAndUpdate = originals.findOneAndUpdate;
    ServiceRequest.updateOne = originals.updateOne;
  }
});

test('cancelling does not require the linked request to already have BOOKED status', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOneAndUpdate: Booking.findOneAndUpdate,
    updateOne: ServiceRequest.updateOne,
  };
  let requestFilter;
  const updatedBooking = {
    status: 'CANCELLED',
    toJSON: () => ({ status: 'CANCELLED' }),
    populate: async () => updatedBooking,
  };

  mongoose.startSession = async () => {
    throw new Error('Transactions unavailable in unit test');
  };
  Booking.findOneAndUpdate = async () => updatedBooking;
  ServiceRequest.updateOne = async (filter) => {
    requestFilter = filter;
    return { matchedCount: 1 };
  };

  try {
    let response;
    await cancelCustomerBooking({
      booking: {
        _id: 'booking-id',
        customer: 'customer-id',
        request: 'request-id',
        status: 'CONFIRMED',
        scheduledStartAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      user: { _id: 'customer-id' },
      body: { reason: 'No longer needed' },
    }, {
      json: (body) => {
        response = body;
      },
    });

    assert.equal(response.success, true);
    assert.deepEqual(requestFilter, { _id: 'request-id', customer: 'customer-id' });
  } finally {
    mongoose.startSession = originals.startSession;
    Booking.findOneAndUpdate = originals.findOneAndUpdate;
    ServiceRequest.updateOne = originals.updateOne;
  }
});
