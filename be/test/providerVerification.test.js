const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const ProviderProfileFromVerification = require('../src/modules/provider-verification/providerProfile.model.js');
const User = require('../src/modules/users/user.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Notification = require('../src/modules/notifications/notification.model.js');
const {
  validateListProvidersQuery,
  validateRejectPayload,
  validateRequestInfoPayload,
  validateApprovePayload,
  validateResubmitPayload,
} = require('../src/modules/provider-verification/providerVerification.validation.js');
const providerVerificationService = require('../src/modules/provider-verification/providerVerification.service.js');
const {
  getRecommendedProviders,
  searchProviders,
} = require('../src/modules/providers/provider.controller.js');
const { selectProvider } = require('../src/modules/bookings/booking.controller.js');
const { AppError } = require('../src/shared/app-error.js');
const { dispatch } = require('../test-helpers/dispatch.js');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

test('provider-verification: validates list providers query and normalizes APPROVED -> VERIFIED', () => {
  const req1 = { query: { status: 'pending', search: '  Nguyen Van A  ', page: '2', limit: '20' } };
  validateListProvidersQuery(req1, {}, (err) => {
    assert.ifError(err);
    assert.equal(req1.validatedQuery.status, 'PENDING');
    assert.equal(req1.validatedQuery.search, 'Nguyen Van A');
    assert.equal(req1.validatedQuery.page, 2);
    assert.equal(req1.validatedQuery.limit, 20);
  });

  const reqApprovedAlias = { query: { status: 'APPROVED' } };
  validateListProvidersQuery(reqApprovedAlias, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqApprovedAlias.validatedQuery.status, 'VERIFIED');
  });

  const reqVerified = { query: { status: 'VERIFIED' } };
  validateListProvidersQuery(reqVerified, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqVerified.validatedQuery.status, 'VERIFIED');
  });

  const reqInvalidStatus = { query: { status: 'INVALID_STATUS' } };
  validateListProvidersQuery(reqInvalidStatus, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });

  const reqInvalidPage = { query: { page: '0' } };
  validateListProvidersQuery(reqInvalidPage, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

test('provider-verification: validates reject decision payload', () => {
  const reqValid = { body: { adminReviewNote: 'Giấy tờ CCCD bị mờ, không nhìn rõ số' } };
  validateRejectPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedNote, 'Giấy tờ CCCD bị mờ, không nhìn rõ số');
  });

  // Rejects when reason is missing or too short
  const reqShort = { body: { adminReviewNote: 'ko' } };
  validateRejectPayload(reqShort, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });

  const reqEmpty = { body: {} };
  validateRejectPayload(reqEmpty, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });
});

test('provider-verification: validates request info payload', () => {
  const reqValid = { body: { adminReviewNote: 'Vui lòng tải lên thêm chứng chỉ hành nghề thợ điện' } };
  validateRequestInfoPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedNote, 'Vui lòng tải lên thêm chứng chỉ hành nghề thợ điện');
  });

  const reqEmpty = { body: {} };
  validateRequestInfoPayload(reqEmpty, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });
});

test('provider-verification: validates approve payload', () => {
  const reqCustom = { body: { adminReviewNote: 'Đã xác minh đầy đủ giấy tờ hợp lệ.' } };
  validateApprovePayload(reqCustom, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqCustom.validatedNote, 'Đã xác minh đầy đủ giấy tờ hợp lệ.');
  });

  const reqDefault = { body: {} };
  validateApprovePayload(reqDefault, {}, (err) => {
    assert.ifError(err);
    assert.ok(reqDefault.validatedNote.includes('phê duyệt'));
  });
});

test('provider-verification: validates resubmit payload', () => {
  const userId = '64b1f2a3c4d5e6f7a8b9c0d1';
  const reqValid = {
    user: { _id: userId, role: 'PROVIDER' },
    body: {
      businessName: 'Điện Lạnh Phát Đạt',
      description: 'Chuyên sửa điều hòa dân dụng',
      documents: [
        { docType: 'ID_CARD', fileUrl: `https://res.cloudinary.com/demo/image/upload/v123/home-service-booking/provider-documents/${userId}/cccd.png` },
        `https://res.cloudinary.com/demo/image/upload/v123/home-service-booking/provider-documents/${userId}/cert.png`,
      ],
      note: 'Em đã bổ sung lại ảnh CCCD rõ nét',
    },
  };

  validateResubmitPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedResubmit.businessName, 'Điện Lạnh Phát Đạt');
    assert.equal(reqValid.validatedResubmit.documents.length, 2);
    assert.equal(reqValid.validatedResubmit.documents[0].docType, 'ID_CARD');
    assert.equal(reqValid.validatedResubmit.documents[1].docType, 'OTHER');
  });
});

