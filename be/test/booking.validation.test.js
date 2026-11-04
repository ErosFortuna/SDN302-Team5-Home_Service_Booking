const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStatusUpdate } = require('../src/modules/bookings/booking.validation.js');
const { BOOKING_STATUS } = require('../src/modules/bookings/booking.status.js');

test('validateStatusUpdate accepts an optional zero final price only on completion', () => {
  const req = {
    body: {
      status: BOOKING_STATUS.COMPLETED,
      confirmCompletion: true,
      finalPrice: 0,
    },
  };

  validateStatusUpdate(req, {}, () => {});

  assert.equal(req.body.finalPrice, 0);
  assert.equal(req.body.status, BOOKING_STATUS.COMPLETED);
});

test('validateStatusUpdate rejects a final price before completion', () => {
  const req = {
    body: {
      status: BOOKING_STATUS.IN_PROGRESS,
      finalPrice: 150000,
    },
  };

  assert.throws(
    () => validateStatusUpdate(req, {}, () => {}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.details[0].message, /only be provided when completing/);
      return true;
    },
  );
});

test('validateStatusUpdate rejects negative, fractional, and unsafe final prices', () => {
  for (const finalPrice of [-1, 150000.5, Number.MAX_SAFE_INTEGER + 1]) {
    const req = {
      body: {
        status: BOOKING_STATUS.COMPLETED,
        finalPrice,
      },
    };

    assert.throws(
      () => validateStatusUpdate(req, {}, () => {}),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.details[0].field, 'finalPrice');
        return true;
      },
    );
  }
});
