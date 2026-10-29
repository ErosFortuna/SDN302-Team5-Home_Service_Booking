const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKING_STATUS,
  DECLINE_REASON,
  assertProviderTransition,
} = require('../src/modules/bookings/booking.status.js');
const {
  validateConfirmBooking,
  validateDeclineBooking,
} = require('../src/modules/bookings/booking.validation.js');
const { AppError } = require('../src/shared/app-error.js');

test('assertProviderTransition permits PENDING_CONFIRMATION -> CONFIRMED via dedicated endpoint', () => {
  const booking = { status: BOOKING_STATUS.PENDING_CONFIRMATION, materials: [] };
  assert.doesNotThrow(() => {
    assertProviderTransition(booking, BOOKING_STATUS.CONFIRMED, { isDedicatedEndpoint: true });
  });
});

test('assertProviderTransition permits PENDING_CONFIRMATION -> CANCELLED with reasonCode', () => {
  const booking = { status: BOOKING_STATUS.PENDING_CONFIRMATION, materials: [] };
  assert.doesNotThrow(() => {
    assertProviderTransition(booking, BOOKING_STATUS.CANCELLED, {
      isDedicatedEndpoint: true,
      reasonCode: DECLINE_REASON.BUSY,
    });
  });
});

test('assertProviderTransition rejects decline from PENDING_CONFIRMATION if reasonCode is missing', () => {
  const booking = { status: BOOKING_STATUS.PENDING_CONFIRMATION, materials: [] };
  assert.throws(
    () => {
      assertProviderTransition(booking, BOOKING_STATUS.CANCELLED, { isDedicatedEndpoint: true });
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      assert.match(err.message, /reasonCode is required/);
      return true;
    }
  );
});

test('assertProviderTransition rejects transitions from PENDING_CONFIRMATION via generic status endpoint', () => {
  const booking = { status: BOOKING_STATUS.PENDING_CONFIRMATION, materials: [] };
  assert.throws(
    () => {
      assertProviderTransition(booking, BOOKING_STATUS.CONFIRMED, { isDedicatedEndpoint: false });
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      return true;
    }
  );
});

test('assertProviderTransition blocks generic status endpoint from jumping directly to CONFIRMED or CANCELLED', () => {
  const booking = { status: BOOKING_STATUS.IN_PROGRESS, materials: [] };
  assert.throws(
    () => {
      assertProviderTransition(booking, BOOKING_STATUS.CONFIRMED, { isDedicatedEndpoint: false });
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      return true;
    }
  );
});

test('assertProviderTransition detects duplicate transition as 409', () => {
  const booking = { status: BOOKING_STATUS.CONFIRMED, materials: [] };
  assert.throws(
    () => {
      assertProviderTransition(booking, BOOKING_STATUS.CONFIRMED, { isDedicatedEndpoint: true });
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 409);
      return true;
    }
  );
});

test('validateConfirmBooking rejects payload attempting to override protected fields', () => {
  const req = { body: { status: 'CONFIRMED', price: 999999 } };
  assert.throws(
    () => {
      validateConfirmBooking(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.length >= 2);
      return true;
    }
  );
});

test('validateDeclineBooking requires valid reasonCode', () => {
  const req = { body: { reasonCode: 'INVALID_CODE' } };
  assert.throws(
    () => {
      validateDeclineBooking(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      return true;
    }
  );
});

test('validateDeclineBooking requires note of at least 5 chars when reasonCode is OTHER', () => {
  const reqTooShort = { body: { reasonCode: 'OTHER', note: 'bad' } };
  assert.throws(
    () => {
      validateDeclineBooking(reqTooShort, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.details[0].message, /at least 5 characters/);
      return true;
    }
  );

  const reqValid = { body: { reasonCode: 'OTHER', note: 'Kẹt lịch đột xuất' } };
  let called = false;
  validateDeclineBooking(reqValid, {}, () => {
    called = true;
  });
  assert.strictEqual(called, true);
  assert.strictEqual(reqValid.body.reasonCode, 'OTHER');
  assert.strictEqual(reqValid.body.note, 'Kẹt lịch đột xuất');
});

test('validateDeclineBooking accepts standard reasonCode with or without optional note', () => {
  const reqWithoutNote = { body: { reasonCode: 'BUSY' } };
  let called = false;
  validateDeclineBooking(reqWithoutNote, {}, () => {
    called = true;
  });
  assert.strictEqual(called, true);
  assert.strictEqual(reqWithoutNote.body.reasonCode, 'BUSY');
  assert.strictEqual(reqWithoutNote.body.note, undefined);

  const reqWithNote = { body: { reasonCode: 'TOO_FAR', note: 'Ngoài bán kính phục vụ' } };
  called = false;
  validateDeclineBooking(reqWithNote, {}, () => {
    called = true;
  });
  assert.strictEqual(called, true);
  assert.strictEqual(reqWithNote.body.note, 'Ngoài bán kính phục vụ');
});

test('validateDeclineBooking rejects unrecognized extra fields', () => {
  const req = { body: { reasonCode: 'BUSY', maliciousField: true } };
  assert.throws(
    () => {
      validateDeclineBooking(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.details[0].message, /Unrecognized field/);
      return true;
    }
  );
});
