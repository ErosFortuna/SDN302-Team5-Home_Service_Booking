const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { dispatch } = require('../test-helpers/dispatch.js');
const {
  isPayOSWebhook,
  shouldSkipInTest,
  createGlobalRateLimiter,
  createUploadRateLimiter,
  createAvailabilityRateLimiter,
} = require('../src/middlewares/rate-limit.middleware.js');

test('isPayOSWebhook correctly identifies PayOS webhook URLs and ignores other endpoints', () => {
  assert.equal(isPayOSWebhook({ originalUrl: '/api/payments/payos/webhook' }), true);
  assert.equal(isPayOSWebhook({ originalUrl: '/api/payments/payos/webhook?sig=xyz' }), true);
  assert.equal(isPayOSWebhook({ path: '/payments/payos/webhook' }), true);
  assert.equal(isPayOSWebhook({ path: '/payos/webhook' }), true);
  assert.equal(isPayOSWebhook({ originalUrl: '/api/payments/other' }), false);
  assert.equal(isPayOSWebhook({ originalUrl: '/api/services' }), false);
  assert.equal(isPayOSWebhook({ originalUrl: '/api/availability/providers/123/slots' }), false);
});

test('global rate limiter returns 429 with standard headers and Retry-After when threshold exceeded', async () => {
  const app = express();
  const limiter = createGlobalRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });
  app.use(limiter);
  app.get('/test-endpoint', (req, res) => res.json({ success: true, count: 1 }));

  const res1 = await dispatch(app, { url: '/test-endpoint' });
  assert.equal(res1.status, 200);
  assert.equal(res1.body.success, true);

  const res2 = await dispatch(app, { url: '/test-endpoint' });
  assert.equal(res2.status, 200);

  // 3rd request exceeds limit of 2
  const res3 = await dispatch(app, { url: '/test-endpoint' });
  assert.equal(res3.status, 429);
  assert.equal(res3.body.success, false);
  assert.match(res3.body.message, /quá nhiều yêu cầu/i);

  // Verify rate-limit headers
  assert.ok(res3.headers['ratelimit-limit'], 'Expected ratelimit-limit header');
  assert.ok(res3.headers['retry-after'], 'Expected retry-after header');
  assert.ok(Number(res3.headers['retry-after']) > 0, 'Retry-After should be a positive number');
});

test('global rate limiter never blocks PayOS webhook callback even when limit is exceeded', async () => {
  const app = express();
  const limiter = createGlobalRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });
  app.use(limiter);
  app.get('/test-endpoint', (req, res) => res.json({ success: true }));
  app.post('/api/payments/payos/webhook', (req, res) => res.json({ success: true, message: 'webhook received' }));

  // Exceed the limit on normal endpoints
  await dispatch(app, { url: '/test-endpoint' });
  await dispatch(app, { url: '/test-endpoint' });
  const blockedRes = await dispatch(app, { url: '/test-endpoint' });
  assert.equal(blockedRes.status, 429, 'Regular endpoint should be blocked');

  // PayOS webhook should NOT be blocked despite limit reached on this IP
  for (let i = 0; i < 5; i++) {
    const webhookRes = await dispatch(app, {
      method: 'POST',
      url: '/api/payments/payos/webhook',
      body: { code: '00' },
    });
    assert.equal(webhookRes.status, 200, `Webhook request ${i + 1} should be accepted`);
    assert.equal(webhookRes.body.success, true);
  }
});

