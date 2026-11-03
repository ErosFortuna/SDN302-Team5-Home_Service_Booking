const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const MembershipPayment = require('../src/modules/payments/membership-payment.model.js');
const User = require('../src/modules/users/user.model.js');
const {
  validateProfileInput,
  createMyProviderProfile,
  updateMyProviderProfile,
  deleteMyProviderProfile,
  getPublicProviderProfile,
} = require('../src/modules/providers/provider-profile.controller.js');
const { AppError } = require('../src/shared/app-error.js');
const { dispatch } = require('../test-helpers/dispatch.js');

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('provider profile routes require authentication and provider role for self-service CRUD', async () => {
  const app = require('../src/app.js');

  const selfPaths = [
    ['GET', '/provider/profile'],
    ['POST', '/provider/profile'],
    ['PATCH', '/provider/profile'],
    ['DELETE', '/provider/profile'],
  ];
  for (const [method, path] of selfPaths) {
    const response = await dispatch(app, { method, url: `/api${path}` });
    assert.equal(response.status, 401, `${method} ${path} should require authentication`);
  }

  const publicResponse = await dispatch(app, {
    method: 'GET',
    url: '/api/providers/507f1f77bcf86cd799439011',
  });
  assert.equal(publicResponse.status, 401, 'public profile reads still require an authenticated user');
});

