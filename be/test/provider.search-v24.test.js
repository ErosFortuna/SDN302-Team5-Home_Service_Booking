const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { searchProviders, getRecommendedProviders } = require('../src/modules/providers/provider.controller.js');
const {
  validateSearchProvidersQuery,
  validateRecommendedProvidersQuery,
} = require('../src/modules/providers/provider.validation.js');
const { updateServiceStatus } = require('../src/modules/bookings/booking.controller.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const User = require('../src/modules/users/user.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Service = require('../src/modules/services/service.model.js');
const ServiceCategory = require('../src/modules/categories/service-category.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Notification = require('../src/modules/notifications/notification.model.js');
const { env } = require('../src/config/env.js');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

test('V-24: searchProviders pushes hard filters (userStatus ACTIVE, minRating, city) to Mongo query', async () => {
  const originalProfileFind = ProviderProfile.find;
  const originalProfileCount = ProviderProfile.countDocuments;

  let capturedFilter = null;
  let capturedSort = null;
  let capturedSkip = null;
  let capturedLimit = null;

  ProviderProfile.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 1;
  };

  ProviderProfile.find = (filter) => {
    capturedFilter = filter;
    const query = {
      populate() {
        return query;
      },
      sort(criteria) {
        capturedSort = criteria;
        return query;
      },
      skip(n) {
        capturedSkip = n;
        return query;
      },
      limit(n) {
        capturedLimit = n;
        return query;
      },
      lean: async () => [],
    };
    return query;
  };

  try {
    const res = mockRes();
    await searchProviders(
      {
        searchQuery: {
          page: 1,
          limit: 10,
          city: 'Đà Nẵng',
          minRating: 4.0,
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, []);

    // 1. Verify hard filters in Mongo query
    assert.equal(capturedFilter.verificationStatus, 'VERIFIED');
    assert.deepEqual(capturedFilter.isDeleted, { $ne: true });
    assert.equal(capturedFilter.userStatus, 'ACTIVE');
    assert.deepEqual(capturedFilter.averageRating, { $gte: 4.0 });
    assert.ok(Array.isArray(capturedFilter.$or), 'City search should produce $or for city and serviceAreas');
    assert.ok(capturedFilter.$or.some((item) => item.city instanceof RegExp));
    assert.ok(capturedFilter.$or.some((item) => item.serviceAreas instanceof RegExp));

    // 2. Verify sorting and pagination at Mongo level
    assert.deepEqual(capturedSort, { averageRating: -1, completedJobCount: -1, _id: -1 });
    assert.equal(capturedSkip, 0);
    assert.equal(capturedLimit, 10);
    assert.equal(res.body.pagination.truncated, undefined);
  } finally {
    ProviderProfile.find = originalProfileFind;
    ProviderProfile.countDocuments = originalProfileCount;
  }
});

test('V-24 item 5: keyword handles special regex characters and limits length without crashing', async () => {
  const originalProfileFind = ProviderProfile.find;
  const originalProfileCount = ProviderProfile.countDocuments;
  const originalUserFind = User.find;
  const originalCategoryFind = ServiceCategory.find;

  let capturedFilter = null;
  ProviderProfile.countDocuments = async () => 0;
  ProviderProfile.find = (filter) => {
    capturedFilter = filter;
    const query = {
      populate() { return query; },
      sort() { return query; },
      skip() { return query; },
      limit() { return query; },
      lean: async () => [],
    };
    return query;
  };
  User.find = () => ({
    select: () => ({ lean: async () => [] }),
  });
  ServiceCategory.find = () => ({
    select: () => ({ lean: async () => [] }),
  });

  try {
    const res = mockRes();
    // 1. Keyword with dangerous regex characters: ( ) [ ] + * ? ^ $ . \ |
    const specialChars = 'Thợ (điện) [24/7] + sửa* ? ^lock$ . \\ |';
    await searchProviders(
      {
        searchQuery: {
          page: 1,
          limit: 10,
          keyword: specialChars,
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(capturedFilter.$or, 'Should build $or condition for keyword');

    const businessNameCondition = capturedFilter.$or.find((c) => c.businessName);
    assert.ok(businessNameCondition.businessName instanceof RegExp);
    // Regex must have matched without throwing SyntaxError
    assert.ok(businessNameCondition.businessName.test(specialChars));

    // 2. Excessively long keyword should be safely capped to 100 chars
    const longKeyword = 'a'.repeat(200);
    await searchProviders(
      {
        searchQuery: {
          page: 1,
          limit: 10,
          keyword: longKeyword,
        },
      },
      res
    );
    const longCondition = capturedFilter.$or.find((c) => c.businessName);
    assert.equal(longCondition.businessName.source, 'a'.repeat(100));
  } finally {
    ProviderProfile.find = originalProfileFind;
    ProviderProfile.countDocuments = originalProfileCount;
    User.find = originalUserFind;
    ServiceCategory.find = originalCategoryFind;
  }
});

test('V-24 item 4: getRecommendedProviders applies hard filters and preliminary geo/sort before matching', async () => {
  const targetCatId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const activeUserId = new mongoose.Types.ObjectId();

  const originalProfileFind = ProviderProfile.find;
  const originalRequestFindById = ServiceRequest.findById;
  const originalBookingFind = Booking.find;
  const originalBookingAggregate = Booking.aggregate;
  const originalAvailabilityFind = Availability.find;

  let capturedFilter = null;
  let capturedSort = null;
  let capturedLimit = null;

  ServiceRequest.findById = () => ({
    populate() { return this; },
    lean: async () => ({
      _id: requestId,
      status: 'OPEN',
      customer: customerId,
      category: { _id: targetCatId, name: 'Điện Lạnh' },
      preferredStartAt: new Date(Date.now() + 3600000),
      address: {
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        location: { type: 'Point', coordinates: [108.2022, 16.0544] },
      },
      declinedProviders: [],
    }),
  });

  ProviderProfile.find = (filter) => {
    capturedFilter = filter;
    const query = {
      populate() { return query; },
      sort(criteria) {
        capturedSort = criteria;
        return query;
      },
      limit(n) {
        capturedLimit = n;
        return query;
      },
      lean: async () => [],
    };
    return query;
  };

  Booking.find = () => ({
    select() { return this; },
    lean: async () => [],
  });
  Booking.aggregate = async () => [];
  Availability.find = () => ({ lean: async () => [] });

  try {
    const res = mockRes();
    await getRecommendedProviders(
      {
        params: { requestId: requestId.toString() },
        recommendedQuery: { limit: 10, radiusKm: 15, sortBy: 'score' },
        user: { _id: customerId, role: 'CUSTOMER' },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    // Verify hard filters in Mongo query
    assert.equal(capturedFilter.verificationStatus, 'VERIFIED');
    assert.deepEqual(capturedFilter.isDeleted, { $ne: true });
    assert.equal(capturedFilter.userStatus, 'ACTIVE');
    assert.equal(capturedFilter.skills.toString(), targetCatId.toString());

    // Verify preliminary location filter at DB
    assert.ok(capturedFilter.$or, 'Should have $or for location and city/serviceAreas');

    // Verify meaningful sort ({ averageRating: -1, completedJobCount: -1, _id: -1 }) and ceiling
    assert.deepEqual(capturedSort, { averageRating: -1, completedJobCount: -1, _id: -1 });
    assert.equal(capturedLimit, env.providerRecommendMaxCandidates || 200);
  } finally {
    ProviderProfile.find = originalProfileFind;
    ServiceRequest.findById = originalRequestFindById;
    Booking.find = originalBookingFind;
    Booking.aggregate = originalBookingAggregate;
    Availability.find = originalAvailabilityFind;
  }
});

test('V-24 item 6: updateServiceStatus increments completedJobCount when transitioning to COMPLETED', async () => {
  const providerUserId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const originalProfileFindOneAndUpdate = ProviderProfile.findOneAndUpdate;
  const originalNotificationCreate = Notification.create;
  const originalStartSession = mongoose.startSession;

  Notification.create = async () => ({});
  mongoose.startSession = async () => ({
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: async () => {},
  });

  let capturedProfileUpdate = null;
  ProviderProfile.findOneAndUpdate = async (filter, update) => {
    capturedProfileUpdate = { filter, update };
    return { _id: new mongoose.Types.ObjectId() };
  };

  Booking.findOneAndUpdate = () => ({
    populate: async () => ({
      _id: bookingId,
      provider: { _id: providerUserId },
      customer: new mongoose.Types.ObjectId(),
      status: 'COMPLETED',
      statusHistory: [],
      toJSON() { return { ...this }; },
    }),
  });

  try {
    const res = mockRes();
    const req = {
      booking: {
        _id: bookingId,
        provider: providerUserId,
        status: 'IN_PROGRESS',
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(),
      },
      user: { _id: providerUserId, role: 'PROVIDER' },
      body: {
        status: 'COMPLETED',
        note: 'Đã hoàn thành tốt',
        confirmCompletion: true,
      },
    };

    await updateServiceStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(capturedProfileUpdate, 'ProviderProfile.findOneAndUpdate should be called');
    assert.deepEqual(capturedProfileUpdate.filter, { user: providerUserId });
    assert.deepEqual(capturedProfileUpdate.update, { $inc: { completedJobCount: 1 } });
  } finally {
    Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    ProviderProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
    Notification.create = originalNotificationCreate;
    mongoose.startSession = originalStartSession;
  }
});

test('V-24 Round 4 item 6: updateServiceStatus does not increment completedJobCount on repeated calls', async () => {
  const providerUserId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const originalProfileFindOneAndUpdate = ProviderProfile.findOneAndUpdate;
  const originalNotificationCreate = Notification.create;
  const originalStartSession = mongoose.startSession;

  Notification.create = async () => ({});
  mongoose.startSession = async () => ({
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: async () => {},
  });
  Notification.create = async () => ({});

  let capturedProfileUpdate = null;
  ProviderProfile.findOneAndUpdate = async (filter, update) => {
    capturedProfileUpdate = { filter, update };
    return { _id: new mongoose.Types.ObjectId() };
  };

  // Case 1: Provider attempts to call status on an already COMPLETED booking -> 409 conflict
  try {
    const res = mockRes();
    const reqProvider = {
      booking: {
        _id: bookingId,
        provider: providerUserId,
        status: 'COMPLETED',
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(),
      },
      user: { _id: providerUserId, role: 'PROVIDER' },
      body: {
        status: 'COMPLETED',
        confirmCompletion: true,
      },
    };

    await assert.rejects(
      async () => {
        await updateServiceStatus(reqProvider, res);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
    assert.equal(capturedProfileUpdate, null, 'ProviderProfile must not be updated on 409');

    // Case 2: Privileged user (ADMIN/STAFF) updates note on already COMPLETED booking -> no $inc
    Booking.findOneAndUpdate = () => ({
      populate: async () => ({
        _id: bookingId,
        provider: { _id: providerUserId },
        customer: new mongoose.Types.ObjectId(),
        status: 'COMPLETED',
        statusHistory: [],
        toJSON() { return { ...this }; },
      }),
    });

    const reqAdmin = {
      booking: {
        _id: bookingId,
        provider: providerUserId,
        status: 'COMPLETED',
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(),
      },
      user: { _id: new mongoose.Types.ObjectId(), role: 'ADMIN' },
      body: {
        status: 'COMPLETED',
        note: 'Admin bổ sung ghi chú sau khi hoàn tất',
      },
    };

    const resAdmin = mockRes();
    await updateServiceStatus(reqAdmin, resAdmin);
    assert.equal(resAdmin.statusCode, 200);
    assert.equal(capturedProfileUpdate, null, 'ProviderProfile.$inc must not be called when from === COMPLETED');
  } finally {
    Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    ProviderProfile.findOneAndUpdate = originalProfileFindOneAndUpdate;
    Notification.create = originalNotificationCreate;
    mongoose.startSession = originalStartSession;
  }
});

test('V-24 Round 4 item 3: validateSearchProvidersQuery validates coordinates and radiusKm boundaries', () => {
  const maxRadius = env.providerMaxRadiusKm || 100;

  // 1. lat out of bounds
  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { lat: '95', lng: '108.2' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'lat' && d.message.includes('-90 and 90')));
      return true;
    }
  );

  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { lat: '-91', lng: '108.2' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'lat'));
      return true;
    }
  );

  // 2. lng out of bounds
  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { lat: '16.0', lng: '185' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'lng' && d.message.includes('-180 and 180')));
      return true;
    }
  );

  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { lat: '16.0', lng: '-181' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'lng'));
      return true;
    }
  );

  // 3. radiusKm exceeds maximum configured limit
  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { radiusKm: String(maxRadius + 1) } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'radiusKm' && d.message.includes(String(maxRadius))));
      return true;
    }
  );

  // 4. radiusKm below minimum (0.5)
  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { radiusKm: '0.2' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'radiusKm'));
      return true;
    }
  );

  // 5. Missing one coordinate when other is provided
  assert.throws(
    () => {
      validateSearchProvidersQuery(
        { query: { lat: '16.0' } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'coordinates'));
      return true;
    }
  );

  // 6. Valid coordinates & radius pass cleanly
  const reqValid = { query: { lat: '16.0544', lng: '108.2022', radiusKm: '25' } };
  let calledNext = false;
  validateSearchProvidersQuery(reqValid, {}, () => {
    calledNext = true;
  });
  assert.ok(calledNext);
  assert.equal(reqValid.searchQuery.lat, 16.0544);
  assert.equal(reqValid.searchQuery.lng, 108.2022);
  assert.equal(reqValid.searchQuery.radiusKm, 25);

  // 7. validateRecommendedProvidersQuery checks radiusKm upper bound
  assert.throws(
    () => {
      validateRecommendedProvidersQuery(
        { query: { radiusKm: String(maxRadius + 10) } },
        {},
        () => {}
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details?.some((d) => d.field === 'radiusKm'));
      return true;
    }
  );
});

