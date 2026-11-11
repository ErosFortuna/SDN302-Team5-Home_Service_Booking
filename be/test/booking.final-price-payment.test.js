const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const app = require('../src/app.js');
const User = require('../src/modules/users/user.model.js');
const {
  updateServiceStatus,
  adjustBookingByStaff,
  confirmCustomerPayment,
  MAX_FINAL_PRICE_RATIO,
} = require('../src/modules/bookings/booking.controller.js');
const { BOOKING_STATUS } = require('../src/modules/bookings/booking.status.js');
const { canUpdateBookingStatus, isOwningCustomer } = require('../src/modules/bookings/booking.middleware.js');
const BookingModel = require('../src/modules/bookings/booking.model.js');
const Notification = require('../src/modules/notifications/notification.model.js');
const { AppError } = require('../src/shared/app-error.js');

test('updateServiceStatus: rejects finalPrice exceeding 150% threshold with 422 for PROVIDER', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const agreedPrice = 200000;
  const maxAllowed = Math.round(agreedPrice * MAX_FINAL_PRICE_RATIO); // 300000
  const excessivePrice = maxAllowed + 1; // 300001

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.IN_PROGRESS,
    price: agreedPrice,
    provider: providerId,
    customer: customerId,
    paymentStatus: 'UNPAID',
    startedAt: new Date('2026-11-01T08:00:00Z'),
  };

  const req = {
    booking,
    user: { _id: providerId, role: 'PROVIDER' },
    body: {
      status: BOOKING_STATUS.COMPLETED,
      confirmCompletion: true,
      finalPrice: excessivePrice,
    },
  };

  await assert.rejects(
    async () => {
      await updateServiceStatus(req, {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 422);
      assert.ok(Array.isArray(err.details));
      const finalPriceErr = err.details.find((d) => d.field === 'finalPrice');
      assert.ok(finalPriceErr, 'Should have validation error on field finalPrice');
      assert.match(finalPriceErr.message, /finalPrice cannot exceed 150%/);
      return true;
    }
  );
});

test('updateServiceStatus: saves valid finalPrice and does NOT set paymentStatus to PAID upon completion', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const agreedPrice = 200000;
  const validFinalPrice = 250000; // <= 150% (300000)

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.IN_PROGRESS,
    price: agreedPrice,
    provider: providerId,
    customer: customerId,
    paymentStatus: 'UNPAID',
    startedAt: new Date('2026-11-01T08:00:00Z'),
  };

  const originals = {
    findOneAndUpdate: BookingModel.findOneAndUpdate,
    createNotification: Notification.create,
  };

  let updateArgs = null;
  BookingModel.findOneAndUpdate = (guard, ops) => {
    updateArgs = { guard, ops };
    const doc = {
      ...booking,
      ...ops.$set,
      toJSON: () => ({
        ...booking,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => doc,
    };
  };

  Notification.create = async (payload) => payload;

  try {
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
    };

    const req = {
      booking,
      user: { _id: providerId, role: 'PROVIDER' },
      body: {
        status: BOOKING_STATUS.COMPLETED,
        confirmCompletion: true,
        finalPrice: validFinalPrice,
        note: 'Completed all repair tasks successfully',
      },
    };

    await updateServiceStatus(req, res);

    assert.ok(responseData);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(updateArgs.ops.$set.status, BOOKING_STATUS.COMPLETED);
    assert.strictEqual(updateArgs.ops.$set.finalPrice, validFinalPrice);

    // CRITICAL: verify paymentStatus is NOT set to 'PAID' in $set; it becomes 'COD'
    assert.strictEqual(
      updateArgs.ops.$set.paymentStatus,
      'COD',
      'paymentStatus must be set to COD awaiting cash confirmation'
    );
    assert.notStrictEqual(updateArgs.ops.$set.paymentStatus, 'PAID');
    assert.strictEqual(responseData.data.paymentStatus, 'COD');
  } finally {
    BookingModel.findOneAndUpdate = originals.findOneAndUpdate;
    Notification.create = originals.createNotification;
  }
});