test('provider profile route does not shadow the existing provider search endpoint', async () => {
  const userId = new mongoose.Types.ObjectId();
  const originalUserFindById = User.findById;
  const originalProfileFind = ProviderProfile.find;
  User.findById = () => ({
    select: async () => ({ _id: userId, role: 'CUSTOMER', status: 'ACTIVE' }),
  });
  ProviderProfile.find = () => ({
    populate() { return this; },
    lean: async () => [],
  });

  const app = require('../src/app.js');
  const token = jwt.sign({ sub: userId.toString() }, env.jwtSecret, { expiresIn: '1m' });

  try {
    const response = await dispatch(app, {
      method: 'GET',
      url: '/api/providers/search',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, []);
  } finally {
    User.findById = originalUserFindById;
    ProviderProfile.find = originalProfileFind;
  }
});

test('provider profile input accepts only editable fields and validates business data', () => {
  const providerId = new mongoose.Types.ObjectId().toString();
  assert.deepEqual(validateProfileInput({
    businessName: '  Aqua Fix  ',
    yearsOfExperience: 5,
    serviceAreas: [' Hai Chau ', 'Hai Chau', 'Thanh Khe'],
    location: { type: 'Point', coordinates: [108.2, 16.05] },
  }), {
    businessName: 'Aqua Fix',
    yearsOfExperience: 5,
    serviceAreas: ['Hai Chau', 'Thanh Khe'],
    location: { type: 'Point', coordinates: [108.2, 16.05] },
  });
  assert.deepEqual(validateProfileInput({
    documents: [`https://res.cloudinary.com/demo/image/upload/v123/home-service-booking/provider-documents/${providerId}/identity.jpg`],
  }, { userId: providerId }).documents.length, 1);

  for (const payload of [
    { verificationStatus: 'VERIFIED' },
    { averageRating: 5 },
    { user: new mongoose.Types.ObjectId().toString() },
    { yearsOfExperience: 2.5 },
    { yearsOfExperience: 81 },
    { serviceAreas: [''] },
    { location: { type: 'Point', coordinates: [181, 91] } },
    { documents: [`https://res.cloudinary.com/demo/image/upload/v123/home-service-booking/provider-documents/${new mongoose.Types.ObjectId()}/identity.jpg`] },
    {},
  ]) {
    assert.throws(() => validateProfileInput(payload), (error) =>
      error instanceof AppError && error.statusCode === 400);
  }
});

test('provider creates profile only for authenticated identity and handles duplicate race', async () => {
  const userId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const originalFindOne = ProviderProfile.findOne;
  const originalCreate = ProviderProfile.create;
  ProviderProfile.findOne = () => ({
    select() { return this; },
    lean: async () => null,
  });
  ProviderProfile.create = async (payload) => {
    assert.equal(payload.user, userId);
    assert.equal(payload.verificationStatus, undefined);
    return {
      _id: profileId,
      ...payload,
      verificationStatus: 'PENDING',
      yearsOfExperience: payload.yearsOfExperience ?? 0,
      averageRating: 0,
      reviewCount: 0,
      completedJobCount: 0,
      skills: [],
    };
  };

  try {
    const res = mockResponse();
    await createMyProviderProfile({ user: { _id: userId }, body: { businessName: 'Aqua Fix' } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.id, profileId.toString());
    assert.equal(res.body.data.verificationStatus, 'PENDING');

    ProviderProfile.create = async () => {
      const error = new Error('duplicate key');
      error.code = 11000;
      throw error;
    };
    await assert.rejects(
      createMyProviderProfile({ user: { _id: userId }, body: { businessName: 'Aqua Fix' } }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 409,
    );
  } finally {
    ProviderProfile.findOne = originalFindOne;
    ProviderProfile.create = originalCreate;
  }
});

test('provider update cannot mutate protected fields and deleted profiles cannot be edited', async () => {
  const userId = new mongoose.Types.ObjectId();
  const originalFindOne = ProviderProfile.findOne;
  const profile = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    verificationStatus: 'PENDING',
    yearsOfExperience: 1,
    skills: [],
    async save() {},
  };
  ProviderProfile.findOne = async () => profile;

  try {
    await assert.rejects(
      updateMyProviderProfile({
        user: { _id: userId },
        body: { verificationStatus: 'VERIFIED' },
      }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 400,
    );

    const res = mockResponse();
    await updateMyProviderProfile({
      user: { _id: userId },
      body: { businessName: 'New Name', yearsOfExperience: 3 },
    }, res);
    assert.equal(profile.businessName, 'New Name');
    assert.equal(profile.yearsOfExperience, 3);
    assert.equal(profile.verificationStatus, 'PENDING');

    profile.isDeleted = true;
    await assert.rejects(
      updateMyProviderProfile({ user: { _id: userId }, body: { bio: 'Updated bio' } }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 410,
    );
  } finally {
    ProviderProfile.findOne = originalFindOne;
  }
});

test('soft delete preserves history and blocks active bookings or pending checkouts', async () => {
  const userId = new mongoose.Types.ObjectId();
  const originalProfileFindOne = ProviderProfile.findOne;
  const originalBookingExists = Booking.exists;
  const originalPaymentExists = MembershipPayment.exists;
  const profile = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    verificationStatus: 'VERIFIED',
    skills: [],
    isDeleted: false,
    async save() {},
  };
  ProviderProfile.findOne = async () => profile;
  Booking.exists = async () => null;
  MembershipPayment.exists = async () => null;

  try {
    const res = mockResponse();
    await deleteMyProviderProfile({ user: { _id: userId } }, res);
    assert.equal(profile.isDeleted, true);
    assert.ok(profile.deletedAt instanceof Date);
    assert.equal(res.body.data.isDeleted, true);

    profile.isDeleted = false;
    Booking.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
    await assert.rejects(
      deleteMyProviderProfile({ user: { _id: userId } }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 409,
    );

    Booking.exists = async () => null;
    MembershipPayment.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
    await assert.rejects(
      deleteMyProviderProfile({ user: { _id: userId } }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 409,
    );
  } finally {
    ProviderProfile.findOne = originalProfileFindOne;
    Booking.exists = originalBookingExists;
    MembershipPayment.exists = originalPaymentExists;
  }
});

test('public profile lookup excludes unverified/deleted profiles and private fields', async () => {
  const userId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const originalFindOne = ProviderProfile.findOne;
  let profileFilter;
  ProviderProfile.findOne = (filter) => {
    profileFilter = filter;
    return {
      populate() { return this; },
      lean: async () => ({
        _id: profileId,
        user: { _id: userId, fullName: 'Provider Name', avatarUrl: null },
        businessName: 'Aqua Fix',
        verificationStatus: 'VERIFIED',
        documents: ['private-document-url'],
        payoutInfo: { account: 'private' },
        skills: [{ _id: new mongoose.Types.ObjectId(), name: 'Plumbing', slug: 'plumbing' }],
        serviceAreas: ['District 1'],
      }),
    };
  };

  try {
    const res = mockResponse();
    await getPublicProviderProfile({ params: { providerId: userId.toString() } }, res);
    assert.deepEqual(profileFilter, {
      user: userId.toString(),
      verificationStatus: 'VERIFIED',
      isDeleted: { $ne: true },
    });
    assert.equal(res.body.data.businessName, 'Aqua Fix');
    assert.equal('documents' in res.body.data, false);
    assert.equal('payoutInfo' in res.body.data, false);
    assert.equal('email' in res.body.data, false);
  } finally {
    ProviderProfile.findOne = originalFindOne;
  }
});
