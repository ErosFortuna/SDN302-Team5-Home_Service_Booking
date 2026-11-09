const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  selectProvider,
} = require("../src/modules/bookings/booking.controller.js");
const { BOOKING_STATUS } = require("../src/modules/bookings/booking.status.js");
const { AppError } = require("../src/shared/app-error.js");

const ServiceRequest = require("../src/modules/requests/request.model.js");
const Availability = require("../src/modules/availability/availability.model.js");
const ProviderProfile = require("../src/modules/providers/provider.model.js");
const User = require("../src/modules/users/user.model.js");
const Booking = require("../src/modules/bookings/booking.model.js");
const Notification = require("../src/modules/notifications/notification.model.js");

test("selectProvider: STAFF successfully dispatches provider, creates Booking (PENDING_CONFIRMATION) and marks Request BOOKED (201)", async () => {
  const staffId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const serviceId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const mockRequest = {
    _id: requestId,
    customer: customerId,
    status: "OPEN",
    category: categoryId,
    service: {
      _id: serviceId,
      name: "Sửa điện nước",
      basePrice: 200000,
      estimatedDurationMinutes: 90,
      category: categoryId,
    },
    address: { addressLine: "123 Le Loi", city: "TPHCM" },
    preferredStartAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    })(), // tomorrow 09:00
    declinedProviders: [],
  };

  const mockProviderUser = {
    _id: providerId,
    fullName: "Nguyễn Văn Thợ",
    role: "PROVIDER",
    status: "ACTIVE",
  };

  const mockProfile = {
    user: providerId,
    verificationStatus: "VERIFIED",
    skills: [categoryId],
  };

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

  let createdBookingData = null;
  let requestUpdatedData = null;
  let notifications = [];

  ServiceRequest.findById = (id) => ({
    populate: async () =>
      String(id) === String(requestId) ? mockRequest : null,
  });

  ServiceRequest.findOneAndUpdate = async (filter, update) => {
    requestUpdatedData = { filter, update };
    return { ...mockRequest, status: "BOOKED" };
  };

  User.findById = async (id) =>
    String(id) === String(providerId) ? mockProviderUser : null;

  ProviderProfile.findOne = (filter) => ({
    populate: async () => mockProfile,
  });

  Availability.findOne = async () => null;
  Booking.findOne = async () => null; // No overlapping bookings

  Booking.create = async ([data]) => {
    createdBookingData = data;
    const doc = {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      toJSON: () => data,
    };
    doc.populate = async () => doc;
    return [doc];
  };

  Notification.create = async (payload) => {
    notifications.push(payload);
    return payload;
  };

  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: staffId, role: "STAFF", fullName: "Lê Văn Hiếu (Staff)" },
    };

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

    await selectProvider(req, res);

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(requestUpdatedData.update.$set.status, "BOOKED");
    assert.strictEqual(
      createdBookingData.status,
      BOOKING_STATUS.PENDING_CONFIRMATION,
    );
    assert.strictEqual(createdBookingData.price, 200000);
    assert.strictEqual(String(createdBookingData.provider), String(providerId));
    // Verify booking.customer is the actual customer, NOT the staff!
    assert.strictEqual(String(createdBookingData.customer), String(customerId));
    assert.ok(createdBookingData.statusHistory[0].note.includes("điều phối"));
    // Notifications sent to both provider and customer
    assert.strictEqual(notifications.length, 2);
    assert.strictEqual(String(notifications[0].recipient), String(providerId));
    assert.strictEqual(String(notifications[1].recipient), String(customerId));
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    mongoose.startSession = originals.startSession;
    Booking.create = originals.bookingCreate;
    Notification.create = originals.notificationCreate;
    mongoose.startSession = originals.startSession;
  }
});

test("selectProvider returns 409 if request is not OPEN", async () => {
  const staffId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
  };

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: new mongoose.Types.ObjectId(),
      status: "BOOKED", // Already booked!
      service: { basePrice: 100000 },
      declinedProviders: [],
    }),
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: staffId, role: "STAFF" },
    };

    await assert.rejects(
      async () => selectProvider(req, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /mở/);
        return true;
      },
    );
  } finally {
    ServiceRequest.findById = originals.requestFindById;
  }
});

