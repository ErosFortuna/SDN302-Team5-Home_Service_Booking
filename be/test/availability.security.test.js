const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

const User = require('../src/modules/users/user.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');

test('V-13 Security Fix: Availability public endpoints validation, read-only guarantees, and PII protection', async (t) => {
  const originalUserFindById = User.findById;
  const originalUserFindOne = User.findOne;
  const originalAvailabilityFindOne = Availability.findOne;
  const originalAvailabilityCreate = Availability.create;
  const originalBookingFind = Booking.find;

  t.after(() => {
    User.findById = originalUserFindById;
    User.findOne = originalUserFindOne;
    Availability.findOne = originalAvailabilityFindOne;
    Availability.create = originalAvailabilityCreate;
    Booking.find = originalBookingFind;
  });

  const activeProviderId = new mongoose.Types.ObjectId();
  const inactiveProviderId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const otherProviderId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const nonExistentId = new mongoose.Types.ObjectId();

  const makeToken = (id, role = 'PROVIDER', tokenVersion = 0) =>
    jwt.sign({ sub: id.toString(), role, tokenVersion }, env.jwtSecret, { expiresIn: '10m' });

  const tokens = {
    activeProvider: makeToken(activeProviderId, 'PROVIDER'),
    otherProvider: makeToken(otherProviderId, 'PROVIDER'),
    customer: makeToken(customerId, 'CUSTOMER'),
    staff: makeToken(staffId, 'STAFF'),
    admin: makeToken(adminId, 'ADMIN'),
  };

  const usersMap = new Map([
    [
      activeProviderId.toString(),
      { _id: activeProviderId, role: 'PROVIDER', status: 'ACTIVE', tokenVersion: 0 },
    ],
    [
      inactiveProviderId.toString(),
      { _id: inactiveProviderId, role: 'PROVIDER', status: 'INACTIVE', tokenVersion: 0 },
    ],
    [
      customerId.toString(),
      { _id: customerId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 0 },
    ],
    [
      otherProviderId.toString(),
      { _id: otherProviderId, role: 'PROVIDER', status: 'ACTIVE', tokenVersion: 0 },
    ],
    [
      staffId.toString(),
      { _id: staffId, role: 'STAFF', status: 'ACTIVE', tokenVersion: 0 },
    ],
    [
      adminId.toString(),
      { _id: adminId, role: 'ADMIN', status: 'ACTIVE', tokenVersion: 0 },
    ],
  ]);

  User.findById = (id) => {
    const idStr = id?.toString();
    const user = usersMap.get(idStr);
    const chain = {
      select: () => chain,
      lean: () => Promise.resolve(user ? { ...user } : null),
      then: (resolve, reject) => Promise.resolve(user ? { ...user } : null).then(resolve, reject),
    };
    return chain;
  };

  User.findOne = (query) => {
    let result = null;
    const queryId = (query._id?.toString && query._id.toString()) || String(query._id);
    for (const u of usersMap.values()) {
      if (query._id && queryId !== u._id.toString()) continue;
      if (query.role && query.role !== u.role) continue;
      if (query.status && query.status !== u.status) continue;
      result = u;
      break;
    }
    const chain = {
      select: () => chain,
      lean: () => Promise.resolve(result ? { ...result } : null),
      then: (resolve, reject) => Promise.resolve(result ? { ...result } : null).then(resolve, reject),
    };
    return chain;
  };

  let availabilityDoc = null;
  Availability.findOne = () => {
    const chain = {
      lean: () => Promise.resolve(availabilityDoc),
      then: (resolve, reject) => Promise.resolve(availabilityDoc).then(resolve, reject),
    };
    return chain;
  };

  let availabilityCreateCalled = false;
  let lastCreatedAvailability = null;
  Availability.create = async (doc) => {
    availabilityCreateCalled = true;
    lastCreatedAvailability = doc;
    return {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      save: async () => {},
    };
  };

  let activeBookingsList = [];
  Booking.find = () => {
    const chain = {
      select: () => chain,
      lean: () => Promise.resolve(activeBookingsList),
      then: (resolve, reject) => Promise.resolve(activeBookingsList).then(resolve, reject),
    };
    return chain;
  };

  await t.test('1. GET /providers/:providerId rejects invalid ObjectId with 400', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/availability/providers/invalid-id-format',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /providerId không hợp lệ/i);
  });

  await t.test('2. GET /providers/:providerId/slots rejects invalid ObjectId with 400', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/availability/providers/12345/slots?date=2026-11-20',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /providerId không hợp lệ/i);
  });

  await t.test('3. GET /providers/:providerId returns 404 if provider does not exist', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${nonExistentId}`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await t.test('4. GET /providers/:providerId/slots returns 404 if provider does not exist', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${nonExistentId}/slots?date=2026-11-20`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await t.test('5. GET /providers/:providerId returns 404 if user exists but is INACTIVE', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${inactiveProviderId}`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await t.test('6. GET /providers/:providerId returns 404 if user is CUSTOMER (not PROVIDER)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${customerId}`,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  await t.test('7. GET /providers/:providerId does NOT create an Availability document when none exists', async () => {
    availabilityCreateCalled = false;
    availabilityDoc = null;

    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(availabilityCreateCalled, false, 'Availability.create must not be called by public GET');
    assert.equal(res.body.data.isAcceptingBookings, true);
    assert.equal(res.body.data.slotDurationMinutes, 60);
    assert.ok(Array.isArray(res.body.data.weeklySchedule));
    assert.equal(res.body.data.weeklySchedule.length, 7);
  });

  await t.test('8. GET /providers/:providerId/slots does NOT create an Availability document when none exists', async () => {
    availabilityCreateCalled = false;
    availabilityDoc = null;
    activeBookingsList = [];

    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(availabilityCreateCalled, false, 'Availability.create must not be called by public slots GET');
    assert.ok(Array.isArray(res.body.data.availableSlots));
  });

  await t.test('9. GET /providers/:providerId/slots (public) sanitizes bookedSlots: no bookingId, status, bufferedEndTime, or bookingsCount', async () => {
    const mockBookingId = new mongoose.Types.ObjectId();
    activeBookingsList = [
      {
        _id: mockBookingId,
        status: 'CONFIRMED',
        scheduledStartAt: new Date(2026, 10, 20, 9, 0, 0),
        scheduledEndAt: new Date(2026, 10, 20, 10, 30, 0),
        price: 250000,
        address: '123 Test Street',
      },
    ];
    availabilityDoc = null;

    // Unauthenticated public request
    const resPublic = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
    });

    assert.equal(resPublic.status, 200);
    assert.equal(resPublic.body.success, true);
    assert.equal(resPublic.body.data.bookingsCount, undefined, 'Public response must NOT reveal bookingsCount');
    assert.ok(Array.isArray(resPublic.body.data.bookedSlots));
    assert.equal(resPublic.body.data.bookedSlots.length, 1);

    const slot = resPublic.body.data.bookedSlots[0];
    assert.equal(slot.startTime, '09:00');
    assert.equal(slot.endTime, '10:30');
    assert.equal(slot.bookingId, undefined, 'Public bookedSlot must NOT contain bookingId');
    assert.equal(slot.status, undefined, 'Public bookedSlot must NOT contain status');
    assert.equal(slot.bufferedEndTime, undefined, 'Public bookedSlot must NOT contain bufferedEndTime');

    // Customer authenticated request (still public view)
    const resCustomer = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
      headers: {
        authorization: `Bearer ${tokens.customer}`,
      },
    });

    assert.equal(resCustomer.status, 200);
    assert.equal(resCustomer.body.data.bookingsCount, undefined);
    assert.equal(resCustomer.body.data.bookedSlots[0].bookingId, undefined);
    assert.equal(resCustomer.body.data.bookedSlots[0].status, undefined);
  });

  await t.test('10. GET /providers/:providerId/slots called by the provider themselves returns full booking details', async () => {
    const mockBookingId = new mongoose.Types.ObjectId();
    activeBookingsList = [
      {
        _id: mockBookingId,
        status: 'CONFIRMED',
        scheduledStartAt: new Date(2026, 10, 20, 9, 0, 0),
        scheduledEndAt: new Date(2026, 10, 20, 10, 30, 0),
      },
    ];
    availabilityDoc = null;

    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
      headers: {
        authorization: `Bearer ${tokens.activeProvider}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.bookingsCount, 1);
    assert.equal(res.body.data.bookedSlots.length, 1);
    const slot = res.body.data.bookedSlots[0];
    assert.equal(slot.bookingId.toString(), mockBookingId.toString());
    assert.equal(slot.status, 'CONFIRMED');
    assert.equal(slot.startTime, '09:00');
    assert.equal(slot.endTime, '10:30');
    assert.equal(slot.bufferedEndTime, '11:00');
  });

  await t.test('11. GET /providers/:providerId/slots called by STAFF or ADMIN returns full booking details', async () => {
    const mockBookingId = new mongoose.Types.ObjectId();
    activeBookingsList = [
      {
        _id: mockBookingId,
        status: 'IN_PROGRESS',
        scheduledStartAt: new Date(2026, 10, 20, 14, 0, 0),
        scheduledEndAt: new Date(2026, 10, 20, 15, 0, 0),
      },
    ];
    availabilityDoc = null;

    const resStaff = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
      headers: {
        authorization: `Bearer ${tokens.staff}`,
      },
    });

    assert.equal(resStaff.status, 200);
    assert.equal(resStaff.body.data.bookingsCount, 1);
    assert.equal(resStaff.body.data.bookedSlots[0].bookingId.toString(), mockBookingId.toString());
    assert.equal(resStaff.body.data.bookedSlots[0].status, 'IN_PROGRESS');

    const resAdmin = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
      headers: {
        authorization: `Bearer ${tokens.admin}`,
      },
    });

    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.data.bookingsCount, 1);
    assert.equal(resAdmin.body.data.bookedSlots[0].bookingId.toString(), mockBookingId.toString());
  });

  await t.test('12. GET /mine/slots preserves full details for authenticated provider', async () => {
    const mockBookingId = new mongoose.Types.ObjectId();
    activeBookingsList = [
      {
        _id: mockBookingId,
        status: 'CONFIRMED',
        scheduledStartAt: new Date(2026, 10, 20, 10, 0, 0),
        scheduledEndAt: new Date(2026, 10, 20, 11, 0, 0),
      },
    ];
    availabilityDoc = null;

    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/availability/mine/slots?date=2026-11-20&duration=60',
      headers: {
        authorization: `Bearer ${tokens.activeProvider}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.bookingsCount, 1);
    assert.equal(res.body.data.bookedSlots[0].bookingId.toString(), mockBookingId.toString());
    assert.equal(res.body.data.bookedSlots[0].status, 'CONFIRMED');
    assert.equal(res.body.data.bookedSlots[0].bufferedEndTime, '11:30');
  });

  await t.test('13. GET /mine initializes document via getOrCreateAvailability for authenticated provider', async () => {
    availabilityCreateCalled = false;
    lastCreatedAvailability = null;
    availabilityDoc = null;

    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/availability/mine',
      headers: {
        authorization: `Bearer ${tokens.activeProvider}`,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(availabilityCreateCalled, true, 'Availability.create should be called for authenticated /mine');
    assert.equal(lastCreatedAvailability.provider.toString(), activeProviderId.toString());
  });

  await t.test('14. Default schedule behavior: weekday calculates active slots excluding lunch break', async () => {
    availabilityDoc = null;
    activeBookingsList = [];

    // 2026-11-20 is a Friday (dayOfWeek = 5, workday on default schedule)
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-20&duration=60`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isAcceptingBookings, true);
    assert.equal(res.body.data.isAvailable, true);
    assert.equal(res.body.data.dayOfWeek, 5);
    assert.equal(res.body.data.dayName, 'friday');
    assert.ok(res.body.data.availableSlots.length > 0);

    // Verify 08:00 - 09:00 is available
    const slot8am = res.body.data.availableSlots.find((s) => s.startTime === '08:00');
    assert.ok(slot8am, '08:00 slot should be available on default schedule');

    // Verify 12:00 lunch break slot is not available in availableSlots
    const slot12pm = res.body.data.availableSlots.find((s) => s.startTime === '12:00');
    assert.equal(slot12pm, undefined, '12:00 lunch break slot must not be in availableSlots');

    // In allSlots, 12:00 should be marked conflict with lunch break
    const allSlot12pm = res.body.data.allSlots.find((s) => s.startTime === '12:00');
    assert.ok(allSlot12pm);
    assert.equal(allSlot12pm.isAvailable, false);
    assert.match(allSlot12pm.reason, /nghỉ/i);
  });

  await t.test('15. Default schedule behavior: Sunday is marked off (isAvailable: false, no available slots)', async () => {
    availabilityDoc = null;
    activeBookingsList = [];

    // 2026-11-22 is a Sunday (dayOfWeek = 0, default isOff = true)
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/availability/providers/${activeProviderId}/slots?date=2026-11-22&duration=60`,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.dayOfWeek, 0);
    assert.equal(res.body.data.dayName, 'sunday');
    assert.equal(res.body.data.isAvailable, false);
    assert.match(res.body.data.reason, /Chủ nhật/i);
    assert.equal(res.body.data.availableSlots.length, 0);
    assert.equal(res.body.data.allSlots.length, 0);
  });

  await t.test('16. Route middleware order: availabilityRateLimiter must execute before validateProviderIdMiddleware', () => {
    const availabilityRoutes = require('../src/modules/availability/availability.routes.js');
    const { availabilityRateLimiter } = require('../src/middlewares/rate-limit.middleware.js');
    const { validateProviderIdMiddleware } = require('../src/modules/availability/availability.validation.js');

    const checkRouteStack = (routePath) => {
      const routeLayer = availabilityRoutes.stack.find((l) => l.route?.path === routePath);
      assert.ok(routeLayer, `Route layer ${routePath} must exist`);
      const handles = routeLayer.route.stack.map((s) => s.handle);
      const limiterIdx = handles.indexOf(availabilityRateLimiter);
      const validatorIdx = handles.indexOf(validateProviderIdMiddleware);
      assert.ok(limiterIdx >= 0, `availabilityRateLimiter must be present on ${routePath}`);
      assert.ok(validatorIdx >= 0, `validateProviderIdMiddleware must be present on ${routePath}`);
      assert.ok(
        limiterIdx < validatorIdx,
        `availabilityRateLimiter (idx ${limiterIdx}) must run before validateProviderIdMiddleware (idx ${validatorIdx}) on ${routePath}`
      );
    };

    checkRouteStack('/providers/:providerId/slots');
    checkRouteStack('/providers/:providerId');
  });
});
