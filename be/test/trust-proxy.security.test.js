const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { dispatch } = require('../test-helpers/dispatch.js');
const { parseTrustProxy, env } = require('../src/config/env.js');
const { createGlobalRateLimiter } = require('../src/middlewares/rate-limit.middleware.js');
const app = require('../src/app.js');

test('parseTrustProxy correctly parses booleans, numbers, strings, and sets safe defaults', () => {
  // Safe defaults based on NODE_ENV
  assert.equal(parseTrustProxy(undefined, 'development'), false);
  assert.equal(parseTrustProxy(undefined, 'test'), false);
  assert.equal(parseTrustProxy('', 'development'), false);
  assert.equal(parseTrustProxy('   ', 'test'), false);
  assert.equal(parseTrustProxy(undefined, 'production'), 1);
  assert.equal(parseTrustProxy('', 'production'), 1);

  // Booleans
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('True'), true);
  assert.equal(parseTrustProxy('TRUE'), true);
  assert.equal(parseTrustProxy(true), true);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('False'), false);
  assert.equal(parseTrustProxy('FALSE'), false);
  assert.equal(parseTrustProxy(false), false);

  // Numbers (hop count)
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('0'), 0);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy(1), 1);
  assert.equal(parseTrustProxy(2), 2);

  // Strings (presets, subnets, IP lists)
  assert.equal(parseTrustProxy('loopback'), 'loopback');
  assert.equal(parseTrustProxy('linklocal'), 'linklocal');
  assert.equal(parseTrustProxy('uniquelocal'), 'uniquelocal');
  assert.equal(parseTrustProxy('10.0.0.0/8'), '10.0.0.0/8');
  assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
});

test('trust proxy = 1 (hop = 1) correctly resolves client IP forwarded by single reverse proxy', async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);
  testApp.get('/test-ip', (req, res) => res.json({ ip: req.ip }));

  const clientIp = '203.0.113.195';
  const proxyIp = '198.51.100.1';

  // Single reverse proxy (e.g. Render, Railway, single Nginx) connecting from proxyIp,
  // setting X-Forwarded-For with the real client IP.
  const res = await dispatch(testApp, {
    url: '/test-ip',
    headers: { 'x-forwarded-for': clientIp },
    remoteAddress: proxyIp,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.ip, clientIp, 'req.ip should match the forwarded client IP');
});

test('trust proxy = 1 (hop = 1) ignores forged upstream header and identifies real client IP', async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);
  testApp.get('/test-ip', (req, res) => res.json({ ip: req.ip }));

  const forgedIp = '1.2.3.4';
  const realClientIp = '203.0.113.195';
  const proxyIp = '10.0.0.1';

  // Attacker connects to reverse proxy sending a spoofed X-Forwarded-For: 1.2.3.4.
  // The reverse proxy appends the attacker real client IP: '1.2.3.4, 203.0.113.195'.
  // With trust proxy = 1, Express trusts only the immediate proxy (10.0.0.1) and takes
  // the rightmost IP added by the proxy (203.0.113.195), rejecting the forged IP (1.2.3.4).
  const res = await dispatch(testApp, {
    url: '/test-ip',
    headers: { 'x-forwarded-for': `${forgedIp}, ${realClientIp}` },
    remoteAddress: proxyIp,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.ip, realClientIp, 'req.ip must identify real client and ignore forged upstream IP');
});