test('BUG-15: unified ProviderProfile schema includes city, location, isDeleted, deletedAt, single 2dsphere index, and enum without APPROVED', () => {
  assert.strictEqual(ProviderProfile, ProviderProfileFromVerification);

  const paths = ProviderProfile.schema.paths;
  for (const field of ['city', 'location', 'isDeleted', 'deletedAt', 'description', 'serviceCategories', 'verificationLogs']) {
    assert.ok(paths[field], `Expected ProviderProfile schema to contain field '${field}'`);
  }

  const statusEnum = paths.verificationStatus.enumValues;
  assert.deepEqual(statusEnum, ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']);
  assert.equal(statusEnum.includes('APPROVED'), false, 'APPROVED must not exist in verificationStatus enum');

  const logStatusEnum = paths.verificationLogs.schema.paths.status.enumValues;
  assert.deepEqual(logStatusEnum, ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']);

  const logRoleEnum = paths.verificationLogs.schema.paths.role.enumValues;
  assert.deepEqual(logRoleEnum, ['ADMIN', 'STAFF', 'PROVIDER']);
  assert.ok(paths.verificationLogs.schema.paths.ip, 'verificationLogs must define ip path');

  const geoIndexes = ProviderProfile.schema.indexes().filter(([spec]) => spec.location === '2dsphere');
  assert.equal(geoIndexes.length, 1, '2dsphere index on location must be declared exactly once');
});

test('BUG-15 Regression: after approveProvider, provider has VERIFIED status, appears in recommendations/search, and is selectable via selectProvider; non-verified statuses are rejected', async () => {
  const providerUserId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const serviceId = new mongoose.Types.ObjectId();

  const originals = {
    profileFindById: ProviderProfile.findById,
    profileFindOne: ProviderProfile.findOne,
    profileFind: ProviderProfile.find,
    requestFindById: ServiceRequest.findById,
    requestFindOneAndUpdate: ServiceRequest.findOneAndUpdate,
    userFindById: User.findById,
    bookingFind: Booking.find,
    bookingFindOne: Booking.findOne,
    bookingAggregate: Booking.aggregate,
    reviewAggregate: Review.aggregate,
    bookingCreate: Booking.create,
    availFind: Availability.find,
    availFindOne: Availability.findOne,
    notifCreate: Notification.create,
    startSession: mongoose.startSession,
  };

  const mockProfileDoc = {
    _id: profileId,
    user: { _id: providerUserId, fullName: 'Thợ Điện Minh', status: 'ACTIVE', role: 'PROVIDER' },
    businessName: 'Điện Nước Minh',
    verificationStatus: 'UNDER_REVIEW',
    verificationLogs: [],
    isDeleted: false,
    skills: [categoryId],
    city: 'Đà Nẵng',
    serviceAreas: ['Hải Châu'],
    averageRating: 4.8,
    reviewCount: 12,
    completedJobCount: 25,
    yearsOfExperience: 5,
    async save() {
      return this;
    },
  };

  ProviderProfile.findById = async () => mockProfileDoc;
  ProviderProfile.findOne = () => {
    const chain = {
      populate() {
        return chain;
      },
      lean: async () => ({ ...mockProfileDoc }),
      then: (res, rej) => Promise.resolve(mockProfileDoc).then(res, rej),
    };
    return chain;
  };

  const reqDoc = {
    _id: requestId,
    customer: customerId,
    status: 'OPEN',
    category: categoryId,
    service: {
      _id: serviceId,
      name: 'Sửa điện',
      category: categoryId,
      basePrice: 150000,
      estimatedDurationMinutes: 60,
    },
    address: { city: 'Đà Nẵng', district: 'Hải Châu', addressLine: '123 Lê Lợi' },
    preferredStartAt: new Date(Date.now() + 86400000),
    preferredEndAt: new Date(Date.now() + 90000000),
    declinedProviders: [],
  };

  ServiceRequest.findById = () => {
    const chain = {
      populate() {
        return chain;
      },
      lean: async () => reqDoc,
      then: (res, rej) => Promise.resolve(reqDoc).then(res, rej),
    };
    return chain;
  };
  ServiceRequest.findOneAndUpdate = async () => ({ ...reqDoc, status: 'BOOKED' });

  ProviderProfile.find = (query) => {
    const matches =
      mockProfileDoc.verificationStatus === query.verificationStatus ? [mockProfileDoc] : [];
    return {
      populate() {
        return this;
      },
      lean: async () => matches,
    };
  };

  User.findById = async () => ({
    _id: providerUserId,
    role: 'PROVIDER',
    status: 'ACTIVE',
  });

  Booking.find = () => ({
    select() {
      return this;
    },
    lean: async () => [],
  });
  Booking.findOne = async () => null;
  Booking.aggregate = async (pipeline) => {
    if (pipeline.some((stage) => stage.$group?.count)) {
      return [{ _id: providerUserId, count: 3 }];
    }
    return [];
  };
  Review.aggregate = async () => [{
    _id: providerUserId,
    averageRating: 4.7,
    reviewCount: 4,
  }];
  Booking.create = async ([data]) => [
    {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      toJSON: function () { return { ...this }; },
      populate: async function () {
        return this;
      },
    },
  ];
  Availability.find = () => ({ lean: async () => [] });
  Availability.findOne = () => ({ lean: async () => null });
  Notification.create = async () => ({});
  mongoose.startSession = async () => ({
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession() {},
  });

  try {
    // 1. Approve provider -> must set VERIFIED
    await providerVerificationService.approveProvider(
      profileId.toString(),
      adminId.toString(),
      'Hồ sơ đạt chuẩn'
    );
    assert.equal(mockProfileDoc.verificationStatus, 'VERIFIED');
    assert.equal(mockProfileDoc.verificationLogs.at(-1).status, 'VERIFIED');

    // 2. Appears in getRecommendedProviders
    const recRes = mockRes();
    await getRecommendedProviders(
      {
        params: { requestId: requestId.toString() },
        recommendedQuery: { limit: 10, radiusKm: 15, sortBy: 'score' },
        user: { _id: customerId },
      },
      recRes,
      (err) => {
        if (err) throw err;
      }
    );
    assert.equal(recRes.body.count, 1);
    assert.equal(recRes.body.data[0].providerId, providerUserId.toString());

    // 3. Appears in searchProviders
    const searchRes = mockRes();
    await searchProviders(
      {
        searchQuery: { page: 1, limit: 10, city: 'Đà Nẵng', minRating: 4.5 },
      },
      searchRes
    );
    assert.equal(searchRes.body.data.length, 1);
    assert.equal(searchRes.body.data[0].providerId, providerUserId.toString());
    assert.equal(searchRes.body.data[0].averageRating, 4.7);
    assert.equal(searchRes.body.data[0].reviewCount, 4);
    assert.equal(searchRes.body.data[0].completedJobCount, 3);

    // 4. Can be selected via selectProvider (201)
    const selRes = mockRes();
    let selErr = null;
    await selectProvider(
      {
        params: { requestId: requestId.toString() },
        body: { providerId: providerUserId.toString() },
        user: { _id: customerId },
      },
      selRes,
      (err) => {
        selErr = err;
      }
    );
    assert.equal(selErr, null);
    assert.equal(selRes.statusCode, 201);

    // 5. Non-verified statuses (PENDING, UNDER_REVIEW, REJECTED) must be excluded & rejected
    for (const nonVerifiedStatus of ['PENDING', 'UNDER_REVIEW', 'REJECTED']) {
      mockProfileDoc.verificationStatus = nonVerifiedStatus;

      const recRes2 = mockRes();
      await getRecommendedProviders(
        {
          params: { requestId: requestId.toString() },
          recommendedQuery: { limit: 10, radiusKm: 15, sortBy: 'score' },
          user: { _id: customerId },
        },
        recRes2,
        (err) => {
          if (err) throw err;
        }
      );
      assert.equal(recRes2.body.count, 0, `${nonVerifiedStatus} must not appear in recommendations`);

      const searchRes2 = mockRes();
      await searchProviders({ searchQuery: { page: 1, limit: 10 } }, searchRes2);
      assert.equal(searchRes2.body.data.length, 0, `${nonVerifiedStatus} must not appear in search`);

      await assert.rejects(
        () =>
          selectProvider(
            {
              params: { requestId: requestId.toString() },
              body: { providerId: providerUserId.toString() },
              user: { _id: customerId },
            },
            mockRes()
          ),
        (err) => err instanceof AppError && err.statusCode === 422,
        `${nonVerifiedStatus} must be rejected by selectProvider`
      );
    }
  } finally {
    ProviderProfile.findById = originals.profileFindById;
    ProviderProfile.findOne = originals.profileFindOne;
    ProviderProfile.find = originals.profileFind;
    ServiceRequest.findById = originals.requestFindById;
    ServiceRequest.findOneAndUpdate = originals.requestFindOneAndUpdate;
    User.findById = originals.userFindById;
    Booking.find = originals.bookingFind;
    Booking.findOne = originals.bookingFindOne;
    Booking.aggregate = originals.bookingAggregate;
    Review.aggregate = originals.reviewAggregate;
    Booking.create = originals.bookingCreate;
    Availability.find = originals.availFind;
    Availability.findOne = originals.availFindOne;
    Notification.create = originals.notifCreate;
    mongoose.startSession = originals.startSession;
  }
});

test('V-17 / BUG-16 Regression: STAFF can review/reject/request-info but blocked with 403 on approve (only ADMIN allowed); self-review is forbidden; verificationLogs store role and ip', async () => {
  const app = require('../src/app.js');
  const profileId = new mongoose.Types.ObjectId();
  const providerUserId = new mongoose.Types.ObjectId();

  const originals = {
    userFindById: User.findById,
    profileFind: ProviderProfile.find,
    profileCount: ProviderProfile.countDocuments,
    profileFindOne: ProviderProfile.findOne,
    profileFindById: ProviderProfile.findById,
  };

  const roleByUserId = new Map();
  function makeTokenForRole(role) {
    const uid = new mongoose.Types.ObjectId();
    roleByUserId.set(uid.toString(), { _id: uid, role, status: 'ACTIVE' });
    return jwt.sign({ sub: uid.toString() }, env.jwtSecret, { expiresIn: '5m' });
  }

  const adminToken = makeTokenForRole('ADMIN');
  const staffToken = makeTokenForRole('STAFF');
  const customerToken = makeTokenForRole('CUSTOMER');
  const providerToken = makeTokenForRole('PROVIDER');

  const mockProfileDoc = {
    _id: profileId,
    user: { _id: providerUserId, fullName: 'Thợ Kiểm Thử', email: 'p@test.vn', status: 'ACTIVE' },
    verificationStatus: 'PENDING',
    documents: [{ docType: 'ID_CARD', fileUrl: 'https://example.com/id.jpg' }],
    verificationLogs: [],
    async save() {
      return this;
    },
  };

  User.findById = (id) => ({
    select: async () => roleByUserId.get(String(id)) || null,
  });

  ProviderProfile.find = () => {
    const chain = {
      populate() {
        return chain;
      },
      sort() {
        return chain;
      },
      skip() {
        return chain;
      },
      limit() {
        return chain;
      },
      lean: async () => [{ ...mockProfileDoc }],
    };
    return chain;
  };
  ProviderProfile.countDocuments = async () => 1;
  ProviderProfile.findById = async () => mockProfileDoc;
  ProviderProfile.findOne = () => {
    const chain = {
      populate() {
        return chain;
      },
      lean: async () => ({
        ...mockProfileDoc,
        documents: [...mockProfileDoc.documents],
        verificationLogs: [...mockProfileDoc.verificationLogs],
      }),
    };
    return chain;
  };

  const verificationEndpoints = [
    { method: 'GET', url: '/api/admin/providers' },
    { method: 'GET', url: `/api/admin/providers/${profileId}` },
    { method: 'PATCH', url: `/api/admin/providers/${profileId}/start-review` },
    {
      method: 'PATCH',
      url: `/api/admin/providers/${profileId}/approve`,
      body: { adminReviewNote: 'Hồ sơ hợp lệ' },
    },
    {
      method: 'PATCH',
      url: `/api/admin/providers/${profileId}/reject`,
      body: { adminReviewNote: 'Thiếu ảnh CCCD mặt sau' },
    },
    {
      method: 'PATCH',
      url: `/api/admin/providers/${profileId}/request-info`,
      body: { adminReviewNote: 'Vui lòng bổ sung chứng chỉ nghề' },
    },
  ];

  try {
    for (const ep of verificationEndpoints) {
      const isApprove = ep.url.endsWith('/approve');

      // STAFF check
      const staffRes = await dispatch(app, {
        method: ep.method,
        url: ep.url,
        headers: { Authorization: `Bearer ${staffToken}` },
        body: ep.body,
      });
      if (isApprove) {
        assert.equal(
          staffRes.status,
          403,
          `STAFF must be rejected with 403 on ${ep.method} ${ep.url} (V-17)`
        );
      } else {
        assert.equal(
          staffRes.status,
          200,
          `STAFF should be allowed on ${ep.method} ${ep.url}`
        );
      }

      // ADMIN must succeed (200)
      const adminRes = await dispatch(app, {
        method: ep.method,
        url: ep.url,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: ep.body,
      });
      assert.equal(adminRes.status, 200, `ADMIN should be allowed on ${ep.method} ${ep.url}`);

      // CUSTOMER and PROVIDER must be blocked with 403
      for (const [roleName, token] of [
        ['CUSTOMER', customerToken],
        ['PROVIDER', providerToken],
      ]) {
        const forbiddenRes = await dispatch(app, {
          method: ep.method,
          url: ep.url,
          headers: { Authorization: `Bearer ${token}` },
          body: ep.body,
        });
        assert.equal(
          forbiddenRes.status,
          403,
          `${roleName} must be rejected with 403 on ${ep.method} ${ep.url}`
        );
      }
    }

    // Verify STAFF receives sensitive documents & verificationLogs on GET /:id
    const staffDetailRes = await dispatch(app, {
      method: 'GET',
      url: `/api/admin/providers/${profileId}`,
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.ok(Array.isArray(staffDetailRes.body.data.documents), 'STAFF must see provider documents');
    assert.ok(Array.isArray(staffDetailRes.body.data.verificationLogs), 'STAFF must see verificationLogs');

    // Verify verificationLogs recorded role and ip
    assert.ok(mockProfileDoc.verificationLogs.length > 0, 'Verification logs should have entries');
    const approveLog = mockProfileDoc.verificationLogs.find((l) => l.action === 'APPROVE');
    assert.ok(approveLog, 'Should have APPROVE log entry');
    assert.equal(approveLog.role, 'ADMIN', 'Log entry role must be ADMIN');
    assert.ok(approveLog.ip !== undefined, 'Log entry must have ip');

    // Self-review prevention: ADMIN cannot approve/review their own provider profile
    const selfAdminToken = makeTokenForRole('ADMIN');
    const selfAdminId = roleByUserId.get(jwt.decode(selfAdminToken).sub)._id;
    const selfProfileDoc = {
      ...mockProfileDoc,
      user: { _id: selfAdminId, fullName: 'Admin kiêm Thợ', email: 'admin-tho@test.vn' },
    };
    ProviderProfile.findById = async () => selfProfileDoc;

    const selfApproveRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/providers/${profileId}/approve`,
      headers: { Authorization: `Bearer ${selfAdminToken}` },
      body: { adminReviewNote: 'Tự duyệt hồ sơ' },
    });
    assert.equal(selfApproveRes.status, 403, 'Self-approval must return 403 Forbidden');
    assert.match(selfApproveRes.body.message, /Người duyệt không được trùng/i);
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.find = originals.profileFind;
    ProviderProfile.countDocuments = originals.profileCount;
    ProviderProfile.findOne = originals.profileFindOne;
    ProviderProfile.findById = originals.profileFindById;
  }
});
