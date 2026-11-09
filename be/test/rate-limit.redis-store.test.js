const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { dispatch } = require('../test-helpers/dispatch.js');
const {
  RedisRateLimitStore,
  RateLimitStoreUnavailableError,
} = require('../src/middlewares/rate-limit-store.js');
const { createChangePasswordRateLimiter } = require('../src/middlewares/rate-limit.middleware.js');
const { errorHandler } = require('../src/middlewares/error.middleware.js');

/**
 * Minimal in-memory Redis double implementing only the commands used by
 * RedisRateLimitStore. The Lua script call is emulated with the same atomic
 * semantics as INCR + PEXPIRE-on-first-hit + PTTL.
 */
function createFakeRedis({ now = 1_000_000 } = {}) {
  const entries = new Map();
  let currentTime = now;
  let failing = false;

  const client = {
    async eval(_script, { keys, arguments: args }) {
      if (failing) throw new Error('ECONNREFUSED');
      const key = keys[0];
      const windowMs = Number(args[0]);
      let entry = entries.get(key);
      if (!entry || entry.expiresAt <= currentTime) {
        entry = { count: 0, expiresAt: currentTime + windowMs };
      }
      entry.count += 1;
      entries.set(key, entry);
      return [entry.count, entry.expiresAt - currentTime];
    },
    async decr(key) {
      if (failing) throw new Error('ECONNREFUSED');
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= currentTime) return 0;
      entry.count = Math.max(0, entry.count - 1);
      return entry.count;
    },
    async del(key) {
      if (failing) throw new Error('ECONNREFUSED');
      return entries.delete(key) ? 1 : 0;
    },
    async set(key, value) {
      if (failing) throw new Error('ECONNREFUSED');
      const entry = entries.get(key) || { expiresAt: currentTime };
      entry.count = Number(value);
      entries.set(key, entry);
      return 'OK';
    },
  };

  return {
    client,
    entries,
    setFailing(value) {
      failing = value;
    },
    advance(ms) {
      currentTime += ms;
    },
    now() {
      return currentTime;
    },
  };
}

function makeChangePasswordApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post(
    '/change-password',
    (req, res, next) => {
      if (!req.body?.currentPassword || !req.body?.newPassword) {
        return res.status(400).json({ success: false });
      }
      if (req.body.userId) req.user = { _id: req.body.userId };
      return next();
    },
    limiter,
    (req, res) =>
      res
        .status(req.body.currentPassword === 'correct' ? 200 : 400)
        .json({ success: req.body.currentPassword === 'correct' }),
  );
  app.use(errorHandler);
  return app;
}

function request(app, userId, remoteAddress, password = 'wrong') {
  return dispatch(app, {
    method: 'POST',
    url: '/change-password',
    remoteAddress,
    body: { userId, currentPassword: password, newPassword: 'valid-new-password' },
  });
}

test('RedisRateLimitStore increments atomically, expires windows, resets and decrements', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'test:', windowMs: 1000 });

  const first = await store.increment('client-a');
  const second = await store.increment('client-a');
  assert.equal(first.totalHits, 1);
  assert.equal(second.totalHits, 2);
  assert.ok(second.resetTime instanceof Date);

  fake.advance(1001);
  const afterExpiry = await store.increment('client-a');
  assert.equal(afterExpiry.totalHits, 1, 'window must reset after expiry');

  await store.decrement('client-a');
  const afterDecrement = await store.increment('client-a');
  assert.equal(afterDecrement.totalHits, 1);

  await store.resetKey('client-a');
  const afterReset = await store.increment('client-a');
  assert.equal(afterReset.totalHits, 1);
});

test('RedisRateLimitStore surfaces Redis failures instead of silently allowing requests', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'test:' });
  fake.setFailing(true);
  await assert.rejects(() => store.increment('client-a'), (error) => {
    assert.ok(error instanceof RateLimitStoreUnavailableError);
    assert.equal(error.statusCode, 503);
    return true;
  });
});

test('AF-03: refresh/login budgets are shared across independent backend instances', async () => {
  const fake = createFakeRedis();
  // Two separate limiter instances simulate two API processes sharing Redis.
  const storeForInstanceA = new RedisRateLimitStore({
    client: fake.client,
    prefix: 'shared:',
    windowMs: 60_000,
  });
  const storeForInstanceB = new RedisRateLimitStore({
    client: fake.client,
    prefix: 'shared:',
    windowMs: 60_000,
  });
  const appA = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 2, enableInTest: true, store: storeForInstanceA }),
  );
  const appB = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 2, enableInTest: true, store: storeForInstanceB }),
  );

  assert.equal((await request(appA, 'user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request(appB, 'user-a', '10.0.0.1')).statusCode, 400);
  const third = await request(appA, 'user-a', '10.0.0.1');
  assert.equal(third.statusCode, 429, 'third failure must be blocked even across instances');
});

test('AF-03: shared counters still isolate users and trusted client IPs', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 60_000 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 1, enableInTest: true, store }),
  );

  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 429);
  assert.equal((await request(app, 'user-b', '10.0.0.1')).statusCode, 400);
  assert.equal((await request(app, 'user-a', '10.0.0.2')).statusCode, 400);
});

test('AF-03: successful change-password does not consume the failure budget', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 60_000 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 1, enableInTest: true, store }),
  );

  assert.equal((await request(app, 'user-a', '10.0.0.1', 'correct')).statusCode, 200);
  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 429);
});

test('AF-03: failure budget resets after the configured window', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 500 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 1, windowMs: 500, enableInTest: true, store }),
  );

  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 400);
  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 429);
  fake.advance(501);
  assert.equal((await request(app, 'user-a', '10.0.0.1')).statusCode, 400);
});

test('AF-03: Redis outage fails closed with 503, then recovers after reconnection', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 60_000 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 5, enableInTest: true, store }),
  );

  fake.setFailing(true);
  const outage = await request(app, 'user-a', '10.0.0.1');
  assert.equal(outage.statusCode, 503);
  assert.equal(outage.body.success, false);
  assert.match(outage.body.message, /tạm thời không khả dụng/i);

  fake.setFailing(false);
  const recovered = await request(app, 'user-a', '10.0.0.1');
  assert.equal(recovered.statusCode, 400, 'limiter must work again after Redis recovers');
});

test('AF-03: concurrent failures cannot exceed the shared budget (atomic counter)', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 60_000 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 5, enableInTest: true, store }),
  );

  const responses = await Promise.all(
    Array.from({ length: 10 }, () => request(app, 'user-a', '10.0.0.1')),
  );
  const allowed = responses.filter((response) => response.statusCode === 400).length;
  const blocked = responses.filter((response) => response.statusCode === 429).length;
  assert.equal(allowed, 5);
  assert.equal(blocked, 5);
});

test('AF-03: unauthenticated change-password attempts fall back to IP scoping', async () => {
  const fake = createFakeRedis();
  const store = new RedisRateLimitStore({ client: fake.client, prefix: 'shared:', windowMs: 60_000 });
  const app = makeChangePasswordApp(
    createChangePasswordRateLimiter({ limit: 1, enableInTest: true, store }),
  );

  assert.equal((await request(app, undefined, '10.0.0.1')).statusCode, 400);
  assert.equal((await request(app, undefined, '10.0.0.1')).statusCode, 429);
  assert.equal((await request(app, undefined, '10.0.0.2')).statusCode, 400);
});
