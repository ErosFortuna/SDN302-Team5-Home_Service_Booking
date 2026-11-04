const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  confirmBooking,
  declineBooking,
} = require('../src/modules/bookings/booking.controller.js');
const { BOOKING_STATUS, DECLINE_REASON } = require('../src/modules/bookings/booking.status.js');
const { AppError } = require('../src/shared/app-error.js');

test('confirmBooking verifies schedule conflicts (NFR-09) and rejects overlapping bookings with 409', async () => {
  const providerId = '507f1f77bcf86cd799439011';
  const booking = {
    _id: '507f1f77bcf86cd799439012',
    status: BOOKING_STATUS.PENDING_CONFIRMATION,
    provider: providerId,
    scheduledStartAt: new Date('2026-11-01T08:00:00Z'),
    scheduledEndAt: new Date('2026-11-01T10:00:00Z'),
    materials: [],
    populate: async () => booking,
  };

  const req = {
    booking,
    user: { _id: providerId, role: 'PROVIDER' },
    body: {},
  };

  // Mock Booking.findOne to return a conflicting active booking
  const BookingModel = require('../src/modules/bookings/booking.model.js');
  const originalFindOne = BookingModel.findOne;
  BookingModel.findOne = () => ({
    select: () => ({
      lean: async () => ({
        _id: '507f1f77bcf86cd799439013',
        scheduledStartAt: new Date('2026-11-01T09:00:00Z'),
        scheduledEndAt: new Date('2026-11-01T11:00:00Z'),
        status: BOOKING_STATUS.CONFIRMED,
      }),
    }),
  });

  try {
    await assert.rejects(
      async () => {
        await confirmBooking(req, {});
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /trùng vào khung giờ/);
        return true;
      }
    );
  } finally {
    BookingModel.findOne = originalFindOne;
  }
});

test('confirmBooking is idempotent when booking is already CONFIRMED', async () => {
  const providerId = '507f1f77bcf86cd799439011';
  const booking = {
    _id: '507f1f77bcf86cd799439012',
    status: BOOKING_STATUS.CONFIRMED,
    provider: providerId,
    materials: [],
    populate: async () => booking,
    toJSON: () => ({ _id: '507f1f77bcf86cd799439012', status: BOOKING_STATUS.CONFIRMED }),
  };

  const req = {
    booking,
    user: { _id: providerId, role: 'PROVIDER' },
    body: {},
  };

  let jsonResult = null;
  const res = {
    json: (data) => {
      jsonResult = data;
    },
  };

  await confirmBooking(req, res);
  assert.ok(jsonResult);
  assert.strictEqual(jsonResult.success, true);
  assert.match(jsonResult.message, /already confirmed/);
});

test('confirmBooking creates a notification for the customer after the booking update succeeds', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.PENDING_CONFIRMATION,
    provider: providerId,
    customer: customerId,
    scheduledStartAt: new Date('2026-11-03T08:00:00Z'),
    scheduledEndAt: new Date('2026-11-03T10:00:00Z'),
    materials: [],
    populate: async () => booking,
    toJSON: () => ({ _id: bookingId, status: BOOKING_STATUS.CONFIRMED }),
  };
  const BookingModel = require('../src/modules/bookings/booking.model.js');
  const Notification = require('../src/modules/notifications/notification.model.js');
  const originals = {
    findOne: BookingModel.findOne,
    findOneAndUpdate: BookingModel.findOneAndUpdate,
    createNotification: Notification.create,
  };
  let createdNotification;
  BookingModel.findOne = () => ({
    select() {
      return { lean: async () => null };
    },
  });
  BookingModel.findOneAndUpdate = () => ({
    populate: async () => booking,
  });
  Notification.create = async (payload) => {
    createdNotification = payload;
    return payload;
  };

  try {
    const res = { json() {} };
    await confirmBooking({
      booking,
      user: { _id: providerId, role: 'PROVIDER' },
      body: {},
    }, res);

    assert.equal(createdNotification.recipient, customerId);
    assert.equal(createdNotification.type, 'BOOKING_CONFIRMED');
    assert.equal(createdNotification.resourceType, 'BOOKING');
    assert.equal(createdNotification.resourceId, bookingId);
  } finally {
    BookingModel.findOne = originals.findOne;
    BookingModel.findOneAndUpdate = originals.findOneAndUpdate;
    Notification.create = originals.createNotification;
  }
});

