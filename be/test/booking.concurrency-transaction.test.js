const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { env } = require('../src/config/env.js');
const { AppError } = require('../src/shared/app-error.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Notification = require('../src/modules/notifications/notification.model.js');
const { BOOKING_STATUS } = require('../src/modules/bookings/booking.status.js');
const {
  selectProvider,
  rescheduleCustomerBooking,
} = require('../src/modules/bookings/booking.controller.js');

test('Concurrency: Two concurrent selectProvider calls for the same provider at overlapping slot -> only one succeeds (201), other fails (409)', async () => {
  const staffId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const customerId1 = new mongoose.Types.ObjectId();
  const customerId2 = new mongoose.Types.ObjectId();
  const requestId1 = new mongoose.Types.ObjectId();
  const requestId2 = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const scheduledStartAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const originals = {
    requestFindById: ServiceRequest.findById,
    requestFindOneAndUpdate: ServiceRequest.findOneAndUpdate,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    bookingCreate: Booking.create,
    notificationCreate: Notification.create,
    startSession: mongoose.startSession,
  };

  const requestsStore = {
    [requestId1.toString()]: {
      _id: requestId1,
      customer: customerId1,
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: scheduledStartAt,
      service: { _id: new mongoose.Types.ObjectId(), basePrice: 200000, estimatedDurationMinutes: 60 },
      address: { fullAddress: '123 Test St, TP.HCM' },
      declinedProviders: [],
    },
    [requestId2.toString()]: {
      _id: requestId2,
      customer: customerId2,
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: scheduledStartAt,
      service: { _id: new mongoose.Types.ObjectId(), basePrice: 200000, estimatedDurationMinutes: 60 },
      address: { fullAddress: '456 Test St, TP.HCM' },
      declinedProviders: [],
    },
  };

  const inMemoryBookings = [];

  ServiceRequest.findById = (id) => ({
    populate: async () => requestsStore[id.toString()] || null,
  });

  ServiceRequest.findOneAndUpdate = async (filter, update) => {
    const doc = requestsStore[filter._id.toString()];
    if (!doc || doc.status !== filter.status) return null;
    doc.status = update.$set.status;
    return doc;
  };

  User.findById = async (id) => {
    if (id.toString() === providerId.toString()) {
      return { _id: providerId, fullName: 'Nguyễn Thợ Giỏi', role: 'PROVIDER', status: 'ACTIVE' };
    }
    return null;
  };

  ProviderProfile.findOne = () => ({
    populate: async () => ({
      user: providerId,
      verificationStatus: 'VERIFIED',
      skills: [categoryId],
    }),
  });

  Availability.findOne = async () => null;

  // Overlap check queries in-memory booking store
  Booking.findOne = (filter) => {
    const query = {
      session: () => query,
      select: () => query,
      lean: async () => {
        return inMemoryBookings.find((b) => {
          if (b.provider.toString() !== filter.provider.toString()) return false;
          if (filter.status?.$nin?.includes(b.status)) return false;
          return b.scheduledStartAt < filter.scheduledStartAt.$lt && b.scheduledEndAt > filter.scheduledEndAt.$gt;
        }) || null;
      },
    };
    query.then = (resolve, reject) => query.lean().then(resolve, reject);
    return query;
  };

  Booking.create = async (docs) => {
    for (const doc of docs) {
      // Simulate unique index check on (provider, scheduledStartAt)
      const duplicate = inMemoryBookings.find(
        (b) =>
          b.provider.toString() === doc.provider.toString() &&
          b.scheduledStartAt.getTime() === doc.scheduledStartAt.getTime() &&
          b.status !== 'CANCELLED'
      );
      if (duplicate) {
        const err = new Error('E11000 duplicate key error');
        err.code = 11000;
        err.keyValue = { provider: doc.provider, scheduledStartAt: doc.scheduledStartAt };
        throw err;
      }
      const created = {
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        toJSON: () => doc,
        populate: async () => created,
      };
      inMemoryBookings.push(created);
      return [created];
    }
  };

  Notification.create = async (payload) => payload;

  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  });

  try {
    const makeReqRes = (requestId) => {
      let statusCode = null;
      let responseData = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
        },
      };
      const req = {
        params: { requestId: requestId.toString() },
        body: { providerId: providerId.toString() },
        user: { _id: staffId, role: 'STAFF', fullName: 'Staff Điều Phối' },
      };
      return { req, res, getStatus: () => statusCode, getData: () => responseData };
    };

    const call1 = makeReqRes(requestId1);
    const call2 = makeReqRes(requestId2);

    const results = await Promise.allSettled([
      selectProvider(call1.req, call1.res),
      selectProvider(call2.req, call2.res),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(rejected.length, 1, 'Exactly one concurrent request must fail');

    const failedError = rejected[0].reason;
    assert.ok(failedError instanceof AppError, 'Failed request must throw AppError');
    assert.strictEqual(failedError.statusCode, 409, 'Failed request must return 409 Conflict');
    assert.match(failedError.message, /lịch trong khung giờ|lịch hẹn khác/, 'Error message must explain the schedule conflict');
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    Booking.create = originals.bookingCreate;
    Notification.create = originals.notificationCreate;
    mongoose.startSession = originals.startSession;
  }
});