test('updateServiceStatus: permits STAFF/ADMIN to set finalPrice beyond 150%', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const agreedPrice = 200000;
  const adminFinalPrice = 500000; // 250% of agreed price

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.IN_PROGRESS,
    price: agreedPrice,
    provider: providerId,
    customer: customerId,
    paymentStatus: 'UNPAID',
    startedAt: new Date('2026-11-01T08:00:00Z'),
  };

  const originals = {
    findOneAndUpdate: BookingModel.findOneAndUpdate,
    createNotification: Notification.create,
  };

  let updateArgs = null;
  BookingModel.findOneAndUpdate = (guard, ops) => {
    updateArgs = { guard, ops };
    const doc = {
      ...booking,
      ...ops.$set,
      toJSON: () => ({
        ...booking,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => doc,
    };
  };

  Notification.create = async (payload) => payload;

  try {
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
    };

    const req = {
      booking,
      user: { _id: adminId, role: 'ADMIN' },
      body: {
        status: BOOKING_STATUS.COMPLETED,
        confirmCompletion: true,
        finalPrice: adminFinalPrice,
        note: 'Admin approved special surcharge',
      },
    };

    await updateServiceStatus(req, res);

    assert.ok(responseData);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(updateArgs.ops.$set.finalPrice, adminFinalPrice);
    assert.strictEqual(updateArgs.ops.$set.paymentStatus, 'COD');
  } finally {
    BookingModel.findOneAndUpdate = originals.findOneAndUpdate;
    Notification.create = originals.createNotification;
  }
});

test('adjustBookingByStaff: STAFF/ADMIN can adjust finalPrice and paymentStatus with audit trail', async () => {
  const staffId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.COMPLETED,
    price: 200000,
    finalPrice: 200000,
    provider: providerId,
    customer: customerId,
    paymentStatus: 'UNPAID',
  };

  const originals = {
    findByIdAndUpdate: BookingModel.findByIdAndUpdate,
  };

  let updateArgs = null;
  BookingModel.findByIdAndUpdate = (id, ops) => {
    updateArgs = { id, ops };
    const doc = {
      ...booking,
      ...ops.$set,
      toJSON: () => ({
        ...booking,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => doc,
    };
  };

  try {
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
    };

    const req = {
      booking,
      user: { _id: staffId, role: 'STAFF' },
      body: {
        finalPrice: 350000,
        paymentStatus: 'PAID',
        note: 'Customer confirmed cash payment in full',
      },
    };

    await adjustBookingByStaff(req, res);

    assert.ok(responseData);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(updateArgs.ops.$set.finalPrice, 350000);
    assert.strictEqual(updateArgs.ops.$set.paymentStatus, 'PAID');
    assert.strictEqual(updateArgs.ops.$push.statusHistory.note, 'Customer confirmed cash payment in full');
    assert.strictEqual(updateArgs.ops.$push.statusHistory.changedBy, staffId);
  } finally {
    BookingModel.findByIdAndUpdate = originals.findByIdAndUpdate;
  }
});

test('canUpdateBookingStatus: allows assigned provider and staff/admin, rejects others', () => {
  const providerId = new mongoose.Types.ObjectId();
  const otherProviderId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const booking = {
    _id: new mongoose.Types.ObjectId(),
    provider: providerId,
    customer: customerId,
  };

  // Assigned provider -> allowed
  let called = false;
  canUpdateBookingStatus(
    { user: { _id: providerId, role: 'PROVIDER' }, booking },
    {},
    () => { called = true; }
  );
  assert.strictEqual(called, true);

  // STAFF -> allowed
  called = false;
  canUpdateBookingStatus(
    { user: { _id: staffId, role: 'STAFF' }, booking },
    {},
    () => { called = true; }
  );
  assert.strictEqual(called, true);

  // ADMIN -> allowed
  called = false;
  canUpdateBookingStatus(
    { user: { _id: staffId, role: 'ADMIN' }, booking },
    {},
    () => { called = true; }
  );
  assert.strictEqual(called, true);

  // Unassigned provider -> 403
  assert.throws(
    () => {
      canUpdateBookingStatus(
        { user: { _id: otherProviderId, role: 'PROVIDER' }, booking },
        {},
        () => {}
      );
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /not the provider assigned/);
      return true;
    }
  );

  // CUSTOMER -> 403
  assert.throws(
    () => {
      canUpdateBookingStatus(
        { user: { _id: customerId, role: 'CUSTOMER' }, booking },
        {},
        () => {}
      );
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /permission to update this booking/);
      return true;
    }
  );
});