test('V-24 item 7: Integration test with real MongoDB (MongoMemoryServer) for keyword + radius + dataset > limit + stable pagination', async (t) => {
  let mongod = null;
  let conn = null;

  // Ensure robust cleanup via t.after hook
  if (t && typeof t.after === 'function') {
    t.after(async () => {
      try {
        if (conn) await conn.close();
      } catch {}
      try {
        if (mongod) await mongod.stop();
      } catch {}
    });
  }

  try {
    try {
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      conn = await mongoose.createConnection(uri).asPromise();
    } catch (err) {
      if (err.message && /EACCES|permission/i.test(err.message)) {
        console.warn('[SKIP] Skipping V-24 item 7 integration test because loopback socket is restricted in current sandbox environment.');
        return;
      }
      throw err;
    }

    // Ensure 2dsphere index on ProviderProfile model
    const UserMod = conn.model('User', User.schema);
    const CatMod = conn.model('ServiceCategory', ServiceCategory.schema);
    const ProfileMod = conn.model('ProviderProfile', ProviderProfile.schema);
    await ProfileMod.init();

    // Seed 1 category
    const cat = await CatMod.create({
      name: 'Sửa Điện Nước',
      slug: 'sua-dien-nuoc',
      description: 'Dịch vụ điện nước',
    });

    // 1. Providers in Hanoi (outside radius of Da Nang search): high rating 5.0
    for (let i = 0; i < 3; i++) {
      const u = await UserMod.create({
        fullName: `Thợ Hà Nội ${i + 1}`,
        email: `hanoi${i + 1}@test.local`,
        passwordHash: 'dummy-password-hash',
        role: 'PROVIDER',
        status: 'ACTIVE',
      });
      await ProfileMod.create({
        user: u._id,
        fullName: u.fullName,
        businessName: `Thợ Điện Hà Nội ${i + 1}`,
        city: 'Hà Nội',
        serviceAreas: ['Hoàn Kiếm'],
        location: { type: 'Point', coordinates: [105.8542, 21.0285] }, // Hanoi
        verificationStatus: 'VERIFIED',
        userStatus: 'ACTIVE',
        isDeleted: false,
        skills: [cat._id],
        averageRating: 5.0,
        reviewCount: 50,
        completedJobCount: 100,
      });
    }

    // 2. Providers in Da Nang center (within 5km of 16.0544, 108.2022) with keyword "Thợ Điện (24/7)"
    // Ratings range from 2.0 to 4.5
    for (let i = 0; i < 7; i++) {
      const u = await UserMod.create({
        fullName: `Thợ Điện Đà Nẵng ${i + 1}`,
        email: `danang${i + 1}@test.local`,
        passwordHash: 'dummy-password-hash',
        role: 'PROVIDER',
        status: 'ACTIVE',
      });
      await ProfileMod.create({
        user: u._id,
        fullName: u.fullName,
        businessName: `Thợ Điện (24/7) Cấp Tốc ${i + 1}`,
        city: 'Đà Nẵng',
        serviceAreas: ['Hải Châu'],
        location: {
          type: 'Point',
          // Slight coordinate offsets within ~3km of Da Nang center
          coordinates: [108.2022 + i * 0.005, 16.0544 + i * 0.005],
        },
        verificationStatus: 'VERIFIED',
        userStatus: 'ACTIVE',
        isDeleted: false,
        skills: [cat._id],
        averageRating: 2.0 + (i * 0.3),
        reviewCount: 5 + i,
        completedJobCount: 10 + i,
      });
    }

    // 3. Provider far from Da Nang (~60km away) but high rating 4.9
    const uFar = await UserMod.create({
      fullName: 'Thợ Xa',
      email: 'far@test.local',
      passwordHash: 'dummy-password-hash',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    await ProfileMod.create({
      user: uFar._id,
      fullName: uFar.fullName,
      businessName: 'Thợ Điện (24/7) Xa',
      city: 'Quảng Nam',
      serviceAreas: ['Tam Kỳ'],
      location: { type: 'Point', coordinates: [108.48, 15.57] }, // ~60km away
      verificationStatus: 'VERIFIED',
      userStatus: 'ACTIVE',
      isDeleted: false,
      skills: [cat._id],
      averageRating: 4.9,
      reviewCount: 40,
      completedJobCount: 80,
    });

    // Temporarily swap mongoose models to conn models
    const origProfileFind = ProviderProfile.find;
    const origProfileCount = ProviderProfile.countDocuments;
    const origUserFind = User.find;
    const origCatFind = ServiceCategory.find;

    ProviderProfile.find = (...args) => ProfileMod.find(...args);
    ProviderProfile.countDocuments = (...args) => ProfileMod.countDocuments(...args);
    User.find = (...args) => UserMod.find(...args);
    ServiceCategory.find = (...args) => CatMod.find(...args);

    try {
      // Execute search: Da Nang center (16.0544, 108.2022), radius 15km, keyword "Thợ Điện (24/7)"
      // Limit 3, Page 1
      const resPage1 = mockRes();
      await searchProviders(
        {
          searchQuery: {
            lat: 16.0544,
            lng: 108.2022,
            radiusKm: 15,
            keyword: 'Thợ Điện (24/7)',
            page: 1,
            limit: 3,
          },
        },
        resPage1
      );

      assert.equal(resPage1.statusCode, 200);
      assert.equal(resPage1.body.success, true);

      // Verify exact count: 7 Da Nang center providers match (Hanoi and far Tam Kỳ excluded by $geoWithin)
      assert.equal(resPage1.body.pagination.totalItems, 7);
      assert.equal(resPage1.body.pagination.limit, 3);
      assert.equal(resPage1.body.pagination.page, 1);
      assert.equal(resPage1.body.pagination.totalPages, 3);
      assert.equal(resPage1.body.pagination.hasNextPage, true);
      assert.equal(resPage1.body.pagination.hasPreviousPage, false);
      assert.equal(resPage1.body.pagination.truncated, undefined);

      // Page 1 should return top 3 by rating
      assert.equal(resPage1.body.data.length, 3);
      for (const item of resPage1.body.data) {
        assert.ok(item.distanceKm != null);
        assert.ok(item.distanceKm <= 15, 'Distance must be within 15km');
        assert.ok(item.businessName.includes('Thợ Điện (24/7)'));
      }

      // Ratings must be sorted descending:
      assert.ok(resPage1.body.data[0].averageRating >= resPage1.body.data[1].averageRating);
      assert.ok(resPage1.body.data[1].averageRating >= resPage1.body.data[2].averageRating);

      // Page 2
      const resPage2 = mockRes();
      await searchProviders(
        {
          searchQuery: {
            lat: 16.0544,
            lng: 108.2022,
            radiusKm: 15,
            keyword: 'Thợ Điện (24/7)',
            page: 2,
            limit: 3,
          },
        },
        resPage2
      );

      assert.equal(resPage2.statusCode, 200);
      assert.equal(resPage2.body.data.length, 3);
      assert.equal(resPage2.body.pagination.page, 2);
      assert.equal(resPage2.body.pagination.hasNextPage, true);
      assert.equal(resPage2.body.pagination.hasPreviousPage, true);

      // Page 3
      const resPage3 = mockRes();
      await searchProviders(
        {
          searchQuery: {
            lat: 16.0544,
            lng: 108.2022,
            radiusKm: 15,
            keyword: 'Thợ Điện (24/7)',
            page: 3,
            limit: 3,
          },
        },
        resPage3
      );

      assert.equal(resPage3.statusCode, 200);
      assert.equal(resPage3.body.data.length, 1);
      assert.equal(resPage3.body.pagination.page, 3);
      assert.equal(resPage3.body.pagination.hasNextPage, false);
      assert.equal(resPage3.body.pagination.hasPreviousPage, true);

      // =========================================================================
      // V-24 Round 4 item 4: Stable Pagination with identical ratings using _id tie-breaker
      // =========================================================================
      const tieBreakerCat = await CatMod.create({
        name: 'Sơn Nhà',
        slug: 'son-nha',
        description: 'Dịch vụ sơn tường',
      });

      const tieIds = [];
      for (let i = 0; i < 10; i++) {
        const u = await UserMod.create({
          fullName: `Thợ Sơn Đều ${i + 1}`,
          email: `paint${i + 1}@test.local`,
          passwordHash: 'dummy-password-hash',
          role: 'PROVIDER',
          status: 'ACTIVE',
        });
        const prof = await ProfileMod.create({
          user: u._id,
          fullName: u.fullName,
          businessName: `Sơn Nhà Chuyên Nghiệp ${i + 1}`,
          city: 'Đà Nẵng',
          serviceAreas: ['Hải Châu'],
          verificationStatus: 'VERIFIED',
          userStatus: 'ACTIVE',
          isDeleted: false,
          skills: [tieBreakerCat._id],
          averageRating: 4.8, // Identical rating
          completedJobCount: 20, // Identical job count
        });
        tieIds.push(u._id.toString());
      }

      // Query page 1 (limit 5) and page 2 (limit 5)
      const tieResPage1 = mockRes();
      await searchProviders(
        {
          searchQuery: {
            categoryId: tieBreakerCat._id.toString(),
            page: 1,
            limit: 5,
          },
        },
        tieResPage1
      );

      const tieResPage2 = mockRes();
      await searchProviders(
        {
          searchQuery: {
            categoryId: tieBreakerCat._id.toString(),
            page: 2,
            limit: 5,
          },
        },
        tieResPage2
      );

      assert.equal(tieResPage1.statusCode, 200);
      assert.equal(tieResPage2.statusCode, 200);
      assert.equal(tieResPage1.body.pagination.totalItems, 10);
      assert.equal(tieResPage1.body.data.length, 5);
      assert.equal(tieResPage2.body.data.length, 5);

      const page1Ids = tieResPage1.body.data.map((d) => d.providerId);
      const page2Ids = tieResPage2.body.data.map((d) => d.providerId);

      // Verify no duplicates between page 1 and page 2
      const intersection = page1Ids.filter((id) => page2Ids.includes(id));
      assert.equal(intersection.length, 0, 'There should be 0 duplicate providers across pages');

      // Verify no missing items: union of page 1 and page 2 should contain all 10 providers
      const combined = new Set([...page1Ids, ...page2Ids]);
      assert.equal(combined.size, 10, 'All 10 providers must be retrieved across pages without omission');
      for (const id of tieIds) {
        assert.ok(combined.has(id), `Provider ${id} should be present in paginated results`);
      }
    } finally {
      ProviderProfile.find = origProfileFind;
      ProviderProfile.countDocuments = origProfileCount;
      User.find = origUserFind;
      ServiceCategory.find = origCatFind;
    }
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {}
    }
    if (mongod) {
      try {
        await mongod.stop();
      } catch {}
    }
  }
});
