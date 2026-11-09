const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  ACTIVE_BOOKING_STATUSES,
  DECLINE_REASON,
} = require('../src/modules/bookings/booking.status.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const {
  INDEX_NAME,
  INDEX_SPEC,
  findActiveDuplicateBookings,
  runIndexMigration,
} = require('../scripts/migrate-create-booking-indexes.js');

test('V-12 Status Verification: Valid booking statuses vs cleanup/decline reasons', () => {
  // 1. Terminal / cleanup statuses in booking.status.js
  assert.ok(BOOKING_STATUS.CANCELLED === 'CANCELLED', 'CANCELLED must exist in BOOKING_STATUS');
  assert.ok(BOOKING_STATUS.COMPLETED === 'COMPLETED', 'COMPLETED must exist in BOOKING_STATUS');
  assert.ok(BOOKING_STATUS.NO_SHOW === 'NO_SHOW', 'NO_SHOW must exist in BOOKING_STATUS');

  // 2. Active statuses covered by partial unique index
  const expectedActive = [
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'PROVIDER_ON_THE_WAY',
    'ARRIVED',
    'IN_PROGRESS',
    'AWAITING_APPROVAL',
  ];
  assert.deepEqual([...ACTIVE_BOOKING_STATUSES], expectedActive);

  // 3. Confirm DECLINED and EXPIRED are NOT standalone booking statuses
  assert.equal(BOOKING_STATUS.DECLINED, undefined, 'DECLINED must not exist as a BOOKING_STATUS');
  assert.equal(BOOKING_STATUS.EXPIRED, undefined, 'EXPIRED must not exist as a BOOKING_STATUS');
  assert.ok(!BOOKING_STATUS_VALUES.includes('DECLINED'), 'DECLINED is not a valid enum value');
  assert.ok(!BOOKING_STATUS_VALUES.includes('EXPIRED'), 'EXPIRED is not a valid enum value');

  // 4. DECLINE_REASON contains decline reasons instead
  assert.ok(DECLINE_REASON.BUSY === 'BUSY');
  assert.ok(DECLINE_REASON.NO_RESPONSE === 'NO_RESPONSE');

  // 5. Booking schema validation enforces BOOKING_STATUS_VALUES
  const invalidDeclined = new Booking({
    customer: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    scheduledStartAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 3600000),
    price: 100000,
    address: '123 Street',
    status: 'DECLINED',
  });
  const errDeclined = invalidDeclined.validateSync();
  assert.ok(errDeclined, 'Setting status: DECLINED must fail schema validation');
  assert.ok(errDeclined.errors.status, 'status error must be flagged for DECLINED');

  const invalidExpired = new Booking({
    customer: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    scheduledStartAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 3600000),
    price: 100000,
    address: '123 Street',
    status: 'EXPIRED',
  });
  const errExpired = invalidExpired.validateSync();
  assert.ok(errExpired, 'Setting status: EXPIRED must fail schema validation');
  assert.ok(errExpired.errors.status, 'status error must be flagged for EXPIRED');

  // Valid cleanup status CANCELLED passes status validation
  const validCancelled = new Booking({
    request: new mongoose.Types.ObjectId(),
    customer: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    scheduledStartAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 3600000),
    price: 100000,
    address: '123 Street',
    status: 'CANCELLED',
  });
  const errCancelled = validCancelled.validateSync();
  assert.equal(errCancelled, undefined, 'Setting status: CANCELLED must be valid');
});

test('V-12 Migration Script: when --apply is run with active duplicates, it aborts without creating index', async () => {
  const providerId = new mongoose.Types.ObjectId().toString();
  const startTime = new Date('2026-12-01T10:00:00Z');

  let createIndexCalled = false;

  const mockDb = {
    collection: (name) => {
      assert.equal(name, 'bookings');
      return {
        aggregate: () => ({
          toArray: async () => [
            {
              _id: { provider: providerId, scheduledStartAt: startTime },
              count: 2,
              bookingIds: ['booking-1', 'booking-2'],
              statuses: ['PENDING_CONFIRMATION', 'CONFIRMED'],
              customers: ['cust-1', 'cust-2'],
              createdAts: [new Date(), new Date()],
            },
          ],
        }),
        indexes: async () => [],
        createIndex: async () => {
          createIndexCalled = true;
          return INDEX_NAME;
        },
      };
    },
  };

  const result = await runIndexMigration({
    isApply: true,
    exitProcess: false,
    db: mockDb,
  });

  assert.equal(result.success, false);
  assert.equal(result.reason, 'DUPLICATES_FOUND');
  assert.equal(result.duplicates.length, 1);
  assert.equal(createIndexCalled, false, 'createIndex must NOT be called when duplicates exist');
});

test('V-12 Migration Script: when --apply is run with clean DB, it creates index successfully', async () => {
  let createdArgs = null;

  const mockDb = {
    collection: (name) => {
      assert.equal(name, 'bookings');
      return {
        aggregate: () => ({
          toArray: async () => [], // No duplicates
        }),
        indexes: async () => [], // Target index does not exist yet
        createIndex: async (spec, options) => {
          createdArgs = { spec, options };
          return INDEX_NAME;
        },
      };
    },
  };

  const result = await runIndexMigration({
    isApply: true,
    exitProcess: false,
    db: mockDb,
  });

  assert.equal(result.success, true);
  assert.equal(result.created, true);
  assert.ok(createdArgs, 'createIndex should be called');
  assert.deepEqual(createdArgs.spec, INDEX_SPEC);
  assert.equal(createdArgs.options.unique, true);
  assert.equal(createdArgs.options.name, INDEX_NAME);
  assert.deepEqual(createdArgs.options.partialFilterExpression.status.$in, [...ACTIVE_BOOKING_STATUSES]);
});

test('V-12 Migration Script: when target index already exists in --apply mode, it does not re-create', async () => {
  let createIndexCalled = false;

  const mockDb = {
    collection: (name) => {
      assert.equal(name, 'bookings');
      return {
        aggregate: () => ({
          toArray: async () => [], // Clean DB
        }),
        indexes: async () => [
          { name: INDEX_NAME, key: { provider: 1, scheduledStartAt: 1 }, unique: true },
        ],
        createIndex: async () => {
          createIndexCalled = true;
          return INDEX_NAME;
        },
      };
    },
  };

  const result = await runIndexMigration({
    isApply: true,
    exitProcess: false,
    db: mockDb,
  });

  assert.equal(result.success, true);
  assert.equal(result.created, false);
  assert.equal(createIndexCalled, false, 'createIndex should not be called if index already exists');
});