test('upload rate limiter is scoped per user and returns 429 with Retry-After when exceeded', async () => {
  const app = express();
  const uploadLimiter = createUploadRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });

  // Mock protect middleware attaching user
  app.use((req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
      req.user = { _id: userId, role: 'CUSTOMER' };
    }
    next();
  });
  app.post('/api/upload', uploadLimiter, (req, res) => res.json({ success: true, uploaded: true }));

  // User 1 makes 2 requests (within limit of 2)
  const u1r1 = await dispatch(app, { method: 'POST', url: '/api/upload', headers: { 'x-user-id': 'user-1' } });
  assert.equal(u1r1.status, 200);
  const u1r2 = await dispatch(app, { method: 'POST', url: '/api/upload', headers: { 'x-user-id': 'user-1' } });
  assert.equal(u1r2.status, 200);

  // User 1 makes 3rd request -> 429
  const u1r3 = await dispatch(app, { method: 'POST', url: '/api/upload', headers: { 'x-user-id': 'user-1' } });
  assert.equal(u1r3.status, 429);
  assert.equal(u1r3.body.success, false);
  assert.match(u1r3.body.message, /quá nhiều yêu cầu tải lên/i);
  assert.ok(u1r3.headers['retry-after'], 'Expected retry-after header');

  // User 2 from SAME IP makes request -> should SUCCEED because rate limit is per user
  const u2r1 = await dispatch(app, { method: 'POST', url: '/api/upload', headers: { 'x-user-id': 'user-2' } });
  assert.equal(u2r1.status, 200, 'User 2 should not be blocked by User 1 quota');
});

test('availability rate limiter throttles public provider availability requests when exceeded', async () => {
  const app = express();
  const availabilityLimiter = createAvailabilityRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });

  app.get('/api/availability/providers/:providerId/slots', availabilityLimiter, (req, res) => {
    res.json({ success: true, slots: ['09:00', '10:00'] });
  });

  const res1 = await dispatch(app, { url: '/api/availability/providers/p1/slots' });
  assert.equal(res1.status, 200);

  const res2 = await dispatch(app, { url: '/api/availability/providers/p1/slots' });
  assert.equal(res2.status, 200);

  const res3 = await dispatch(app, { url: '/api/availability/providers/p1/slots' });
  assert.equal(res3.status, 429);
  assert.equal(res3.body.success, false);
  assert.match(res3.body.message, /quá nhiều yêu cầu kiểm tra lịch trống/i);
  assert.ok(res3.headers['retry-after'], 'Expected retry-after header');
});

test('rate limiters skip throttling in NODE_ENV=test when enableInTest is not active', async () => {
  const savedEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'test';
    const app = express();
    // Default limiter without enableInTest flag
    const limiter = createGlobalRateLimiter({ limit: 1 });
    app.use(limiter);
    app.get('/test-skip', (req, res) => res.json({ success: true }));

    // Send 5 requests - none should be throttled because NODE_ENV=test skips by default
    for (let i = 0; i < 5; i++) {
      const res = await dispatch(app, { url: '/test-skip' });
      assert.equal(res.status, 200, `Request ${i + 1} should not be throttled in test mode`);
    }
  } finally {
    process.env.NODE_ENV = savedEnv;
  }
});

test('app.js globalRateLimiter enforces rate limiting end-to-end when dynamically configured', async () => {
  const app = require('../src/app.js');
  const savedEnabled = process.env.ENABLE_RATE_LIMIT_TEST;
  const savedMax = process.env.RATE_LIMIT_GLOBAL_MAX;

  try {
    process.env.ENABLE_RATE_LIMIT_TEST = 'true';
    process.env.RATE_LIMIT_GLOBAL_MAX = '3';

    // We can dispatch to public GET / or GET /api/health
    const r1 = await dispatch(app, { url: '/' });
    assert.equal(r1.status, 200);

    const r2 = await dispatch(app, { url: '/' });
    assert.equal(r2.status, 200);

    const r3 = await dispatch(app, { url: '/' });
    assert.equal(r3.status, 200);

    // 4th request exceeds the configured limit of 3
    const r4 = await dispatch(app, { url: '/' });
    assert.equal(r4.status, 429);
    assert.equal(r4.body.success, false);
    assert.ok(r4.headers['retry-after']);
  } finally {
    if (savedEnabled === undefined) {
      delete process.env.ENABLE_RATE_LIMIT_TEST;
    } else {
      process.env.ENABLE_RATE_LIMIT_TEST = savedEnabled;
    }
    if (savedMax === undefined) {
      delete process.env.RATE_LIMIT_GLOBAL_MAX;
    } else {
      process.env.RATE_LIMIT_GLOBAL_MAX = savedMax;
    }
  }
});