test('HTTP integration: PATCH /api/bookings/:id/status rejects excessive finalPrice with 422 and allows valid completion without PAID paymentStatus', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const providerToken = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '5m' });

  const bookingDoc = {
    _id: bookingId,
    status: BOOKING_STATUS.IN_PROGRESS,
    price: 200000,
    provider: providerId,
    customer: customerId,
    paymentStatus: 'UNPAID',
    startedAt: new Date('2026-11-01T08:00:00Z'),
    toJSON() {
      return {
        _id: bookingId,
        status: this.status,
        price: this.price,
        finalPrice: this.finalPrice,
        paymentStatus: this.paymentStatus,
        provider: this.provider,
        customer: this.customer,
      };
    },
  };

  const originals = {
    findById: BookingModel.findById,
    findOneAndUpdate: BookingModel.findOneAndUpdate,
    findUserById: User.findById,
    createNotification: Notification.create,
  };

  // Mock User.findById for protect middleware
  User.findById = (id) => ({
    select: async () => {
      if (id.toString() === providerId.toString()) {
        return { _id: providerId, role: 'PROVIDER', status: 'ACTIVE' };
      }
      return null;
    },
  });

  BookingModel.findById = async (id) => {
    if (id.toString() === bookingId.toString()) return bookingDoc;
    return null;
  };

  let lastUpdateOps = null;
  BookingModel.findOneAndUpdate = (guard, ops) => {
    lastUpdateOps = ops;
    const updated = {
      ...bookingDoc,
      ...ops.$set,
      toJSON: () => ({
        ...bookingDoc,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => updated,
    };
  };

  Notification.create = async (payload) => payload;

  try {
    // 1. PROVIDER attempts finalPrice = 350000 (> 150% of 200000) -> 422
    const resExcessive = await dispatch(app, {
      method: 'PATCH',
      url: `/api/bookings/${bookingId}/status`,
      headers: {
        authorization: `Bearer ${providerToken}`,
        'content-type': 'application/json',
      },
      body: {
        status: BOOKING_STATUS.COMPLETED,
        confirmCompletion: true,
        finalPrice: 350000,
      },
    });

    assert.strictEqual(resExcessive.status, 422, 'Excessive finalPrice must return 422');
    assert.strictEqual(resExcessive.body.success, false);
    const details = resExcessive.body.details || resExcessive.body.errors;
    assert.ok(Array.isArray(details));
    assert.ok(details.some((d) => d.field === 'finalPrice'));

    // 2. PROVIDER submits valid finalPrice = 250000 (<= 150%) -> 200
    const resValid = await dispatch(app, {
      method: 'PATCH',
      url: `/api/bookings/${bookingId}/status`,
      headers: {
        authorization: `Bearer ${providerToken}`,
        'content-type': 'application/json',
      },
      body: {
        status: BOOKING_STATUS.COMPLETED,
        confirmCompletion: true,
        finalPrice: 250000,
      },
    });

    assert.strictEqual(resValid.status, 200, 'Valid finalPrice must return 200');
    assert.strictEqual(resValid.body.success, true);
    assert.strictEqual(resValid.body.data.finalPrice, 250000);
    // Verify paymentStatus was changed to COD (awaiting customer confirmation), NOT PAID
    assert.strictEqual(lastUpdateOps.$set.paymentStatus, 'COD');
    assert.strictEqual(resValid.body.data.paymentStatus, 'COD');
  } finally {
    BookingModel.findById = originals.findById;
    BookingModel.findOneAndUpdate = originals.findOneAndUpdate;
    User.findById = originals.findUserById;
    Notification.create = originals.createNotification;
  }
});

