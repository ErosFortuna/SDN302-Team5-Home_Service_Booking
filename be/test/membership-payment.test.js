const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { env } = require('../src/config/env.js');
const MembershipPlan = require('../src/modules/payments/membership-plan.model.js');
const MembershipPayment = require('../src/modules/payments/membership-payment.model.js');
const { getPayOSClient, resetPayOSClientForTests } = require('../src/modules/payments/payos.client.js');
const {
  addCalendarMonth,
  applyVerifiedPayOSWebhook,
  createMembershipCheckout,
  syncMembershipPaymentStatus,
} = require('../src/modules/payments/membership-payment.service.js');
const { validatePlanInput } = require('../src/modules/payments/membership-plan.controller.js');
const { AppError } = require('../src/shared/app-error.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('membership plans accept server-controlled monthly VND values only', () => {
  assert.deepEqual(validatePlanInput({
    name: 'Monthly',
    slug: 'monthly',
    monthlyPrice: 199000,
    benefits: ['One month access'],
  }), {
    name: 'Monthly',
    slug: 'monthly',
    monthlyPrice: 199000,
    benefits: ['One month access'],
  });
  assert.throws(
    () => validatePlanInput({ name: 'Monthly', slug: 'monthly', monthlyPrice: '199000' }),
    (error) => error instanceof AppError && error.statusCode === 400,
  );
  assert.throws(
    () => validatePlanInput({ name: 'Monthly', slug: 'monthly', monthlyPrice: 199000, version: 99 }),
    (error) => error instanceof AppError && error.statusCode === 400,
  );
});

test('monthly period extension clamps end-of-month dates', () => {
  assert.equal(
    addCalendarMonth(new Date('2026-01-31T12:30:00.000Z')).toISOString(),
    '2026-02-28T12:30:00.000Z',
  );
  assert.equal(
    addCalendarMonth(new Date('2028-01-31T00:00:00.000Z')).toISOString(),
    '2028-02-29T00:00:00.000Z',
  );
});