test('selectProvider handles E11000 duplicate key error and aborts transaction with 409', async () => {
  const staffId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
    requestFindOneAndUpdate: ServiceRequest.findOneAndUpdate,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    bookingCreate: Booking.create,
    startSession: mongoose.startSession,
  };

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: new mongoose.Types.ObjectId(),
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: new Date(Date.now() + 86400000),
      service: { basePrice: 100000, estimatedDurationMinutes: 60 },
      declinedProviders: [],
    }),
  });
  ServiceRequest.findOneAndUpdate = async () => ({ _id: requestId, status: 'BOOKED' });
  User.findById = async () => ({ _id: providerId, fullName: 'Thợ', role: 'PROVIDER', status: 'ACTIVE' });
  ProviderProfile.findOne = () => ({
    populate: async () => ({ user: providerId, verificationStatus: 'VERIFIED', skills: [categoryId] }),
  });
  Availability.findOne = async () => null;
  Booking.findOne = () => ({
    session: function() { return this; },
    then: (resolve) => resolve(null),
  });

  // Booking.create throws E11000
  Booking.create = async () => {
    const err = new Error('E11000 duplicate key error collection: bookings index: provider_1_scheduledStartAt_1');
    err.code = 11000;
    err.keyValue = { provider: providerId, scheduledStartAt: new Date() };
    throw err;
  };

  let aborted = false;
  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {
      aborted = true;
    },
    endSession: () => {},
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: staffId, role: 'STAFF' },
    };

    await assert.rejects(
      async () => selectProvider(req, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /Thợ đã có lịch hẹn khác vào thời điểm này/);
        return true;
      }
    );
    assert.strictEqual(aborted, true, 'Transaction must be aborted on E11000');
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    Booking.create = originals.bookingCreate;
    mongoose.startSession = originals.startSession;
  }
});

test('rescheduleCustomerBooking handles E11000 duplicate key error and returns 409', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Booking.findOne,
    findOneAndUpdate: Booking.findOneAndUpdate,
  };

  const oldStart = new Date(Date.now() + 3600000);
  const newStart = new Date(Date.now() + 7200000);

  let aborted = false;
  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {
      aborted = true;
    },
    endSession: () => {},
  });

  Booking.findOne = () => ({
    session: function() { return this; },
    select: function() { return this; },
    lean: async () => null,
  });

  Booking.findOneAndUpdate = async () => {
    const err = new Error('E11000 duplicate key');
    err.code = 11000;
    throw err;
  };

  try {
    await assert.rejects(
      async () =>
        rescheduleCustomerBooking(
          {
            booking: {
              _id: 'booking-1',
              customer: 'cust-1',
              provider: 'prov-1',
              status: 'CONFIRMED',
              scheduledStartAt: oldStart,
              scheduledEndAt: new Date(oldStart.getTime() + 3600000),
            },
            user: { _id: 'cust-1', role: 'CUSTOMER' },
            body: { scheduledStartAt: newStart },
          },
          {}
        ),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /Thợ đã có lịch hẹn khác vào thời điểm này/);
        return true;
      }
    );
    assert.strictEqual(aborted, true, 'Transaction must be aborted on E11000 in reschedule');
  } finally {
    mongoose.startSession = originals.startSession;
    Booking.findOne = originals.findOne;
    Booking.findOneAndUpdate = originals.findOneAndUpdate;
  }
});

