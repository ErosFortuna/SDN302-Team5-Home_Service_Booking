const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { searchProviders, getRecommendedProviders } = require('../src/modules/providers/provider.controller.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const User = require('../src/modules/users/user.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Service = require('../src/modules/services/service.model.js');
const ServiceCategory = require('../src/modules/categories/service-category.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const { env } = require('../src/config/env.js');
const { matchesServiceArea } = require('../src/modules/providers/provider.matching.js');

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

test('V-24: searchProviders pushes hard filters (user active, minRating, city) to Mongo query', async () => {
  const activeUserId = new mongoose.Types.ObjectId();
  const originalUserFind = User.find;
  const originalProfileFind = ProviderProfile.find;

  let capturedFilter = null;
  let capturedSort = null;
  let capturedLimit = null;

  User.find = () => ({
    select: () => ({
      lean: async () => [{ _id: activeUserId, fullName: 'Nguyễn Văn Thợ' }],
    }),
  });

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
    assert.deepEqual(capturedFilter.user, { $in: [activeUserId] });
    assert.deepEqual(capturedFilter.averageRating, { $gte: 4.0 });
    assert.ok(Array.isArray(capturedFilter.$or), 'City search should produce $or for city and serviceAreas');
    assert.ok(capturedFilter.$or.some((item) => item.city instanceof RegExp));
    assert.ok(capturedFilter.$or.some((item) => item.serviceAreas instanceof RegExp));

    // 2. Verify sorting and candidate ceiling at Mongo level
    assert.deepEqual(capturedSort, { averageRating: -1, completedJobCount: -1 });
    assert.equal(typeof capturedLimit, 'number');
    assert.ok(capturedLimit >= 10, 'Candidate ceiling must cover at least page * limit');
  } finally {
    User.find = originalUserFind;
    ProviderProfile.find = originalProfileFind;
  }
});

test('V-24: searchProviders reads PROVIDER_SEARCH_MAX_CANDIDATES via env.js', async () => {
  const originalUserFind = User.find;
  const originalProfileFind = ProviderProfile.find;
  const originalEnvValue = env.providerSearchMaxCandidates;
  env.providerSearchMaxCandidates = 42;

  User.find = () => ({
    select: () => ({
      lean: async () => [],
    }),
  });

  let capturedLimit = null;
  ProviderProfile.find = () => {
    const query = {
      populate() { return query; },
      sort() { return query; },
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
        searchQuery: { page: 1, limit: 10 },
      },
      res
    );

    assert.equal(capturedLimit, 42, 'Candidate ceiling should match env.providerSearchMaxCandidates');
  } finally {
    env.providerSearchMaxCandidates = originalEnvValue;
    User.find = originalUserFind;
    ProviderProfile.find = originalProfileFind;
  }
});

