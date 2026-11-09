const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const {
  notFound,
  errorHandler,
  sanitizeUrlForLogging,
} = require('../src/middlewares/error.middleware.js');

test('V-22: notFound returns fixed message and sanitizes server logs', async (t) => {
  await t.test('1. sanitizeUrlForLogging masks sensitive query parameters', () => {
    assert.equal(sanitizeUrlForLogging(''), '');
    assert.equal(sanitizeUrlForLogging(null), '');
    assert.equal(sanitizeUrlForLogging('/api/users'), '/api/users');
    assert.equal(
      sanitizeUrlForLogging('/api/auth/verify?token=secret123&email=user@test.com'),
      '/api/auth/verify?token=[REDACTED]&email=user@test.com',
    );
    assert.equal(
      sanitizeUrlForLogging('/api/login?password=myPassword&apiKey=xyz789'),
      '/api/login?password=[REDACTED]&apiKey=[REDACTED]',
    );
    assert.equal(
      sanitizeUrlForLogging('/api/callback?code=oauthCode&state=123'),
      '/api/callback?code=[REDACTED]&state=123',
    );
    assert.equal(
      sanitizeUrlForLogging('/api/unknown?otp=654321&access_token=jwtToken'),
      '/api/unknown?otp=[REDACTED]&access_token=[REDACTED]',
    );
  });

  await t.test('2. notFound returns status 404 with fixed message "Route not found"', () => {
    let capturedStatus = null;
    let capturedJson = null;
    let capturedWarn = null;

    const originalWarn = console.warn;
    console.warn = (msg) => {
      capturedWarn = msg;
    };

    try {
      const mockReq = {
        method: 'GET',
        originalUrl: '/api/unknown-endpoint/<script>alert(1)</script>?token=secret123',
      };
      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(data) {
          capturedJson = data;
          return this;
        },
      };

      notFound(mockReq, mockRes);

      assert.equal(capturedStatus, 404);
      assert.deepEqual(capturedJson, {
        success: false,
        message: 'Route not found',
      });
      // Ensure the returned message does not reflect input or URL
      assert.equal(capturedJson.message.includes('<script>'), false);
      assert.equal(capturedJson.message.includes('unknown-endpoint'), false);

      // Verify server log captures method and sanitized URL
      assert.match(capturedWarn, /\[Route Not Found\] GET/);
      assert.equal(capturedWarn.includes('secret123'), false);
      assert.equal(capturedWarn.includes('[REDACTED]'), true);
    } finally {
      console.warn = originalWarn;
    }
  });

  await t.test('3. dispatch through app on unknown route returns 404 with fixed message', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/nonexistent-route-for-testing-v22/<script>',
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Route not found');
    assert.equal(JSON.stringify(res.body).includes('<script>'), false);
  });
});

test('V-22: 500 stack trace only appears in development (not production or other environments)', async (t) => {
  const originalEnv = process.env.NODE_ENV;

  await t.test('1. In production (NODE_ENV=production), 500 error has NO stack trace in response', () => {
    process.env.NODE_ENV = 'production';
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    const serverErr = new Error('Database connection failed');
    errorHandler(serverErr, {}, mockRes, () => {});

    assert.equal(capturedStatus, 500);
    assert.equal(capturedJson.success, false);
    assert.equal(capturedJson.message, 'Internal server error');
    assert.equal(capturedJson.stack, undefined);
    assert.equal('stack' in capturedJson, false);
  });

  await t.test('2. In test environment (NODE_ENV=test), 500 error does NOT include stack trace', () => {
    process.env.NODE_ENV = 'test';
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(data) {
        capturedJson = data;
        return this;
      },
    };

    const serverErr = new Error('Unexpected calculation error');
    errorHandler(serverErr, {}, mockRes, () => {});

    assert.equal(capturedStatus, 500);
    assert.equal(capturedJson.success, false);
    assert.equal(capturedJson.stack, undefined);
    assert.equal('stack' in capturedJson, false);
  });

  await t.test('3. In development (NODE_ENV=development), 500 error includes stack trace', () => {
    process.env.NODE_ENV = 'development';
    let capturedStatus = null;
    let capturedJson = null;

    const originalError = console.error;
    console.error = () => {}; // suppress console.error during dev test

    try {
      const mockRes = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(data) {
          capturedJson = data;
          return this;
        },
      };

      const serverErr = new Error('Something broke in dev');
      errorHandler(serverErr, {}, mockRes, () => {});

      assert.equal(capturedStatus, 500);
      assert.equal(capturedJson.success, false);
      assert.equal(capturedJson.message, 'Something broke in dev');
      assert.equal(typeof capturedJson.stack, 'string');
      assert.match(capturedJson.stack, /Error: Something broke in dev/);
    } finally {
      console.error = originalError;
      process.env.NODE_ENV = originalEnv;
    }
  });

  // Restore environment variable
  process.env.NODE_ENV = originalEnv;
});
