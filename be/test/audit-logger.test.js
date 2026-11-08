const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  logAuditEvent,
  sanitizeDetails,
  maskEmail,
  maskPhone,
  setAuditLogSink,
} = require('../src/shared/audit-logger.js');
const verificationService = require('../src/modules/provider-verification/providerVerification.service.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const adminUserController = require('../src/modules/users/admin.user.controller.js');
const User = require('../src/modules/users/user.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const Complaint = require('../src/modules/complaints/complaint.model.js');
const {
  activatePaymentAndSubscription,
} = require('../src/modules/payments/membership-payment.service.js');
const MembershipPayment = require('../src/modules/payments/membership-payment.model.js');
const ProviderSubscription = require('../src/modules/payments/provider-subscription.model.js');

test('maskEmail masks local part preserving first/last characters', () => {
  assert.equal(maskEmail('admin@homecare.local'), 'a***n@homecare.local');
  assert.equal(maskEmail('me@domain.com'), '*@domain.com');
  assert.equal(maskEmail(null), undefined);
});

test('maskPhone masks phone preserving last 4 digits', () => {
  assert.equal(maskPhone('0901234567'), '***4567');
  assert.equal(maskPhone('123'), undefined);
});

test('sanitizeDetails strips secrets and masks PII', () => {
  const details = {
    password: 'SuperSecretPassword!',
    token: 'jwt.token.here',
    accessToken: 'secret_access_token',
    email: 'user@example.com',
    phone: '0987654321',
    normalField: 'acceptable_value',
    nested: {
      passwordHash: 'hashed_password',
      safeInfo: 12345,
    },
  };
  const cleaned = sanitizeDetails(details);
  assert.equal(cleaned.password, undefined);
  assert.equal(cleaned.token, undefined);
  assert.equal(cleaned.accessToken, undefined);
  assert.equal(cleaned.email, 'u***r@example.com');
  assert.equal(cleaned.phone, '***4321');
  assert.equal(cleaned.normalField, 'acceptable_value');
  assert.equal(cleaned.nested.passwordHash, undefined);
  assert.equal(cleaned.nested.safeInfo, 12345);
});

test('sanitizeDetails removes secrets inside nested arrays', () => {
  const result = sanitizeDetails({
    events: [{ password: 'hidden', otp: 'hidden', refresh_token: 'hidden', apiKey: 'hidden', action: 'LOGIN' }],
  });
  assert.deepEqual(result, { events: [{ action: 'LOGIN' }] });
});

test('logAuditEvent captures structured JSON with required fields', () => {
  const emitted = [];
  setAuditLogSink((record) => emitted.push(record));

  try {
    const record = logAuditEvent({
      actorId: 'admin_123',
      role: 'ADMIN',
      action: 'TEST_SENSITIVE_ACTION',
      targetType: 'SYSTEM_CONFIG',
      targetId: 'cfg_999',
      ip: '127.0.0.1',
      result: 'SUCCESS',
      details: { foo: 'bar', password: 'should_be_stripped' },
    });

    assert.equal(emitted.length, 1);
    const log = emitted[0];
    assert.equal(log.actorId, 'admin_123');
    assert.equal(log.role, 'ADMIN');
    assert.equal(log.action, 'TEST_SENSITIVE_ACTION');
    assert.equal(log.targetType, 'SYSTEM_CONFIG');
    assert.equal(log.targetId, 'cfg_999');
    assert.equal(log.ip, '127.0.0.1');
    assert.equal(log.result, 'SUCCESS');
    assert.ok(typeof log.timestamp === 'string');
    assert.equal(log.details.foo, 'bar');
    assert.equal(log.details.password, undefined);
  } finally {
    setAuditLogSink(null);
  }
});

test('provider verification approve/reject emits security audit log', async () => {
  const emitted = [];
  setAuditLogSink((record) => emitted.push(record));

  const origFindById = ProviderProfile.findById;
  const origFindOne = ProviderProfile.findOne;
  try {
    const profileId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const providerUserId = new mongoose.Types.ObjectId();

    const mockProfile = {
      _id: profileId,
      user: providerUserId,
      verificationStatus: 'PENDING',
      verificationLogs: [],
      save: async () => {},
    };

    ProviderProfile.findById = () => ({
      ...mockProfile,
      save: async () => {},
    });

    ProviderProfile.findOne = () => {
      const chain = {
        populate() {
          return chain;
        },
        lean: async () => ({ ...mockProfile }),
      };
      return chain;
    };

    // Test approveProvider
    await verificationService.approveProvider(profileId, adminId, 'Approved after check', {
      role: 'ADMIN',
      ip: '10.0.0.1',
    });

    const approveLog = emitted.find((l) => l.action === 'PROVIDER_VERIFICATION_APPROVE');
    assert.ok(approveLog, 'Expected PROVIDER_VERIFICATION_APPROVE audit log');
    assert.equal(approveLog.actorId, adminId.toString());
    assert.equal(approveLog.role, 'ADMIN');
    assert.equal(approveLog.targetType, 'PROVIDER_PROFILE');
    assert.equal(approveLog.targetId, profileId.toString());
    assert.equal(approveLog.ip, '10.0.0.1');
    assert.equal(approveLog.result, 'SUCCESS');

    // Test rejectProvider
    await verificationService.rejectProvider(profileId, adminId, 'Lý do từ chối: giấy tờ mờ', {
      role: 'ADMIN',
      ip: '10.0.0.2',
    });

    const rejectLog = emitted.find((l) => l.action === 'PROVIDER_VERIFICATION_REJECT');
    assert.ok(rejectLog, 'Expected PROVIDER_VERIFICATION_REJECT audit log');
    assert.equal(rejectLog.actorId, adminId.toString());
    assert.equal(rejectLog.targetType, 'PROVIDER_PROFILE');
    assert.equal(rejectLog.targetId, profileId.toString());
    assert.equal(rejectLog.ip, '10.0.0.2');
    assert.equal(rejectLog.result, 'SUCCESS');
  } finally {
    ProviderProfile.findById = origFindById;
    ProviderProfile.findOne = origFindOne;
    setAuditLogSink(null);
  }
});

test('admin user role and status updates emit audit logs', async () => {
  const emitted = [];
  setAuditLogSink((record) => emitted.push(record));

  const origFindById = User.findById;
  const origFindOne = User.findOne;
  const origCount = User.countDocuments;
  const origProfCount = ProviderProfile.countDocuments;
  const origReqCount = ServiceRequest.countDocuments;
  const origBookCount = Booking.countDocuments;
  const origAvailCount = Availability.countDocuments;
  const origRevCount = Review.countDocuments;
  const origCompCount = Complaint.countDocuments;

  try {
    const targetUserId = new mongoose.Types.ObjectId();
    const adminUserId = new mongoose.Types.ObjectId();

    const mockUserDoc = {
      _id: targetUserId,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      fullName: 'Customer Test',
      email: 'cust@example.com',
      tokenVersion: 1,
      set(data) {
        Object.assign(this, data);
      },
      save: async () => {},
      comparePassword: async () => false,
      deleteOne: async () => {},
    };

    User.findById = () => ({
      select: () => Promise.resolve(mockUserDoc),
    });
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = () => Promise.resolve(2);

    const req = {
      params: { id: targetUserId.toString() },
      user: { _id: adminUserId, role: 'ADMIN' },
      adminUserData: { role: 'STAFF', status: 'BLOCKED' },
      ip: '192.168.1.50',
    };
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
    };

    await adminUserController.updateUser(req, res);
    assert.ok(responseData.success);

    const roleLog = emitted.find((l) => l.action === 'USER_ROLE_CHANGE');
    assert.ok(roleLog, 'Expected USER_ROLE_CHANGE audit log');
    assert.equal(roleLog.actorId, adminUserId.toString());
    assert.equal(roleLog.targetId, targetUserId.toString());
    assert.equal(roleLog.details.previousRole, 'CUSTOMER');
    assert.equal(roleLog.details.newRole, 'STAFF');

    const statusLog = emitted.find((l) => l.action === 'USER_STATUS_CHANGE');
    assert.ok(statusLog, 'Expected USER_STATUS_CHANGE audit log');
    assert.equal(statusLog.actorId, adminUserId.toString());
    assert.equal(statusLog.targetId, targetUserId.toString());
    assert.equal(statusLog.details.previousStatus, 'ACTIVE');
    assert.equal(statusLog.details.newStatus, 'BLOCKED');

    // Stub count queries for deleteUser
    ProviderProfile.countDocuments = () => Promise.resolve(0);
    ServiceRequest.countDocuments = () => Promise.resolve(0);
    Booking.countDocuments = () => Promise.resolve(0);
    Availability.countDocuments = () => Promise.resolve(0);
    Review.countDocuments = () => Promise.resolve(0);
    Complaint.countDocuments = () => Promise.resolve(0);

    User.findById = () => ({
      select: () => Promise.resolve(mockUserDoc),
    });
    let deleteResponse = null;
    const resDel = {
      json: (data) => {
        deleteResponse = data;
      },
    };
    await adminUserController.deleteUser(
      {
        params: { id: targetUserId.toString() },
        user: { _id: adminUserId, role: 'ADMIN' },
        ip: '192.168.1.50',
      },
      resDel,
    );
    assert.ok(deleteResponse.success);

    const deleteLog = emitted.find((l) => l.action === 'USER_DELETE');
    assert.ok(deleteLog, 'Expected USER_DELETE audit log');
    assert.equal(deleteLog.actorId, adminUserId.toString());
    assert.equal(deleteLog.targetId, targetUserId.toString());
    assert.equal(deleteLog.result, 'SUCCESS');
  } finally {
    User.findById = origFindById;
    User.findOne = origFindOne;
    User.countDocuments = origCount;
    ProviderProfile.countDocuments = origProfCount;
    ServiceRequest.countDocuments = origReqCount;
    Booking.countDocuments = origBookCount;
    Availability.countDocuments = origAvailCount;
    Review.countDocuments = origRevCount;
    Complaint.countDocuments = origCompCount;
    setAuditLogSink(null);
  }
});

test('membership payment activation emits audit log with payment metadata', async () => {
  const emitted = [];
  setAuditLogSink((record) => emitted.push(record));

  const origStartSession = mongoose.startSession;
  try {
    const paymentId = new mongoose.Types.ObjectId();
    const providerId = new mongoose.Types.ObjectId();
    const subscriptionId = new mongoose.Types.ObjectId();
    const planId = new mongoose.Types.ObjectId();

    const mockPayment = {
      _id: paymentId,
      provider: providerId,
      subscription: subscriptionId,
      plan: planId,
      planNameSnapshot: 'VIP Pro',
      amount: 199000,
      currency: 'VND',
      orderCode: 987654321,
      status: 'PENDING',
      appliedAt: null,
      save: async () => {},
    };

    const mockSubscription = {
      _id: subscriptionId,
      provider: providerId,
      status: 'INACTIVE',
      save: async () => {},
    };

    mongoose.startSession = async () => ({
      withTransaction: async (fn) => {
        const origPaymentFindOne = MembershipPayment.findOne;
        const origSubFindById = ProviderSubscription.findById;
        MembershipPayment.findOne = () => ({
          session: () => Promise.resolve(mockPayment),
        });
        ProviderSubscription.findById = () => ({
          session: () => Promise.resolve(mockSubscription),
        });
        try {
          await fn();
        } finally {
          MembershipPayment.findOne = origPaymentFindOne;
          ProviderSubscription.findById = origSubFindById;
        }
      },
      endSession: async () => {},
    });

    const result = await activatePaymentAndSubscription({
      paymentId,
      reference: 'PAYOS-REF-001',
      actorId: providerId.toString(),
      role: 'PROVIDER',
      ip: '1.2.3.4',
    });

    assert.equal(result.status, 'PAID');
    assert.equal(result.alreadyApplied, false);

    const paymentLog = emitted.find((l) => l.action === 'MEMBERSHIP_PAYMENT_SUCCESS');
    assert.ok(paymentLog, 'Expected MEMBERSHIP_PAYMENT_SUCCESS audit log');
    assert.equal(paymentLog.actorId, providerId.toString());
    assert.equal(paymentLog.role, 'PROVIDER');
    assert.equal(paymentLog.targetType, 'MEMBERSHIP_PAYMENT');
    assert.equal(paymentLog.targetId, paymentId.toString());
    assert.equal(paymentLog.ip, '1.2.3.4');
    assert.equal(paymentLog.result, 'SUCCESS');
    assert.equal(paymentLog.details.orderCode, 987654321);
    assert.equal(paymentLog.details.amount, 199000);
    assert.equal(paymentLog.details.currency, 'VND');
  } finally {
    mongoose.startSession = origStartSession;
    setAuditLogSink(null);
  }
});