test('V-24 item 6: low-rating providers matching keyword still appear when dataset exceeds candidate ceiling', async () => {
  // Set candidate ceiling to 10
  const originalEnvValue = env.providerSearchMaxCandidates;
  env.providerSearchMaxCandidates = 10;

  const originalUserFind = User.find;
  const originalProfileFind = ProviderProfile.find;
  const originalCategoryFind = ServiceCategory.find;

  // Total 25 active providers in DB:
  // - 20 providers with high rating (5.0), but business is "Dọn dẹp nhà cửa" (no keyword match)
  // - 5 providers with low rating (1.5), but business is "Thợ Sửa Khóa Cấp Tốc" (keyword match)
  const users = [];
  const allProfiles = [];

  for (let i = 0; i < 20; i++) {
    const uid = new mongoose.Types.ObjectId();
    users.push({ _id: uid, fullName: `Thợ Dọn ${i + 1}` });
    allProfiles.push({
      _id: new mongoose.Types.ObjectId(),
      user: { _id: uid, fullName: `Thợ Dọn ${i + 1}`, status: 'ACTIVE', role: 'PROVIDER' },
      businessName: `Dọn dẹp nhà cửa ${i + 1}`,
      city: 'Hà Nội',
      serviceAreas: ['Cầu Giấy'],
      skills: [],
      serviceCategories: [],
      verificationStatus: 'VERIFIED',
      isDeleted: false,
      averageRating: 5.0,
      reviewCount: 50,
      completedJobCount: 100,
      yearsOfExperience: 10,
    });
  }

  for (let i = 0; i < 5; i++) {
    const uid = new mongoose.Types.ObjectId();
    users.push({ _id: uid, fullName: `Thợ Khóa ${i + 1}` });
    allProfiles.push({
      _id: new mongoose.Types.ObjectId(),
      user: { _id: uid, fullName: `Thợ Khóa ${i + 1}`, status: 'ACTIVE', role: 'PROVIDER' },
      businessName: `Thợ Sửa Khóa Cấp Tốc ${i + 1}`,
      city: 'Hà Nội',
      serviceAreas: ['Cầu Giấy'],
      skills: [],
      serviceCategories: [],
      verificationStatus: 'VERIFIED',
      isDeleted: false,
      averageRating: 1.5, // Low rating!
      reviewCount: 3,
      completedJobCount: 4,
      yearsOfExperience: 2,
    });
  }

  User.find = () => ({
    select: () => ({
      lean: async () => users,
    }),
  });

  ServiceCategory.find = () => ({
    select: () => ({
      lean: async () => [],
    }),
  });

  ProviderProfile.find = (filter) => {
    // Mongo simulates evaluating the keyword filter:
    let matched = allProfiles.filter((p) => {
      if (p.verificationStatus !== filter.verificationStatus) return false;
      if (p.isDeleted !== false) return false;

      if (filter.$or) {
        // Keyword filter condition:
        const kwOr = filter.$or;
        const matchesKw = kwOr.some((cond) => {
          if (cond.businessName && cond.businessName.test(p.businessName)) return true;
          if (cond.city && cond.city.test(p.city)) return true;
          if (cond.user?.$in && cond.user.$in.some((id) => id.toString() === p.user._id.toString())) return true;
          return false;
        });
        if (!matchesKw) return false;
      }
      return true;
    });

    const query = {
      populate() { return query; },
      sort() { return query; },
      limit(n) {
        matched = matched.slice(0, n);
        return query;
      },
      lean: async () => matched,
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
          keyword: 'khóa',
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    // Even though 20 providers had 5.0 rating and ceiling is 10, all 5 low-rating providers matching keyword are returned!
    assert.equal(res.body.data.length, 5);
    assert.equal(res.body.pagination.totalItems, 5);
    assert.equal(res.body.pagination.totalPages, 1);

    // Verify all returned items are the low-rating lock repair providers
    for (const item of res.body.data) {
      assert.equal(item.averageRating, 1.5);
      assert.ok(item.businessName.includes('Khóa'));
    }
  } finally {
    env.providerSearchMaxCandidates = originalEnvValue;
    User.find = originalUserFind;
    ProviderProfile.find = originalProfileFind;
    ServiceCategory.find = originalCategoryFind;
  }
});

test('V-24 item 2: getRecommendedProviders applies hard filters at DB and safe candidate limit without rating cutoff', async () => {
  const targetCatId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const activeUserId = new mongoose.Types.ObjectId();

  const originalUserFind = User.find;
  const originalProfileFind = ProviderProfile.find;
  const originalRequestFindById = ServiceRequest.findById;
  const originalBookingFind = Booking.find;
  const originalBookingAggregate = Booking.aggregate;
  const originalAvailabilityFind = Availability.find;

  let capturedFilter = null;
  let capturedSortWasCalled = false;
  let capturedLimit = null;

  User.find = () => ({
    select: () => ({
      lean: async () => [{ _id: activeUserId, fullName: 'Thợ Giỏi' }],
    }),
  });

  ServiceRequest.findById = () => ({
    populate() { return this; },
    lean: async () => ({
      _id: requestId,
      status: 'OPEN',
      customer: customerId,
      category: { _id: targetCatId, name: 'Điện Lạnh' },
      preferredStartAt: new Date(Date.now() + 3600000),
      address: { city: 'Đà Nẵng', district: 'Hải Châu' },
      declinedProviders: [],
    }),
  });

  ProviderProfile.find = (filter) => {
    capturedFilter = filter;
    const query = {
      populate() { return query; },
      sort() {
        capturedSortWasCalled = true;
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
    assert.deepEqual(capturedFilter.user, { $in: [activeUserId] });
    assert.equal(capturedFilter.skills.toString(), targetCatId.toString());

    // Verify that sort by rating was NOT called before distance/schedule matching (V-24 item 2)
    assert.equal(capturedSortWasCalled, false, 'getRecommendedProviders must not cut off by rating before matching');
    assert.equal(capturedLimit, env.providerRecommendMaxCandidates || 200);
  } finally {
    User.find = originalUserFind;
    ProviderProfile.find = originalProfileFind;
    ServiceRequest.findById = originalRequestFindById;
    Booking.find = originalBookingFind;
    Booking.aggregate = originalBookingAggregate;
    Availability.find = originalAvailabilityFind;
  }
});
