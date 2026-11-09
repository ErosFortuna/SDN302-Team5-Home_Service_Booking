const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createChangePasswordRateLimiter } = require('../src/middlewares/rate-limit.middleware.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const apiApp = require('../src/app.js');

function makeApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post('/change-password', (req, res, next) => {
    if (!req.body?.currentPassword || !req.body?.newPassword) return res.status(400).json({ success: false });
    req.user = { _id: req.body.userId };
    return next();
  }, limiter, (req, res) => res.status(req.body.currentPassword === 'correct' ? 200 : 400).json({ success: false }));
  return app;
}

test('change-password limiter scopes attempts by authenticated user and trusted IP and expires', async () => {
  const limiter = createChangePasswordRateLimiter({ limit: 2, windowMs: 80, enableInTest: true });
  const app = makeApp(limiter);
  const request = (userId, remoteAddress, password = 'wrong') => dispatch(app, {
    method: 'POST', url: '/change-password', remoteAddress,
    body: { userId, currentPassword: password, newPassword: 'valid-new-password' },
  });

  assert.equal((await request('user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request('user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request('user-a', '10.0.0.1')).statusCode, 429);
  assert.equal((await request('user-b', '10.0.0.1')).statusCode, 400);
  assert.equal((await request('user-a', '10.0.0.2')).statusCode, 400);
  assert.equal((await request('user-b', '10.0.0.1', 'correct')).statusCode, 200);

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal((await request('user-a', '10.0.0.1')).statusCode, 400);
});

test('invalid change-password payloads are rejected before the attempt limiter', async () => {
  const app = makeApp(createChangePasswordRateLimiter({ limit: 1, enableInTest: true }));
  for (let i = 0; i < 2; i++) {
    const response = await dispatch(app, { method: 'POST', url: '/change-password', body: {} });
    assert.equal(response.statusCode, 400);
  }
});

test('change-password remains behind authentication and does not share limits with other APIs', async () => {
  const payload = { currentPassword: 'current', newPassword: 'valid-new-password' };
  const unauthenticated = await dispatch(apiApp, { method: 'POST', url: '/api/auth/change-password', body: payload });
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal((await dispatch(apiApp, { url: '/' })).statusCode, 200);
  assert.equal((await dispatch(apiApp, { method: 'POST', url: '/api/auth/login', body: {} })).statusCode, 400);
  assert.equal((await dispatch(apiApp, { method: 'POST', url: '/api/auth/forgot-password', body: {} })).statusCode, 400);
});