test('PayOS checkout stores a server-priced pending payment and returns the gateway URL', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
  };
  const originals = {
    subscriptionFindOneAndUpdate: require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate,
    paymentUpdateMany: MembershipPayment.updateMany,
    paymentExists: MembershipPayment.exists,
    paymentCreate: MembershipPayment.create,
    paymentUpdateOne: MembershipPayment.updateOne,
  };
  let createdPayment;
  let payosCreatePayload;

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  resetPayOSClientForTests();
  require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = async () => ({ _id: subscriptionId });
  MembershipPayment.updateMany = async () => ({ modifiedCount: 0 });
  MembershipPayment.exists = async () => null;
  MembershipPayment.create = async (payload) => {
    createdPayment = payload;
    return { _id: paymentId };
  };
  MembershipPayment.updateOne = async () => ({ matchedCount: 1 });
  const payos = getPayOSClient({ requireCheckoutUrls: true });
  payos.paymentRequests.create = async (payload) => {
    payosCreatePayload = payload;
    return {
      orderCode: payload.orderCode,
      amount: payload.amount,
      paymentLinkId: 'payos-link-id',
      checkoutUrl: 'https://pay.payos.vn/web/checkout',
    };
  };

  try {
    const checkout = await createMembershipCheckout({
      user: { _id: providerId },
      plan: { _id: new mongoose.Types.ObjectId(), name: 'Monthly', version: 2, monthlyPrice: 199000 },
    });

    assert.equal(createdPayment.provider, providerId);
    assert.equal(createdPayment.subscription, subscriptionId);
    assert.equal(createdPayment.amount, 199000);
    assert.equal(createdPayment.status, 'PENDING');
    assert.equal(createdPayment.planVersion, 2);
    assert.equal(payosCreatePayload.amount, 199000);
    assert.equal(payosCreatePayload.description, `MB${checkout.orderCode}`);
    assert.equal(payosCreatePayload.returnUrl, 'https://example.test/return');
    assert.equal(payosCreatePayload.cancelUrl, 'https://example.test/cancel');
    assert.equal(checkout.status, 'PENDING');
    assert.equal(checkout.checkoutUrl, 'https://pay.payos.vn/web/checkout');
  } finally {
    require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = originals.subscriptionFindOneAndUpdate;
    MembershipPayment.updateMany = originals.paymentUpdateMany;
    MembershipPayment.exists = originals.paymentExists;
    MembershipPayment.create = originals.paymentCreate;
    MembershipPayment.updateOne = originals.paymentUpdateOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('PayOS webhook rejects invalid signatures before loading a payment', async () => {
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
  };
  const originalFindOne = MembershipPayment.findOne;
  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  resetPayOSClientForTests();
  getPayOSClient().webhooks.verify = async () => {
    throw new Error('bad signature');
  };
  MembershipPayment.findOne = () => {
    throw new Error('Payment must not be queried for an invalid signature');
  };

  try {
    await assert.rejects(
      applyVerifiedPayOSWebhook({ signature: 'invalid' }),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  } finally {
    MembershipPayment.findOne = originalFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('PayOS webhook amount mismatch is rejected without applying membership', async () => {
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
  };
  const originalFindOne = MembershipPayment.findOne;
  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  resetPayOSClientForTests();
  getPayOSClient().webhooks.verify = async (body) => body.data;
  MembershipPayment.findOne = () => ({
    lean: async () => ({
      _id: new mongoose.Types.ObjectId(),
      orderCode: 1234567890,
      amount: 199000,
      currency: 'VND',
      status: 'PENDING',
    }),
  });

  try {
    await assert.rejects(
      applyVerifiedPayOSWebhook({
        success: true,
        data: { orderCode: 1234567890, amount: 1, currency: 'VND', code: '00' },
      }),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  } finally {
    MembershipPayment.findOne = originalFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('verified PayOS webhook applies one calendar month and marks the payment idempotently', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();
  const periodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const payment = {
    _id: paymentId,
    provider: providerId,
    subscription: subscriptionId,
    plan: planId,
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    paymentLinkId: 'payos-link-id',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };
  const subscription = {
    _id: subscriptionId,
    provider: providerId,
    plan: new mongoose.Types.ObjectId(),
    status: 'ACTIVE',
    currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: periodEnd,
    async save() {},
  };
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
  };
  const originals = {
    startSession: mongoose.startSession,
    paymentFindOne: MembershipPayment.findOne,
    paymentFindById: MembershipPayment.findById,
    subscriptionFindById: require('../src/modules/payments/provider-subscription.model.js').findById,
  };
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  resetPayOSClientForTests();
  getPayOSClient().webhooks.verify = async (webhook) => webhook.data;
  mongoose.startSession = async () => session;
  MembershipPayment.findOne = (filter) => {
    if (filter.status === 'PENDING') {
      return { session: async () => payment };
    }
    return { lean: async () => ({ ...payment }) };
  };
  MembershipPayment.findById = () => ({
    session: async () => ({ lean: async () => ({ ...payment }) }),
  });
  require('../src/modules/payments/provider-subscription.model.js').findById = () => ({
    session: async () => subscription,
  });

  try {
    const result = await applyVerifiedPayOSWebhook({
      success: true,
      data: {
        orderCode: payment.orderCode,
        amount: payment.amount,
        currency: payment.currency,
        paymentLinkId: payment.paymentLinkId,
        code: '00',
        reference: 'PAYOS-REFERENCE',
      },
    });

    assert.deepEqual(result, { accepted: true, alreadyApplied: false, status: 'PAID' });
    assert.equal(payment.status, 'PAID');
    assert.ok(payment.appliedAt instanceof Date);
    assert.equal(payment.providerReference, 'PAYOS-REFERENCE');
    assert.equal(subscription.plan, planId);
    assert.equal(subscription.lastPayment, paymentId);
    assert.equal(subscription.status, 'ACTIVE');
    assert.ok(subscription.currentPeriodEnd > periodEnd);
  } finally {
    mongoose.startSession = originals.startSession;
    MembershipPayment.findOne = originals.paymentFindOne;
    MembershipPayment.findById = originals.paymentFindById;
    require('../src/modules/payments/provider-subscription.model.js').findById = originals.subscriptionFindById;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('membership APIs protect provider routes and expose the public plans route', async () => {
  const app = require('../src/app.js');
  const originalFind = MembershipPlan.find;
  const status = 200;
  MembershipPlan.find = () => ({
    sort() {
      return this;
    },
    lean: async () => {
      if (status !== 200) throw new Error('Unexpected plans query');
      return [];
    },
  });

  try {
    const publicResponse = await dispatch(app, {
      method: 'GET',
      url: '/api/membership/plans',
    });
    assert.equal(publicResponse.status, 200);
    assert.deepEqual((await publicResponse.json()).data, []);

    const subscriptionResponse = await dispatch(app, {
      method: 'GET',
      url: '/api/provider/subscription/me',
    });
    assert.equal(subscriptionResponse.status, 401);

    const checkoutResponse = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/checkout',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: new mongoose.Types.ObjectId().toString() }),
    });
    assert.equal(checkoutResponse.status, 401);
  } finally {
    MembershipPlan.find = originalFind;
  }
});

test('V-06 Security Fix: PayOS checkout ignores malicious returnUrl/cancelUrl and uses server env URLs', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
  };
  const originals = {
    subscriptionFindOneAndUpdate: require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate,
    paymentUpdateMany: MembershipPayment.updateMany,
    paymentExists: MembershipPayment.exists,
    paymentCreate: MembershipPayment.create,
    paymentUpdateOne: MembershipPayment.updateOne,
  };
  let payosCreatePayload;

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://myservice.vn/provider/membership/payment-result';
  env.payosCancelUrl = 'https://myservice.vn/provider/membership/payment-cancelled';
  resetPayOSClientForTests();

  require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = async () => ({ _id: subscriptionId });
  MembershipPayment.updateMany = async () => ({ modifiedCount: 0 });
  MembershipPayment.exists = async () => null;
  MembershipPayment.create = async () => ({ _id: paymentId });
  MembershipPayment.updateOne = async () => ({ matchedCount: 1 });
  const payos = getPayOSClient({ requireCheckoutUrls: true });
  payos.paymentRequests.create = async (payload) => {
    payosCreatePayload = payload;
    return {
      orderCode: payload.orderCode,
      amount: payload.amount,
      paymentLinkId: 'payos-link-id',
      checkoutUrl: 'https://pay.payos.vn/web/checkout',
    };
  };

  try {
    const checkout = await createMembershipCheckout({
      user: { _id: providerId },
      plan: { _id: new mongoose.Types.ObjectId(), name: 'Monthly', version: 2, monthlyPrice: 199000 },
      returnUrl: 'https://evil.attacker.com/steal-creds',
      cancelUrl: 'javascript:alert(document.cookie)',
    });

    assert.equal(payosCreatePayload.returnUrl, 'https://myservice.vn/provider/membership/payment-result');
    assert.equal(payosCreatePayload.cancelUrl, 'https://myservice.vn/provider/membership/payment-cancelled');
    assert.notEqual(payosCreatePayload.returnUrl, 'https://evil.attacker.com/steal-creds');
    assert.notEqual(payosCreatePayload.cancelUrl, 'javascript:alert(document.cookie)');
    assert.equal(checkout.status, 'PENDING');
    assert.equal(checkout.checkoutUrl, 'https://pay.payos.vn/web/checkout');
  } finally {
    require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = originals.subscriptionFindOneAndUpdate;
    MembershipPayment.updateMany = originals.paymentUpdateMany;
    MembershipPayment.exists = originals.paymentExists;
    MembershipPayment.create = originals.paymentCreate;
    MembershipPayment.updateOne = originals.paymentUpdateOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-06 Security Fix: PayOS checkout fails with 503 when env returnUrl or cancelUrl is missing, ignoring client input', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = '';
  env.payosCancelUrl = '';
  resetPayOSClientForTests();

  try {
    await assert.rejects(
      createMembershipCheckout({
        user: { _id: providerId },
        plan: { _id: new mongoose.Types.ObjectId(), name: 'Monthly', version: 2, monthlyPrice: 199000 },
        returnUrl: 'https://fallback-attempt.test/return',
        cancelUrl: 'https://fallback-attempt.test/cancel',
      }),
      (error) => error instanceof AppError && error.statusCode === 503 && error.message === 'PayOS return and cancel URLs are not configured.',
    );
  } finally {
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-06 Security Fix: POST /checkout accepts legacy returnUrl/cancelUrl without using them and rejects unknown fields', async () => {
  const jwt = require('jsonwebtoken');
  const app = require('../src/app.js');
  const User = require('../src/modules/users/user.model.js');
  const ProviderProfile = require('../src/modules/providers/provider.model.js');

  const providerId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();

  const providerToken = jwt.sign(
    { sub: providerId.toString(), role: 'PROVIDER' },
    env.jwtSecret,
    { expiresIn: '1h' },
  );

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
  };
  const originals = {
    userFindById: User.findById,
    providerProfileFindOne: ProviderProfile.findOne,
    planFindOne: MembershipPlan.findOne,
    paymentFindOne: MembershipPayment.findOne,
    subscriptionFindOneAndUpdate: require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate,
    paymentUpdateMany: MembershipPayment.updateMany,
    paymentExists: MembershipPayment.exists,
    paymentCreate: MembershipPayment.create,
    paymentUpdateOne: MembershipPayment.updateOne,
  };

  let payosCreatePayload;

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://myservice.vn/provider/membership/payment-result';
  env.payosCancelUrl = 'https://myservice.vn/provider/membership/payment-cancelled';
  resetPayOSClientForTests();

  User.findById = () => ({
    select: () => ({
      _id: providerId,
      role: 'PROVIDER',
      status: 'ACTIVE',
      emailVerified: true,
      fullName: 'Test Provider',
    }),
  });

  ProviderProfile.findOne = () => ({
    _id: new mongoose.Types.ObjectId(),
    user: providerId,
    verificationStatus: 'VERIFIED',
  });

  MembershipPlan.findOne = () => ({
    _id: planId,
    name: 'Pro Monthly',
    version: 1,
    monthlyPrice: 299000,
    isActive: true,
  });

  MembershipPayment.findOne = () => ({
    sort: () => ({
      lean: async () => null,
    }),
  });

  require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = async () => ({ _id: subscriptionId });
  MembershipPayment.updateMany = async () => ({ modifiedCount: 0 });
  MembershipPayment.exists = async () => null;
  MembershipPayment.create = async () => ({ _id: paymentId });
  MembershipPayment.updateOne = async () => ({ matchedCount: 1 });

  const payos = getPayOSClient({ requireCheckoutUrls: true });
  payos.paymentRequests.create = async (payload) => {
    payosCreatePayload = payload;
    return {
      orderCode: payload.orderCode,
      amount: payload.amount,
      paymentLinkId: 'link-123',
      checkoutUrl: 'https://pay.payos.vn/web/checkout',
    };
  };

  try {
    // 1. Client sends legacy returnUrl & cancelUrl pointing to attacker domain
    const resLegacy = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/checkout',
      headers: {
        authorization: `Bearer ${providerToken}`,
        'content-type': 'application/json',
      },
      body: {
        planId: planId.toString(),
        returnUrl: 'https://evil.com/fake-return',
        cancelUrl: 'https://evil.com/fake-cancel',
      },
    });

    assert.equal(resLegacy.status, 201);
    assert.equal(resLegacy.body.success, true);
    assert.equal(payosCreatePayload.returnUrl, 'https://myservice.vn/provider/membership/payment-result');
    assert.equal(payosCreatePayload.cancelUrl, 'https://myservice.vn/provider/membership/payment-cancelled');

    // 2. Client sends unknown field -> 400
    const resUnknown = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/checkout',
      headers: {
        authorization: `Bearer ${providerToken}`,
        'content-type': 'application/json',
      },
      body: {
        planId: planId.toString(),
        extraAttackField: 'malicious',
      },
    });

    assert.equal(resUnknown.status, 400);
    assert.equal(resUnknown.body.success, false);
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.providerProfileFindOne;
    MembershipPlan.findOne = originals.planFindOne;
    MembershipPayment.findOne = originals.paymentFindOne;
    require('../src/modules/payments/provider-subscription.model.js').findOneAndUpdate = originals.subscriptionFindOneAndUpdate;
    MembershipPayment.updateMany = originals.paymentUpdateMany;
    MembershipPayment.exists = originals.paymentExists;
    MembershipPayment.create = originals.paymentCreate;
    MembershipPayment.updateOne = originals.paymentUpdateOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: membership sync ignores simulateSuccess when ALLOW_PAYMENT_SIMULATION is disabled (dev)', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    provider: providerId,
    subscription: new mongoose.Types.ObjectId(),
    plan: new mongoose.Types.ObjectId(),
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    paymentFindOne: MembershipPayment.findOne,
    subscriptionFindOne: require('../src/modules/payments/provider-subscription.model.js').findOne,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = false;
  env.nodeEnv = 'development';
  resetPayOSClientForTests();
  getPayOSClient().paymentRequests.get = async () => ({ status: 'PENDING' });
  MembershipPayment.findOne = () => ({ sort: async () => payment });
  let subscriptionFindOneCalls = 0;
  require('../src/modules/payments/provider-subscription.model.js').findOne = () => {
    subscriptionFindOneCalls += 1;
    return { populate: () => ({ lean: async () => null }) };
  };

  try {
    const result = await syncMembershipPaymentStatus({
      user: { _id: providerId, role: 'PROVIDER' },
      orderCode: payment.orderCode,
      simulateSuccess: true,
      ip: null,
    });

    assert.equal(result.status, 'PENDING');
    assert.equal(subscriptionFindOneCalls, 0);
  } finally {
    MembershipPayment.findOne = originals.paymentFindOne;
    require('../src/modules/payments/provider-subscription.model.js').findOne = originals.subscriptionFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: membership sync ignores simulateSuccess in production even when ALLOW_PAYMENT_SIMULATION is enabled', async () => {
  const providerId = new mongoose.Types.ObjectId();
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    provider: providerId,
    subscription: new mongoose.Types.ObjectId(),
    plan: new mongoose.Types.ObjectId(),
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    paymentFindOne: MembershipPayment.findOne,
    subscriptionFindOne: require('../src/modules/payments/provider-subscription.model.js').findOne,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = true;
  env.nodeEnv = 'production';
  resetPayOSClientForTests();
  getPayOSClient().paymentRequests.get = async () => ({ status: 'PENDING' });
  MembershipPayment.findOne = () => ({ sort: async () => payment });
  let subscriptionFindOneCalls = 0;
  require('../src/modules/payments/provider-subscription.model.js').findOne = () => {
    subscriptionFindOneCalls += 1;
    return { populate: () => ({ lean: async () => null }) };
  };

  try {
    const result = await syncMembershipPaymentStatus({
      user: { _id: providerId, role: 'PROVIDER' },
      orderCode: payment.orderCode,
      simulateSuccess: true,
      ip: null,
    });

    assert.equal(result.status, 'PENDING');
    assert.equal(subscriptionFindOneCalls, 0);
  } finally {
    MembershipPayment.findOne = originals.paymentFindOne;
    require('../src/modules/payments/provider-subscription.model.js').findOne = originals.subscriptionFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: POST /api/provider/subscription/sync with a valid orderCode runs the normal payment flow', async () => {
  const jwt = require('jsonwebtoken');
  const app = require('../src/app.js');
  const User = require('../src/modules/users/user.model.js');
  const ProviderProfile = require('../src/modules/providers/provider.model.js');

  const providerId = new mongoose.Types.ObjectId();
  const providerToken = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER' }, env.jwtSecret, { expiresIn: '1h' });

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    userFindById: User.findById,
    providerProfileFindOne: ProviderProfile.findOne,
    paymentFindOne: MembershipPayment.findOne,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = false;
  env.nodeEnv = 'test';
  resetPayOSClientForTests();
  getPayOSClient().paymentRequests.get = async () => ({ status: 'NOT_PAYMENT' });
  User.findById = () => ({
    select: () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE', emailVerified: true, fullName: 'Test Provider' }),
  });
  ProviderProfile.findOne = () => ({ _id: new mongoose.Types.ObjectId(), user: providerId, verificationStatus: 'VERIFIED' });
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    provider: providerId,
    subscription: new mongoose.Types.ObjectId(),
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };
  MembershipPayment.findOne = () => ({ sort: async () => payment });

  try {
    const response = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/sync',
      headers: { authorization: `Bearer ${providerToken}`, 'content-type': 'application/json' },
      body: { orderCode: 1234567890 },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'PENDING');
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.providerProfileFindOne;
    MembershipPayment.findOne = originals.paymentFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: POST /api/provider/subscription/sync rejects unknown fields with 400', async () => {
  const jwt = require('jsonwebtoken');
  const app = require('../src/app.js');
  const User = require('../src/modules/users/user.model.js');
  const ProviderProfile = require('../src/modules/providers/provider.model.js');

  const providerId = new mongoose.Types.ObjectId();
  const providerToken = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER' }, env.jwtSecret, { expiresIn: '1h' });

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    userFindById: User.findById,
    providerProfileFindOne: ProviderProfile.findOne,
    paymentFindOne: MembershipPayment.findOne,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = false;
  env.nodeEnv = 'test';
  resetPayOSClientForTests();
  MembershipPayment.findOne = () => ({ sort: async () => null });
  User.findById = () => ({
    select: () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE', emailVerified: true, fullName: 'Test Provider' }),
  });
  ProviderProfile.findOne = () => ({ _id: new mongoose.Types.ObjectId(), user: providerId, verificationStatus: 'VERIFIED' });

  try {
    const response = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/sync',
      headers: { authorization: `Bearer ${providerToken}`, 'content-type': 'application/json' },
      body: { orderCode: 1234567890, evilField: 'malicious' },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.providerProfileFindOne;
    MembershipPayment.findOne = originals.paymentFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: POST /api/provider/subscription/sync ignores body simulateSuccess in production and runs the PayOS flow', async () => {
  const jwt = require('jsonwebtoken');
  const app = require('../src/app.js');
  const User = require('../src/modules/users/user.model.js');
  const ProviderProfile = require('../src/modules/providers/provider.model.js');

  const providerId = new mongoose.Types.ObjectId();
  const providerToken = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER' }, env.jwtSecret, { expiresIn: '1h' });

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    userFindById: User.findById,
    providerProfileFindOne: ProviderProfile.findOne,
    paymentFindOne: MembershipPayment.findOne,
  };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = true;
  env.nodeEnv = 'production';
  resetPayOSClientForTests();
  getPayOSClient().paymentRequests.get = async () => ({ status: 'NOT_PAYMENT' });
  User.findById = () => ({
    select: () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE', emailVerified: true, fullName: 'Test Provider' }),
  });
  ProviderProfile.findOne = () => ({ _id: new mongoose.Types.ObjectId(), user: providerId, verificationStatus: 'VERIFIED' });
  const payment = {
    _id: new mongoose.Types.ObjectId(),
    provider: providerId,
    subscription: new mongoose.Types.ObjectId(),
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };
  MembershipPayment.findOne = () => ({ sort: async () => payment });

  try {
    const response = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/sync',
      headers: { authorization: `Bearer ${providerToken}`, 'content-type': 'application/json' },
      body: { orderCode: 1234567890, simulateSuccess: true },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'PENDING');
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.providerProfileFindOne;
    MembershipPayment.findOne = originals.paymentFindOne;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});

test('V-28: POST /api/provider/subscription/sync uses the server-decided simulation flag even when body sends simulateSuccess', async () => {
  const jwt = require('jsonwebtoken');
  const app = require('../src/app.js');
  const User = require('../src/modules/users/user.model.js');
  const ProviderProfile = require('../src/modules/providers/provider.model.js');

  const providerId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();
  const paymentId = new mongoose.Types.ObjectId();
  const providerToken = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER' }, env.jwtSecret, { expiresIn: '1h' });

  const originalEnv = {
    payosClientId: env.payosClientId,
    payosApiKey: env.payosApiKey,
    payosChecksumKey: env.payosChecksumKey,
    payosReturnUrl: env.payosReturnUrl,
    payosCancelUrl: env.payosCancelUrl,
    allowPaymentSimulation: env.allowPaymentSimulation,
    nodeEnv: env.nodeEnv,
  };
  const originals = {
    userFindById: User.findById,
    providerProfileFindOne: ProviderProfile.findOne,
    paymentFindOne: MembershipPayment.findOne,
    subscriptionFindOne: require('../src/modules/payments/provider-subscription.model.js').findOne,
    subscriptionFindById: require('../src/modules/payments/provider-subscription.model.js').findById,
    startSession: mongoose.startSession,
  };

  const payment = {
    _id: paymentId,
    provider: providerId,
    subscription: subscriptionId,
    plan: planId,
    orderCode: 1234567890,
    amount: 199000,
    currency: 'VND',
    status: 'PENDING',
    appliedAt: null,
    async save() {},
  };
  const subscription = {
    _id: subscriptionId,
    provider: providerId,
    plan: planId,
    status: 'ACTIVE',
    currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    async save() {},
  };
  const session = { withTransaction: async (fn) => fn(), endSession: async () => {} };

  env.payosClientId = 'client';
  env.payosApiKey = 'api-key';
  env.payosChecksumKey = 'checksum';
  env.payosReturnUrl = 'https://example.test/return';
  env.payosCancelUrl = 'https://example.test/cancel';
  env.allowPaymentSimulation = true;
  env.nodeEnv = 'development';
  resetPayOSClientForTests();
  mongoose.startSession = async () => session;
  MembershipPayment.findOne = () => ({ sort: async () => payment, session: async () => payment });
  require('../src/modules/payments/provider-subscription.model.js').findById = () => ({ session: async () => subscription });
  require('../src/modules/payments/provider-subscription.model.js').findOne = () => ({
    populate: () => ({ lean: async () => subscription }),
  });
  User.findById = () => ({
    select: () => ({ _id: providerId, role: 'PROVIDER', status: 'ACTIVE', emailVerified: true, fullName: 'Test Provider' }),
  });
  ProviderProfile.findOne = () => ({ _id: new mongoose.Types.ObjectId(), user: providerId, verificationStatus: 'VERIFIED' });

  try {
    const response = await dispatch(app, {
      method: 'POST',
      url: '/api/provider/subscription/sync',
      headers: { authorization: `Bearer ${providerToken}`, 'content-type': 'application/json' },
      body: { orderCode: 1234567890, simulateSuccess: true },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'PAID');
  } finally {
    User.findById = originals.userFindById;
    ProviderProfile.findOne = originals.providerProfileFindOne;
    MembershipPayment.findOne = originals.paymentFindOne;
    require('../src/modules/payments/provider-subscription.model.js').findOne = originals.subscriptionFindOne;
    require('../src/modules/payments/provider-subscription.model.js').findById = originals.subscriptionFindById;
    mongoose.startSession = originals.startSession;
    Object.assign(env, originalEnv);
    resetPayOSClientForTests();
  }
});