test('HTTP integration: PATCH /api/bookings/:id/adjust permits ADMIN and blocks PROVIDER', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const adminToken = jwt.sign({ sub: adminId.toString() }, env.jwtSecret, { expiresIn: '5m' });
  const providerToken = jwt.sign({ sub: providerId.toString() }, env.jwtSecret, { expiresIn: '5m' });

  const bookingDoc = {
    _id: bookingId,
    status: BOOKING_STATUS.COMPLETED,
    price: 200000,
    finalPrice: 200000,
    provider: providerId,
    paymentStatus: 'UNPAID',
    toJSON() {
      return {
        _id: bookingId,
        status: this.status,
        price: this.price,
        finalPrice: this.finalPrice,
        paymentStatus: this.paymentStatus,
      };
    },
  };

  const originals = {
    findById: BookingModel.findById,
    findByIdAndUpdate: BookingModel.findByIdAndUpdate,
    findUserById: User.findById,
  };

  User.findById = (id) => ({
    select: async () => {
      if (id.toString() === adminId.toString()) {
        return { _id: adminId, role: 'ADMIN', status: 'ACTIVE' };
      }
      if (id.toString() === providerId.toString()) {
        return { _id: providerId, role: 'PROVIDER', status: 'ACTIVE' };
      }
      return null;
    },
  });

  BookingModel.findById = async (id) => {
    if (id.toString() === bookingId.toString()) return bookingDoc;
    return null;
  };

  let adjustedOps = null;
  BookingModel.findByIdAndUpdate = (id, ops) => {
    adjustedOps = ops;
    const updated = {
      ...bookingDoc,
      ...ops.$set,
      toJSON: () => ({
        ...bookingDoc,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => updated,
    };
  };

  try {
    // 1. PROVIDER calling /adjust is rejected with 403 Forbidden
    const resProvider = await dispatch(app, {
      method: 'PATCH',
      url: `/api/bookings/${bookingId}/adjust`,
      headers: {
        authorization: `Bearer ${providerToken}`,
        'content-type': 'application/json',
      },
      body: { finalPrice: 400000 },
    });
    assert.strictEqual(resProvider.status, 403, 'Provider cannot call /adjust');

    // 2. ADMIN calling /adjust succeeds (even with finalPrice > 150%)
    const resAdmin = await dispatch(app, {
      method: 'PATCH',
      url: `/api/bookings/${bookingId}/adjust`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: {
        finalPrice: 450000,
        paymentStatus: 'PAID',
        note: 'Customer settled in cash',
      },
    });

    assert.strictEqual(resAdmin.status, 200, 'Admin calling /adjust must return 200');
    assert.strictEqual(resAdmin.body.success, true);
    assert.strictEqual(resAdmin.body.data.finalPrice, 450000);
    assert.strictEqual(resAdmin.body.data.paymentStatus, 'PAID');
    assert.strictEqual(adjustedOps.$set.finalPrice, 450000);
    assert.strictEqual(adjustedOps.$set.paymentStatus, 'PAID');
  } finally {
    BookingModel.findById = originals.findById;
    BookingModel.findByIdAndUpdate = originals.findByIdAndUpdate;
    User.findById = originals.findUserById;
  }
});

test('isOwningCustomer: allows owning customer, rejects other customers and roles', () => {
  const customerId = new mongoose.Types.ObjectId();
  const otherCustomerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();

  const booking = {
    _id: new mongoose.Types.ObjectId(),
    customer: customerId,
    provider: providerId,
  };

  // 1. Owning customer -> allowed
  let called = false;
  isOwningCustomer(
    { user: { _id: customerId, role: 'CUSTOMER' }, booking },
    {},
    () => { called = true; }
  );
  assert.strictEqual(called, true);

  // 2. Different customer -> 403
  assert.throws(
    () => {
      isOwningCustomer(
        { user: { _id: otherCustomerId, role: 'CUSTOMER' }, booking },
        {},
        () => {}
      );
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /không phải là khách hàng của đơn đặt này/);
      return true;
    }
  );

  // 3. Provider -> 403
  assert.throws(
    () => {
      isOwningCustomer(
        { user: { _id: providerId, role: 'PROVIDER' }, booking },
        {},
        () => {}
      );
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 403);
      assert.match(err.message, /Chỉ khách hàng mới có quyền/);
      return true;
    }
  );
});

test('confirmCustomerPayment: customer confirms cash payment, sets PAID and creates notification', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const booking = {
    _id: bookingId,
    status: BOOKING_STATUS.COMPLETED,
    price: 200000,
    finalPrice: 220000,
    paymentStatus: 'COD',
    customer: customerId,
    provider: providerId,
  };

  const originals = {
    findByIdAndUpdate: BookingModel.findByIdAndUpdate,
    createNotification: Notification.create,
  };

  let updatedOps = null;
  let notificationSent = null;

  BookingModel.findByIdAndUpdate = (id, ops) => {
    updatedOps = ops;
    const doc = {
      ...booking,
      ...ops.$set,
      toJSON: () => ({
        ...booking,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => doc,
    };
  };

  Notification.create = async (payload) => {
    notificationSent = payload;
    return payload;
  };

  try {
    let jsonResult = null;
    const res = {
      json: (d) => { jsonResult = d; },
    };

    // 1. Successful confirmation on COMPLETED booking
    await confirmCustomerPayment(
      {
        booking,
        user: { _id: customerId, role: 'CUSTOMER' },
        body: { note: 'Đã đưa tiền mặt cho thợ' },
      },
      res
    );

    assert.ok(jsonResult);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(updatedOps.$set.paymentStatus, 'PAID');
    assert.strictEqual(jsonResult.data.paymentStatus, 'PAID');
    assert.strictEqual(notificationSent.recipient, providerId);
    assert.strictEqual(notificationSent.type, 'BOOKING_PAYMENT_CONFIRMED');
    assert.ok(Notification.NOTIFICATION_TYPES.includes(notificationSent.type));

    // 2. Reject if booking is NOT yet COMPLETED
    const inProgressBooking = { ...booking, status: BOOKING_STATUS.IN_PROGRESS };
    await assert.rejects(
      async () => {
        await confirmCustomerPayment(
          {
            booking: inProgressBooking,
            user: { _id: customerId, role: 'CUSTOMER' },
            body: {},
          },
          res
        );
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 422);
        assert.match(err.message, /Chỉ có thể xác nhận thanh toán khi dịch vụ đã hoàn thành/);
        return true;
      }
    );

    // 3. Idempotent if already PAID
    const alreadyPaidBooking = { ...booking, paymentStatus: 'PAID', toJSON: () => booking };
    let idempotentResult = null;
    await confirmCustomerPayment(
      {
        booking: alreadyPaidBooking,
        user: { _id: customerId, role: 'CUSTOMER' },
        body: {},
      },
      { json: (d) => { idempotentResult = d; } }
    );
    assert.strictEqual(idempotentResult.success, true);
    assert.match(idempotentResult.message, /trước đó/);
  } finally {
    BookingModel.findByIdAndUpdate = originals.findByIdAndUpdate;
    Notification.create = originals.createNotification;
  }
});