test('startSession failure in production mode (NODE_ENV=production) fails immediately with 503', async () => {
  const originalNodeEnv = env.nodeEnv;
  const originalStartSession = mongoose.startSession;

  env.nodeEnv = 'production';
  mongoose.startSession = async () => {
    throw new Error('Transaction numbers are only allowed on a replica set member or mongos');
  };

  try {
    const requestId = new mongoose.Types.ObjectId();
    const providerId = new mongoose.Types.ObjectId();
    const categoryId = new mongoose.Types.ObjectId();

    const originals = {
      requestFindById: ServiceRequest.findById,
      userFindById: User.findById,
      profileFindOne: ProviderProfile.findOne,
      availabilityFindOne: Availability.findOne,
    };

    ServiceRequest.findById = () => ({
      populate: async () => ({
        _id: requestId,
        customer: new mongoose.Types.ObjectId(),
        status: 'OPEN',
        category: categoryId,
        preferredStartAt: new Date(Date.now() + 86400000),
        service: { basePrice: 100000, estimatedDurationMinutes: 60 },
        declinedProviders: [],
      }),
    });
    User.findById = async () => ({ _id: providerId, fullName: 'Thợ', role: 'PROVIDER', status: 'ACTIVE' });
    ProviderProfile.findOne = () => ({
      populate: async () => ({ user: providerId, verificationStatus: 'VERIFIED', skills: [categoryId] }),
    });
    Availability.findOne = async () => null;

    try {
      await assert.rejects(
        async () =>
          selectProvider(
            {
              params: { requestId: requestId.toString() },
              body: { providerId: providerId.toString() },
              user: { _id: new mongoose.Types.ObjectId(), role: 'STAFF' },
            },
            {}
          ),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 503, 'Must return 503 Service Unavailable in production');
          assert.match(err.message, /không thể khởi tạo transaction|không khả dụng/);
          return true;
        }
      );
    } finally {
      ServiceRequest.findById = originals.requestFindById;
      User.findById = originals.userFindById;
      ProviderProfile.findOne = originals.profileFindOne;
      Availability.findOne = originals.availabilityFindOne;
    }
  } finally {
    env.nodeEnv = originalNodeEnv;
    mongoose.startSession = originalStartSession;
  }
});

test('startSession failure in development mode without ALLOW_NO_TRANSACTION returns 503', async () => {
  const originalNodeEnv = env.nodeEnv;
  const originalAllowNoTx = env.allowNoTransaction;
  const originalStartSession = mongoose.startSession;

  env.nodeEnv = 'development';
  env.allowNoTransaction = false;

  mongoose.startSession = async () => {
    throw new Error('Standalone mongod: replica set not initialized');
  };

  try {
    const requestId = new mongoose.Types.ObjectId();
    const providerId = new mongoose.Types.ObjectId();
    const categoryId = new mongoose.Types.ObjectId();

    const originals = {
      requestFindById: ServiceRequest.findById,
      userFindById: User.findById,
      profileFindOne: ProviderProfile.findOne,
      availabilityFindOne: Availability.findOne,
    };

    ServiceRequest.findById = () => ({
      populate: async () => ({
        _id: requestId,
        customer: new mongoose.Types.ObjectId(),
        status: 'OPEN',
        category: categoryId,
        preferredStartAt: new Date(Date.now() + 86400000),
        service: { basePrice: 100000, estimatedDurationMinutes: 60 },
        declinedProviders: [],
      }),
    });
    User.findById = async () => ({ _id: providerId, fullName: 'Thợ', role: 'PROVIDER', status: 'ACTIVE' });
    ProviderProfile.findOne = () => ({
      populate: async () => ({ user: providerId, verificationStatus: 'VERIFIED', skills: [categoryId] }),
    });
    Availability.findOne = async () => null;

    try {
      await assert.rejects(
        async () =>
          selectProvider(
            {
              params: { requestId: requestId.toString() },
              body: { providerId: providerId.toString() },
              user: { _id: new mongoose.Types.ObjectId(), role: 'STAFF' },
            },
            {}
          ),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 503, 'Must return 503 when ALLOW_NO_TRANSACTION is not set');
          assert.match(err.message, /ALLOW_NO_TRANSACTION=true/);
          return true;
        }
      );
    } finally {
      ServiceRequest.findById = originals.requestFindById;
      User.findById = originals.userFindById;
      ProviderProfile.findOne = originals.profileFindOne;
      Availability.findOne = originals.availabilityFindOne;
    }
  } finally {
    env.nodeEnv = originalNodeEnv;
    env.allowNoTransaction = originalAllowNoTx;
    mongoose.startSession = originalStartSession;
  }
});

