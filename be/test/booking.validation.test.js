const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStatusUpdate,
  validateBookingAdjustment,
  validateConfirmPayment,
} = require('../src/modules/bookings/booking.validation.js');
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

test('validateBookingAdjustment accepts valid finalPrice, paymentStatus, and note', () => {
  const req = {
    body: {
      finalPrice: 350000,
      paymentStatus: 'PAID',
      note: 'Adjusted after customer agreement',
    },
  };
  let nextCalled = false;
  validateBookingAdjustment(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(req.body.finalPrice, 350000);
  assert.equal(req.body.paymentStatus, 'PAID');
  assert.equal(req.body.note, 'Adjusted after customer agreement');
});

test('validateBookingAdjustment requires at least one of finalPrice or paymentStatus', () => {
  const req = { body: { note: 'Only note provided' } };
  assert.throws(
    () => validateBookingAdjustment(req, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'body');
      return true;
    }
  );
});

test('validateBookingAdjustment rejects invalid paymentStatus and negative finalPrice', () => {
  const reqBadStatus = { body: { paymentStatus: 'INVALID_STATUS' } };
  assert.throws(
    () => validateBookingAdjustment(reqBadStatus, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'paymentStatus');
      return true;
    }
  );

  const reqNegativePrice = { body: { finalPrice: -5000 } };
  assert.throws(
    () => validateBookingAdjustment(reqNegativePrice, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'finalPrice');
      return true;
    }
  );
});

test('validateBookingAdjustment rejects unrecognized extra fields', () => {
  const reqExtra = { body: { finalPrice: 200000, unauthorizedField: 'hack' } };
  assert.throws(
    () => validateBookingAdjustment(reqExtra, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'unauthorizedField');
      return true;
    }
  );
});

test('validateConfirmPayment accepts optional note and trims whitespace', () => {
  const req = { body: { note: '  Đã trả tiền mặt đủ cho thợ  ' } };
  let called = false;
  validateConfirmPayment(req, {}, () => { called = true; });
  assert.strictEqual(called, true);
  assert.strictEqual(req.body.note, 'Đã trả tiền mặt đủ cho thợ');

  const reqEmpty = { body: {} };
  called = false;
  validateConfirmPayment(reqEmpty, {}, () => { called = true; });
  assert.strictEqual(called, true);
  assert.strictEqual(reqEmpty.body.note, undefined);
});

test('validateConfirmPayment rejects unrecognized fields and overly long note', () => {
  assert.throws(
    () => validateConfirmPayment({ body: { extraField: 123 } }, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'extraField');
      return true;
    }
  );

  assert.throws(
    () => validateConfirmPayment({ body: { note: 'a'.repeat(501) } }, {}, () => {}),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.details[0].field, 'note');
      return true;
    }
  );
});