test('trust proxy = 2 correctly resolves client IP behind multi-hop reverse proxies (e.g. Cloudflare + Nginx)', async () => {
  const testApp = express();
  testApp.set('trust proxy', 2);
  testApp.get('/test-ip', (req, res) => res.json({ ip: req.ip }));

  const clientIp = '203.0.113.195';
  const edgeProxyIp = '198.51.100.1'; // e.g. Cloudflare
  const localProxyIp = '10.0.0.1';    // e.g. internal Load Balancer / Nginx

  // Multi-hop proxy chain: Client -> Edge Proxy -> Internal Proxy -> Express
  const res = await dispatch(testApp, {
    url: '/test-ip',
    headers: { 'x-forwarded-for': `${clientIp}, ${edgeProxyIp}` },
    remoteAddress: localProxyIp,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.ip, clientIp, 'req.ip must resolve to the original client IP across 2 hops');
});

test('trust proxy = "loopback" correctly resolves client IP when reverse proxy is on loopback', async () => {
  const testApp = express();
  testApp.set('trust proxy', 'loopback');
  testApp.get('/test-ip', (req, res) => res.json({ ip: req.ip }));

  const clientIp = '203.0.113.195';

  const res = await dispatch(testApp, {
    url: '/test-ip',
    headers: { 'x-forwarded-for': `${clientIp}, 127.0.0.1` },
    remoteAddress: '127.0.0.1',
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.ip, clientIp, 'req.ip must resolve to client IP when proxy is loopback');
});

test('trust proxy disabled (false) prevents IP spoofing by ignoring X-Forwarded-For', async () => {
  const testApp = express();
  testApp.set('trust proxy', false);
  testApp.get('/test-ip', (req, res) => res.json({ ip: req.ip }));

  const spoofedIp = '203.0.113.195';
  const directSocketIp = '127.0.0.1';

  // Attacker connects directly sending a spoofed X-Forwarded-For header.
  // With trust proxy disabled, Express must ignore X-Forwarded-For and use direct socket IP.
  const res = await dispatch(testApp, {
    url: '/test-ip',
    headers: { 'x-forwarded-for': spoofedIp },
    remoteAddress: directSocketIp,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.ip, directSocketIp, 'req.ip must remain the direct socket IP, not the spoofed header');
});

test('rate limiter with trust proxy = 1 assigns distinct buckets per real client IP and throttles only the offending IP', async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);

  const limiter = createGlobalRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
    extra: {
      validate: { xForwardedForHeader: false },
    },
  });
  testApp.use(limiter);
  testApp.get('/api/resource', (req, res) => res.json({ success: true, ip: req.ip }));

  const proxyIp = '10.0.0.1';
  const clientA = '203.0.113.10';
  const clientB = '203.0.113.20';

  // Client A makes 2 requests (limit is 2) through the proxy
  const a1 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': clientA },
    remoteAddress: proxyIp,
  });
  assert.equal(a1.status, 200);
  assert.equal(a1.body.ip, clientA);

  const a2 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': clientA },
    remoteAddress: proxyIp,
  });
  assert.equal(a2.status, 200);
  assert.equal(a2.body.ip, clientA);

  // Client A makes 3rd request -> should be throttled (429)
  const a3 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': clientA },
    remoteAddress: proxyIp,
  });
  assert.equal(a3.status, 429);
  assert.equal(a3.body.success, false);
  assert.match(a3.body.message, /quá nhiều yêu cầu/i);

  // Client B from the SAME proxy makes request -> should SUCCEED (200)
  // because rate limiting is isolated per client IP, not shared proxy IP!
  const b1 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': clientB },
    remoteAddress: proxyIp,
  });
  assert.equal(b1.status, 200, 'Client B should not be affected by Client A quota');
  assert.equal(b1.body.ip, clientB);

  // Client A continues to be blocked
  const a4 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': clientA },
    remoteAddress: proxyIp,
  });
  assert.equal(a4.status, 429, 'Client A should still be rate limited');
});

test('rate limiter with trust proxy = false groups requests by socket IP preventing spoof bypass', async () => {
  const testApp = express();
  testApp.set('trust proxy', false);

  const limiter = createGlobalRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
    extra: {
      validate: { xForwardedForHeader: false },
    },
  });
  testApp.use(limiter);
  testApp.get('/api/resource', (req, res) => res.json({ success: true, ip: req.ip }));

  const directSocketIp = '127.0.0.1';

  // Attacker connects from same socket IP but rotates X-Forwarded-For headers
  const r1 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': '198.51.100.1' },
    remoteAddress: directSocketIp,
  });
  assert.equal(r1.status, 200);

  const r2 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': '198.51.100.2' },
    remoteAddress: directSocketIp,
  });
  assert.equal(r2.status, 200);

  // 3rd request with another fake IP must still be blocked because trust proxy is false
  const r3 = await dispatch(testApp, {
    url: '/api/resource',
    headers: { 'x-forwarded-for': '198.51.100.3' },
    remoteAddress: directSocketIp,
  });
  assert.equal(r3.status, 429, 'Attacker cannot bypass rate limit by rotating X-Forwarded-For');
});

test('app.js initializes Express with trust proxy matching env.trustProxy', () => {
  const configuredTrustProxy = app.get('trust proxy');
  assert.equal(
    configuredTrustProxy,
    env.trustProxy,
    'app.js should configure "trust proxy" with env.trustProxy',
  );
});