test('startSession failure in development mode WITH ALLOW_NO_TRANSACTION=true logs warning and falls back', async () => {
  const originalNodeEnv = env.nodeEnv;
  const originalAllowNoTx = env.allowNoTransaction;
  const originalStartSession = mongoose.startSession;
  const originalConsoleWarn = console.warn;

  env.nodeEnv = 'development';
  env.allowNoTransaction = true;

  mongoose.startSession = async () => {
    throw new Error('Standalone mongod: replica set not initialized');
  };

  const warnings = [];
  console.warn = (...args) => {
    warnings.push(args.join(' '));
  };

  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
    requestFindOneAndUpdate: ServiceRequest.findOneAndUpdate,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    bookingCreate: Booking.create,
    notificationCreate: Notification.create,
  };

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: new mongoose.Types.ObjectId(),
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: new Date(Date.now() + 86400000),
      service: { basePrice: 100000, estimatedDurationMinutes: 60 },
      declinedProviders: [],
      address: { fullAddress: '123 Test St' },
    }),
  });
  ServiceRequest.findOneAndUpdate = async () => ({ _id: requestId, status: 'BOOKED' });
  User.findById = async () => ({ _id: providerId, fullName: 'Thợ Dev', role: 'PROVIDER', status: 'ACTIVE' });
  ProviderProfile.findOne = () => ({
    populate: async () => ({ user: providerId, verificationStatus: 'VERIFIED', skills: [categoryId] }),
  });
  Availability.findOne = async () => null;
  Booking.findOne = () => ({
    session: function() { return this; },
    then: (resolve) => resolve(null),
  });
  Booking.create = async (docs) => {
    return [
      {
        ...docs[0],
        _id: new mongoose.Types.ObjectId(),
        toJSON: () => docs[0],
        populate: async function() { return this; },
      },
    ];
  };
  Notification.create = async () => {};

  try {
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
      },
    };

    await selectProvider(
      {
        params: { requestId: requestId.toString() },
        body: { providerId: providerId.toString() },
        user: { _id: new mongoose.Types.ObjectId(), role: 'STAFF', fullName: 'Staff' },
      },
      res
    );

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.ok(warnings.some((w) => w.includes('ALLOW_NO_TRANSACTION=true')), 'Warning about ALLOW_NO_TRANSACTION must be logged');
  } finally {
    env.nodeEnv = originalNodeEnv;
    env.allowNoTransaction = originalAllowNoTx;
    mongoose.startSession = originalStartSession;
    console.warn = originalConsoleWarn;
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    Booking.create = originals.bookingCreate;
    Notification.create = originals.notificationCreate;
  }
});