test('confirmBooking rejects call if booking is in another status (e.g. IN_PROGRESS)', async () => {
  const providerId = '507f1f77bcf86cd799439011';
  const booking = {
    _id: '507f1f77bcf86cd799439012',
    status: BOOKING_STATUS.IN_PROGRESS,
    provider: providerId,
    materials: [],
    populate: async () => booking,
  };

  const req = {
    booking,
    user: { _id: providerId, role: 'PROVIDER' },
    body: {},
  };

  await assert.rejects(
    async () => {
      await confirmBooking(req, {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      return true;
    }
  );
});

test('declineBooking rejects call if booking is already COMPLETED', async () => {
  const providerId = '507f1f77bcf86cd799439011';
  const booking = {
    _id: '507f1f77bcf86cd799439012',
    status: BOOKING_STATUS.COMPLETED,
    provider: providerId,
    materials: [],
  };

  const req = {
    booking,
    user: { _id: providerId, role: 'PROVIDER' },
    body: { reasonCode: DECLINE_REASON.BUSY },
  };

  await assert.rejects(
    async () => {
      await declineBooking(req, {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      return true;
    }
  );
});

test('declineBooking reverts service request to OPEN and adds provider to declinedProviders', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.PENDING_CONFIRMATION,
    provider: providerId,
    customer: customerId,
    request: requestId,
    materials: [],
  };

  const BookingModel = require('../src/modules/bookings/booking.model.js');
  const ServiceRequest = require('../src/modules/requests/request.model.js');
  const Notification = require('../src/modules/notifications/notification.model.js');

  const originals = {
    findOneAndUpdate: BookingModel.findOneAndUpdate,
    updateOne: ServiceRequest.updateOne,
    createNotification: Notification.create,
    startSession: mongoose.startSession,
  };

  let bookingUpdateCall = null;
  let requestUpdateCall = null;
  let notificationCall = null;

  BookingModel.findOneAndUpdate = (filter, update) => {
    bookingUpdateCall = { filter, update };
    const doc = {
      ...booking,
      status: BOOKING_STATUS.CANCELLED,
      toJSON: () => ({ _id: bookingId, status: BOOKING_STATUS.CANCELLED }),
    };
    doc.populate = async () => doc;
    return doc;
  };

  ServiceRequest.updateOne = async (filter, update) => {
    requestUpdateCall = { filter, update };
    return { acknowledged: true };
  };

  Notification.create = async (payload) => {
    notificationCall = payload;
    return payload;
  };

  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  });

  try {
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
      },
    };

    const req = {
      booking,
      user: { _id: providerId, role: 'PROVIDER' },
      body: { reasonCode: DECLINE_REASON.BUSY, reasonText: 'Too busy today' },
    };

    await declineBooking(req, res);

    assert.ok(jsonResult);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(bookingUpdateCall.update.$set.status, BOOKING_STATUS.CANCELLED);
    assert.strictEqual(String(requestUpdateCall.filter._id), String(requestId));
    assert.strictEqual(requestUpdateCall.update.$set.status, 'OPEN');
    assert.deepStrictEqual(requestUpdateCall.update.$addToSet.declinedProviders, providerId);
    assert.strictEqual(notificationCall.type, 'BOOKING_DECLINED');
  } finally {
    BookingModel.findOneAndUpdate = originals.findOneAndUpdate;
    ServiceRequest.updateOne = originals.updateOne;
    Notification.create = originals.createNotification;
    mongoose.startSession = originals.startSession;
  }
});