test('HTTP integration: POST /api/bookings/:id/confirm-payment allows owning customer and rejects others', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const otherCustomerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const customerToken = jwt.sign({ sub: customerId.toString() }, env.jwtSecret, { expiresIn: '5m' });
  const otherCustomerToken = jwt.sign({ sub: otherCustomerId.toString() }, env.jwtSecret, { expiresIn: '5m' });

  const bookingDoc = {
    _id: bookingId,
    status: BOOKING_STATUS.COMPLETED,
    price: 200000,
    finalPrice: 200000,
    paymentStatus: 'COD',
    customer: customerId,
    provider: providerId,
    toJSON() {
      return {
        _id: bookingId,
        status: this.status,
        price: this.price,
        finalPrice: this.finalPrice,
        paymentStatus: this.paymentStatus,
        customer: this.customer,
        provider: this.provider,
      };
    },
  };

  const originals = {
    findById: BookingModel.findById,
    findByIdAndUpdate: BookingModel.findByIdAndUpdate,
    findUserById: User.findById,
    createNotification: Notification.create,
  };

  User.findById = (id) => ({
    select: async () => {
      if (id.toString() === customerId.toString()) {
        return { _id: customerId, role: 'CUSTOMER', status: 'ACTIVE' };
      }
      if (id.toString() === otherCustomerId.toString()) {
        return { _id: otherCustomerId, role: 'CUSTOMER', status: 'ACTIVE' };
      }
      return null;
    },
  });

  BookingModel.findById = async (id) => {
    if (id.toString() === bookingId.toString()) return bookingDoc;
    return null;
  };

  let updateCalledOps = null;
  BookingModel.findByIdAndUpdate = (id, ops) => {
    updateCalledOps = ops;
    const doc = {
      ...bookingDoc,
      ...ops.$set,
      toJSON: () => ({
        ...bookingDoc,
        ...ops.$set,
      }),
    };
    return {
      populate: async () => doc,
    };
  };

  Notification.create = async (payload) => payload;

  try {
    // 1. Different customer cannot confirm payment -> 403
    const resOther = await dispatch(app, {
      method: 'POST',
      url: `/api/bookings/${bookingId}/confirm-payment`,
      headers: {
        authorization: `Bearer ${otherCustomerToken}`,
        'content-type': 'application/json',
      },
      body: {},
    });
    assert.strictEqual(resOther.status, 403, 'Different customer must get 403');

    // 2. Owning customer confirms payment -> 200
    const resOwner = await dispatch(app, {
      method: 'POST',
      url: `/api/bookings/${bookingId}/confirm-payment`,
      headers: {
        authorization: `Bearer ${customerToken}`,
        'content-type': 'application/json',
      },
      body: { note: 'Xác nhận đã thanh toán tiền mặt' },
    });

    assert.strictEqual(resOwner.status, 200, 'Owning customer gets 200');
    assert.strictEqual(resOwner.body.success, true);
    assert.strictEqual(resOwner.body.data.paymentStatus, 'PAID');
    assert.strictEqual(updateCalledOps.$set.paymentStatus, 'PAID');
  } finally {
    BookingModel.findById = originals.findById;
    BookingModel.findByIdAndUpdate = originals.findByIdAndUpdate;
    User.findById = originals.findUserById;
    Notification.create = originals.createNotification;
  }
});