test("selectProvider returns 422 if provider is in declinedProviders", async () => {
  const staffId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
  };

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: new mongoose.Types.ObjectId(),
      status: "OPEN",
      service: { basePrice: 100000 },
      declinedProviders: [providerId], // Has declined before!
    }),
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: staffId, role: "STAFF" },
    };

    await assert.rejects(
      async () => selectProvider(req, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 422);
        assert.match(err.message, /từ chối/);
        return true;
      },
    );
  } finally {
    ServiceRequest.findById = originals.requestFindById;
  }
});

test("selectProvider returns 409 if provider has schedule conflict (NFR-09)", async () => {
  const staffId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    startSession: mongoose.startSession,
  };

  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(9, 0, 0, 0);

  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  });

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: new mongoose.Types.ObjectId(),
      status: "OPEN",
      category: categoryId,
      service: { basePrice: 100000, estimatedDurationMinutes: 60 },
      preferredStartAt: tomorrowStart,
      declinedProviders: [],
    }),
  });

  User.findById = async () => ({
    _id: providerId,
    fullName: "Trần Thợ 2",
    role: "PROVIDER",
    status: "ACTIVE",
  });
  ProviderProfile.findOne = () => ({
    populate: async () => ({
      user: providerId,
      verificationStatus: "VERIFIED",
      skills: [categoryId],
    }),
  });
  Availability.findOne = async () => null;

  // Overlapping booking found!
  Booking.findOne = async () => ({
    _id: new mongoose.Types.ObjectId(),
    status: BOOKING_STATUS.CONFIRMED,
    scheduledStartAt: tomorrowStart,
    scheduledEndAt: new Date(tomorrowStart.getTime() + 3600000),
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: staffId, role: "STAFF" },
    };

    await assert.rejects(
      async () => selectProvider(req, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /trùng vào khung giờ|lịch trong khung giờ/);
        return true;
      },
    );
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    mongoose.startSession = originals.startSession;
  }
});

test("selectProvider rejects a provider who is not accepting bookings", async () => {
  const staffId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const start = new Date(Date.now() + 2 * 86400000);

  const originals = {
    requestFindById: ServiceRequest.findById,
    userFindById: User.findById,
    profileFindOne: ProviderProfile.findOne,
    availabilityFindOne: Availability.findOne,
    bookingFindOne: Booking.findOne,
    startSession: mongoose.startSession,
  };

  mongoose.startSession = async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {},
  });

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: customerId,
      status: "OPEN",
      category: categoryId,
      service: { basePrice: 100000, estimatedDurationMinutes: 60 },
      preferredStartAt: start,
      declinedProviders: [],
    }),
  });
  User.findById = async () => ({ _id: providerId, role: "PROVIDER", status: "ACTIVE" });
  ProviderProfile.findOne = () => ({
    populate: async () => ({ verificationStatus: "VERIFIED", skills: [categoryId] }),
  });
  Availability.findOne = async () => ({
    settings: { isAcceptingBookings: false, travelBufferMinutes: 30 },
    weeklySchedule: [],
    daysOff: [],
  });
  Booking.findOne = async () => null;

  try {
    await assert.rejects(
      () => selectProvider({
        params: { requestId: requestId.toString() },
        body: { providerId: providerId.toString() },
        user: { _id: staffId, role: "STAFF" },
      }, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 409);
        assert.equal(err.details.availabilityReason, "NOT_ACCEPTING");
        return true;
      }
    );
  } finally {
    ServiceRequest.findById = originals.requestFindById;
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    Availability.findOne = originals.availabilityFindOne;
    Booking.findOne = originals.bookingFindOne;
    mongoose.startSession = originals.startSession;
  }
});

test("selectProvider returns 403 if calling user is a different CUSTOMER (not request owner)", async () => {
  const customerId = new mongoose.Types.ObjectId();
  const unauthorizedCustomerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();

  const originals = {
    requestFindById: ServiceRequest.findById,
  };

  ServiceRequest.findById = () => ({
    populate: async () => ({
      _id: requestId,
      customer: customerId,
      status: "OPEN",
      service: { basePrice: 100000 },
      declinedProviders: [],
    }),
  });

  try {
    const req = {
      params: { requestId: requestId.toString() },
      body: { providerId: providerId.toString() },
      user: { _id: unauthorizedCustomerId, role: "CUSTOMER" },
    };

    await assert.rejects(
      async () => selectProvider(req, {}),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /quyền chọn thợ/);
        return true;
      },
    );
  } finally {
    ServiceRequest.findById = originals.requestFindById;
  }
});