test('Concurrency: Two concurrent requests with overlapping windows but DIFFERENT scheduledStartAt (soft-lock & retry) -> only one succeeds (201)', async () => {
  const staffId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const customerId1 = new mongoose.Types.ObjectId();
  const customerId2 = new mongoose.Types.ObjectId();
  const requestId1 = new mongoose.Types.ObjectId();
  const requestId2 = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  // Request 1: 09:00 - 10:00
  // Request 2: 09:30 - 10:30 (starts 30 mins later, DIFFERENT scheduledStartAt, but overlaps!)
  const baseTime = Date.now() + 24 * 60 * 60 * 1000;
  const startAt1 = new Date(baseTime);
  const startAt2 = new Date(baseTime + 30 * 60 * 1000);

  const originals = {
    requestFindById: ServiceRequest.findById,
    requestFindOneAndUpdate: ServiceRequest.findOneAndUpdate,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    profileFindOneAndUpdate: ProviderProfile.findOneAndUpdate,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    bookingCreate: Booking.create,
    notificationCreate: Notification.create,
    startSession: mongoose.startSession,
  };

  const requestsStore = {
    [requestId1.toString()]: {
      _id: requestId1,
      customer: customerId1,
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: startAt1,
      service: { _id: new mongoose.Types.ObjectId(), basePrice: 200000, estimatedDurationMinutes: 60 },
      address: { fullAddress: '123 Test St, TP.HCM' },
      declinedProviders: [],
    },
    [requestId2.toString()]: {
      _id: requestId2,
      customer: customerId2,
      status: 'OPEN',
      category: categoryId,
      preferredStartAt: startAt2,
      service: { _id: new mongoose.Types.ObjectId(), basePrice: 200000, estimatedDurationMinutes: 60 },
      address: { fullAddress: '456 Test St, TP.HCM' },
      declinedProviders: [],
    },
  };

  const inMemoryBookings = [];
  let providerLockedBy = null;
  let writeConflictCount = 0;

  ServiceRequest.findById = (id) => ({
    populate: async () => requestsStore[id.toString()] || null,
  });

  ServiceRequest.findOneAndUpdate = async (filter, update) => {
    const doc = requestsStore[filter._id.toString()];
    if (!doc || doc.status !== filter.status) return null;
    doc.status = update.$set.status;
    return doc;
  };

  User.findById = async (id) => {
    if (id.toString() === providerId.toString()) {
      return { _id: providerId, fullName: 'Nguyễn Thợ Giỏi', role: 'PROVIDER', status: 'ACTIVE' };
    }
    return null;
  };

  ProviderProfile.findOne = () => ({
    populate: async () => ({
      user: providerId,
      verificationStatus: 'VERIFIED',
      skills: [categoryId],
      bookingLockVersion: 0,
    }),
  });

  // Simulate MongoDB WiredTiger document-level lock on ProviderProfile
  ProviderProfile.findOneAndUpdate = async (filter, update, opts) => {
    const sessionId = opts?.session?.id;
    if (providerLockedBy && providerLockedBy !== sessionId) {
      writeConflictCount++;
      const err = new Error('WriteConflict: document locked by another transaction');
      err.code = 112;
      err.codeName = 'WriteConflict';
      err.hasErrorLabel = (label) => label === 'TransientTransactionError';
      throw err;
    }
    providerLockedBy = sessionId;
    return { user: providerId, bookingLockVersion: 1 };
  };

  Availability.findOne = async () => null;

  Booking.findOne = (filter) => {
    const query = {
      session: () => query,
      select: () => query,
      lean: async () => {
        return inMemoryBookings.find((b) => {
          if (b.provider.toString() !== filter.provider.toString()) return false;
          if (filter.status?.$nin?.includes(b.status)) return false;
          return b.scheduledStartAt < filter.scheduledStartAt.$lt && b.scheduledEndAt > filter.scheduledEndAt.$gt;
        }) || null;
      },
    };
    query.then = (resolve, reject) => query.lean().then(resolve, reject);
    return query;
  };

  Booking.create = async (docs) => {
    for (const doc of docs) {
      const created = {
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        toJSON: () => doc,
        populate: async () => created,
      };
      inMemoryBookings.push(created);
      return [created];
    }
  };

  Notification.create = async (payload) => payload;

  let sessionCounter = 0;
  mongoose.startSession = async () => {
    const sessionId = `session_${++sessionCounter}`;
    return {
      id: sessionId,
      startTransaction: () => {},
      commitTransaction: async () => {
        if (providerLockedBy === sessionId) {
          providerLockedBy = null;
        }
      },
      abortTransaction: async () => {
        if (providerLockedBy === sessionId) {
          providerLockedBy = null;
        }
      },
      endSession: () => {
        if (providerLockedBy === sessionId) {
          providerLockedBy = null;
        }
      },
    };
  };

  try {
    const makeReqRes = (requestId) => {
      let statusCode = null;
      let responseData = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
        },
      };
      const req = {
        params: { requestId: requestId.toString() },
        body: { providerId: providerId.toString() },
        user: { _id: staffId, role: 'STAFF', fullName: 'Staff Điều Phối' },
      };
      return { req, res, getStatus: () => statusCode, getData: () => responseData };
    };

    const call1 = makeReqRes(requestId1);
    const call2 = makeReqRes(requestId2);

    const results = await Promise.allSettled([
      selectProvider(call1.req, call1.res),
      selectProvider(call2.req, call2.res),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent overlapping request must succeed');
    assert.strictEqual(rejected.length, 1, 'The other concurrent request must fail');
    assert.ok(writeConflictCount >= 1, 'WriteConflict must have been triggered and handled');

    const failedError = rejected[0].reason;
    assert.ok(failedError instanceof AppError, 'Failed request must throw AppError');
    assert.strictEqual(failedError.statusCode, 409, 'Failed request must return 409 Conflict');
    assert.match(failedError.message, /lịch trong khung giờ|lịch hẹn khác|đặt lịch khác/, 'Must reject with conflict explanation');
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    ProviderProfile.findOneAndUpdate = originals.profileFindOneAndUpdate;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    Booking.create = originals.bookingCreate;
    Notification.create = originals.notificationCreate;
    mongoose.startSession = originals.startSession;
  }
});

