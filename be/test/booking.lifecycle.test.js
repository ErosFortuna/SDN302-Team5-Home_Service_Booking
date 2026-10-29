const test = require('node:test');
const assert = require('node:assert/strict');
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
