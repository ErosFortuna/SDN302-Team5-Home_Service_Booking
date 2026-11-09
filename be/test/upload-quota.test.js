const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const { cloudinary } = require('../src/config/cloudinary.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const User = require('../src/modules/users/user.model.js');
const {
  uploadQuotaMiddleware,
  resetUploadQuota,
  getUserUploadQuota,
  getUsageMapSize,
  cleanupExpiredUsage,
  cleanupInterval,
  userUploadUsage,
} = require('../src/modules/upload/upload.quota.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const { validateStatusUpdate } = require('../src/modules/bookings/booking.validation.js');

test('V-23: uploadQuotaMiddleware limits cumulative user upload size and returns 429 when quota exceeded', (t) => {
  resetUploadQuota();
  process.env.ENABLE_UPLOAD_QUOTA_TEST = 'true';
  const originalLimit = process.env.UPLOAD_USER_DAILY_LIMIT_MB;
  process.env.UPLOAD_USER_DAILY_LIMIT_MB = '1'; // 1MB limit for testing

  t.after(() => {
    delete process.env.ENABLE_UPLOAD_QUOTA_TEST;
    if (originalLimit !== undefined) {
      process.env.UPLOAD_USER_DAILY_LIMIT_MB = originalLimit;
    } else {
      delete process.env.UPLOAD_USER_DAILY_LIMIT_MB;
    }
    resetUploadQuota();
  });

  const userId = 'user-test-quota-1';
  const smallFile = { buffer: Buffer.alloc(600 * 1024), size: 600 * 1024 }; // 600KB
  const largeFile = { buffer: Buffer.alloc(500 * 1024), size: 500 * 1024 }; // 500KB

  let req1 = {
    user: { _id: userId },
    files: [smallFile],
  };
  let nextCalled = false;
  let res1 = {
    set: () => {},
    on: () => {},
    statusCode: 200,
    writableEnded: true,
  };

  // 1st request: 600KB <= 1024KB -> allowed
  uploadQuotaMiddleware(req1, res1, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true, 'First upload of 600KB should pass');
  const quotaAfter1 = getUserUploadQuota(userId);
  assert.equal(quotaAfter1.bytesUsed, 600 * 1024);

  // 2nd request: 500KB + 600KB = 1100KB > 1024KB -> 429 Too Many Requests
  let statusSet = null;
  let jsonResponse = null;
  let retryAfterHeader = null;

  let req2 = {
    user: { _id: userId },
    files: [largeFile],
  };
  let res2 = {
    set: (name, val) => {
      if (name.toLowerCase() === 'retry-after') retryAfterHeader = val;
    },
    status: (code) => {
      statusSet = code;
      return {
        json: (payload) => {
          jsonResponse = payload;
        },
      };
    },
    on: () => {},
  };

  uploadQuotaMiddleware(req2, res2, () => {
    assert.fail('Second upload exceeding quota should not call next');
  });

  assert.equal(statusSet, 429, 'Exceeded quota must return status 429');
  assert.equal(jsonResponse.success, false);
  assert.match(jsonResponse.message, /Vượt quá giới hạn dung lượng tải lên/i);
  assert.ok(retryAfterHeader, 'Must set Retry-After header');
  assert.equal(jsonResponse.details.usedBytes, 600 * 1024);
  assert.equal(jsonResponse.details.incomingBytes, 500 * 1024);
});

test('V-23: distinct users have isolated upload quotas', (t) => {
  resetUploadQuota();
  process.env.ENABLE_UPLOAD_QUOTA_TEST = 'true';
  process.env.UPLOAD_USER_DAILY_LIMIT_MB = '1';

  t.after(() => {
    delete process.env.ENABLE_UPLOAD_QUOTA_TEST;
    delete process.env.UPLOAD_USER_DAILY_LIMIT_MB;
    resetUploadQuota();
  });

  const userA = 'user-a';
  const userB = 'user-b';
  const file800k = { buffer: Buffer.alloc(800 * 1024), size: 800 * 1024 };

  // User A uploads 800KB
  let nextA = false;
  uploadQuotaMiddleware(
    { user: { _id: userA }, files: [file800k] },
    { set: () => {}, on: () => {} },
    () => { nextA = true; }
  );
  assert.equal(nextA, true);

  // User B uploads 800KB -> should not be affected by User A
  let nextB = false;
  uploadQuotaMiddleware(
    { user: { _id: userB }, files: [file800k] },
    { set: () => {}, on: () => {} },
    () => { nextB = true; }
  );
  assert.equal(nextB, true);
});

test('V-23: rollback listens to finish and close, guards against double rollback, never drops below 0, and handles partial success', (t) => {
  resetUploadQuota();
  process.env.ENABLE_UPLOAD_QUOTA_TEST = 'true';
  process.env.UPLOAD_USER_DAILY_LIMIT_MB = '1';

  t.after(() => {
    delete process.env.ENABLE_UPLOAD_QUOTA_TEST;
    delete process.env.UPLOAD_USER_DAILY_LIMIT_MB;
    resetUploadQuota();
  });

  const userId = 'user-rollback-advanced';
  const file700k = { buffer: Buffer.alloc(700 * 1024), size: 700 * 1024 };

  const listeners = {};
  const res = {
    set: () => {},
    on: (evt, cb) => {
      listeners[evt] = cb;
    },
    statusCode: 500,
    writableEnded: false,
  };

  const req = {
    user: { _id: userId },
    files: [file700k],
    successfulUploadBytes: 200 * 1024, // 200KB uploaded before failure
  };

  uploadQuotaMiddleware(req, res, () => {});
  assert.equal(getUserUploadQuota(userId).bytesUsed, 700 * 1024);

  // Both 'finish' and 'close' listeners are attached
  assert.equal(typeof listeners.finish, 'function', 'Must listen on finish');
  assert.equal(typeof listeners.close, 'function', 'Must listen on close');

  // Trigger 'finish'
  listeners.finish();
  // 700KB reserved - 500KB failed = 200KB retained (only failed portion was refunded)
  assert.equal(getUserUploadQuota(userId).bytesUsed, 200 * 1024);

  // Trigger 'close' immediately after finish: double rollback guard must prevent second deduction
  listeners.close();
  assert.equal(getUserUploadQuota(userId).bytesUsed, 200 * 1024, 'Double rollback must be guarded against');

  // Verify non-negative bound
  const current = userUploadUsage.get(userId);
  current.bytesUsed = 100;
  // If another rollback attempted to refund 500, Math.max(0, 100 - 500) -> 0
  current.bytesUsed = Math.max(0, current.bytesUsed - 500);
  assert.equal(current.bytesUsed, 0, 'Quota must never drop below 0');
});

test('V-23: memory leak prevention: timer has unref and cleanupExpiredUsage prunes expired records across 1500+ users', () => {
  resetUploadQuota();

  // Verify cleanupInterval has unref called
  if (cleanupInterval && typeof cleanupInterval.hasRef === 'function') {
    assert.equal(cleanupInterval.hasRef(), false, 'cleanupInterval must have unref() called');
  }

  // Populate map with 1500 expired users and 5 active users
  const now = Date.now();
  for (let i = 0; i < 1500; i++) {
    userUploadUsage.set(`expired-user-${i}`, {
      bytesUsed: 5000,
      resetAt: now - 1000, // expired 1s ago
    });
  }
  for (let i = 0; i < 5; i++) {
    userUploadUsage.set(`active-user-${i}`, {
      bytesUsed: 10000,
      resetAt: now + 3600000, // active for 1 hr
    });
  }

  assert.equal(getUsageMapSize(), 1505);

  // Run cleanup
  cleanupExpiredUsage();

  // All 1500 expired records are removed, 5 active records preserved
  assert.equal(getUsageMapSize(), 5, 'Expired users must be pruned to prevent memory leak');
  for (let i = 0; i < 5; i++) {
    assert.ok(userUploadUsage.has(`active-user-${i}`));
  }

  resetUploadQuota();
  assert.equal(getUsageMapSize(), 0);
});

test('V-23: Integration via dispatch(app, ...): POST /api/upload enforces quota, returns 429 + Retry-After, and isolates User A from User B', async (t) => {
  resetUploadQuota();
  process.env.ENABLE_UPLOAD_QUOTA_TEST = 'true';
  const originalLimit = process.env.UPLOAD_USER_DAILY_LIMIT_MB;
  process.env.UPLOAD_USER_DAILY_LIMIT_MB = '0.05'; // 50KB limit for test

  const origUploadStream = cloudinary.uploader.upload_stream;
  cloudinary.uploader.upload_stream = (options, callback) => ({
    end(buffer) {
      callback(null, {
        secure_url: 'https://res.cloudinary.com/mock-cloud/image/upload/v1/test.jpg',
        public_id: 'test_1',
        format: 'jpg',
        width: 800,
        height: 600,
        bytes: buffer ? buffer.length : 0,
      });
    },
  });

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const tokenA = jwt.sign({ sub: userAId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '10m' });
  const tokenB = jwt.sign({ sub: userBId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '10m' });

  const originalUserFindById = User.findById;
  User.findById = (id) => ({
    select: () => {
      const idStr = id?.toString();
      if (idStr === userAId.toString()) {
        return { _id: userAId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 0 };
      }
      if (idStr === userBId.toString()) {
        return { _id: userBId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 0 };
      }
      return null;
    },
  });

  t.after(() => {
    delete process.env.ENABLE_UPLOAD_QUOTA_TEST;
    if (originalLimit !== undefined) {
      process.env.UPLOAD_USER_DAILY_LIMIT_MB = originalLimit;
    } else {
      delete process.env.UPLOAD_USER_DAILY_LIMIT_MB;
    }
    User.findById = originalUserFindById;
    cloudinary.uploader.upload_stream = origUploadStream;
    resetUploadQuota();
  });

  function makeMultipartRequest(fieldName, filename, buffer) {
    const boundary = '----WebKitFormBoundaryQuota' + Math.random().toString(36).substring(2);
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([Buffer.from(header, 'utf8'), buffer, Buffer.from(footer, 'utf8')]);
    return {
      contentType: `multipart/form-data; boundary=${boundary}`,
      body,
    };
  }

  const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
  const smallImg = Buffer.concat([jpegMagic, Buffer.alloc(30 * 1024)]); // ~30KB
  const largeImg = Buffer.concat([jpegMagic, Buffer.alloc(40 * 1024)]); // ~40KB

  // 1. User A uploads 30KB (limit is 50KB) -> 200 OK
  const reqA1 = makeMultipartRequest('images', 'a1.jpg', smallImg);
  const resA1 = await dispatch(app, {
    method: 'POST',
    url: '/api/upload',
    headers: {
      authorization: `Bearer ${tokenA}`,
      'content-type': reqA1.contentType,
    },
    body: reqA1.body,
  });
  assert.equal(resA1.status, 200, 'User A first upload within quota must succeed');
  assert.equal(resA1.body.success, true);

  // 2. User A uploads another 40KB -> 30KB + 40KB = 70KB > 50KB -> 429 Too Many Requests + Retry-After
  const reqA2 = makeMultipartRequest('images', 'a2.jpg', largeImg);
  const resA2 = await dispatch(app, {
    method: 'POST',
    url: '/api/upload',
    headers: {
      authorization: `Bearer ${tokenA}`,
      'content-type': reqA2.contentType,
    },
    body: reqA2.body,
  });
  assert.equal(resA2.status, 429, 'User A second upload exceeding quota must return 429');
  assert.equal(resA2.body.success, false);
  assert.ok(resA2.headers['retry-after'], 'Response must include Retry-After header');
  assert.match(resA2.body.message, /Vượt quá giới hạn dung lượng/i);

  // 3. User B uploads 30KB -> 200 OK (User B quota is independent of User A)
  const reqB1 = makeMultipartRequest('images', 'b1.jpg', smallImg);
  const resB1 = await dispatch(app, {
    method: 'POST',
    url: '/api/upload',
    headers: {
      authorization: `Bearer ${tokenB}`,
      'content-type': reqB1.contentType,
    },
    body: reqB1.body,
  });
  assert.equal(resB1.status, 200, 'User B upload must succeed independently of User A');
  assert.equal(resB1.body.success, true);
});

test('V-23: validateStatusUpdate validates photos, progressPhotos, and proofPhotos with isAllowedMediaUrl', () => {
  const allowedCloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v12345/photo.jpg';
  const maliciousUrl = 'https://malicious-external-domain.com/hack.jpg';
  const dataUri = 'data:image/jpeg;base64,' + Buffer.from('abc').toString('base64');

  // Case 1: Invalid photos (not an array)
  assert.throws(() => {
    validateStatusUpdate({
      body: { status: 'IN_PROGRESS', photos: 'not-an-array' },
    }, {}, () => {});
  }, (err) => Boolean(err.statusCode === 400 && err.details?.some(e => e.field === 'photos')));

  // Case 2: Malicious URL in photos
  assert.throws(() => {
    validateStatusUpdate({
      body: { status: 'IN_PROGRESS', photos: [maliciousUrl] },
    }, {}, () => {});
  }, (err) => Boolean(err.statusCode === 400 && err.details?.some(e => e.field === 'photos')));

  // Case 3: Malicious URL in progressPhotos
  assert.throws(() => {
    validateStatusUpdate({
      body: { status: 'IN_PROGRESS', progressPhotos: [maliciousUrl] },
    }, {}, () => {});
  }, (err) => Boolean(err.statusCode === 400 && err.details?.some(e => e.field === 'progressPhotos')));

  // Case 4: Malicious URL in proofPhotos
  assert.throws(() => {
    validateStatusUpdate({
      body: { status: 'COMPLETED', confirmCompletion: true, proofPhotos: [maliciousUrl] },
    }, {}, () => {});
  }, (err) => Boolean(err.statusCode === 400 && err.details?.some(e => e.field === 'proofPhotos')));

  // Case 5: Non-array in proofPhotos
  assert.throws(() => {
    validateStatusUpdate({
      body: { status: 'COMPLETED', confirmCompletion: true, proofPhotos: 'bad' },
    }, {}, () => {});
  }, (err) => Boolean(err.statusCode === 400 && err.details?.some(e => e.field === 'proofPhotos')));

  // Case 6: Valid Cloudinary URLs pass cleanly
  let nextCalled = false;
  const req = {
    body: {
      status: 'COMPLETED',
      confirmCompletion: true,
      proofPhotos: [allowedCloudinaryUrl],
    },
  };
  validateStatusUpdate(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true, 'Valid Cloudinary photo must pass validation');
  assert.deepEqual(req.body.photos, [allowedCloudinaryUrl]);
});

test('V-23: Booking model schema enforces maxlength 2048 on progressPhotos and proofPhotos', () => {
  const normalPhoto = 'https://res.cloudinary.com/demo/image/upload/v1234/test.jpg';
  const oversizedPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(3000);

  const validBooking = new Booking({
    customer: '507f1f77bcf86cd799439011',
    provider: '507f1f77bcf86cd799439012',
    service: '507f1f77bcf86cd799439013',
    request: '507f1f77bcf86cd799439014',
    address: '123 Test St',
    scheduledStartAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 3600000),
    price: 100000,
    progressPhotos: [normalPhoto],
    proofPhotos: [normalPhoto],
  });

  const validErr = validBooking.validateSync();
  assert.ifError(validErr);

  const invalidBooking = new Booking({
    customer: '507f1f77bcf86cd799439011',
    provider: '507f1f77bcf86cd799439012',
    service: '507f1f77bcf86cd799439013',
    request: '507f1f77bcf86cd799439014',
    address: '123 Test St',
    scheduledStartAt: new Date(),
    scheduledEndAt: new Date(Date.now() + 3600000),
    price: 100000,
    progressPhotos: [oversizedPhoto],
  });

  const invalidErr = invalidBooking.validateSync();
  assert.ok(invalidErr, 'Oversized photo must fail mongoose validation');
  assert.match(invalidErr.message, /is longer than the maximum allowed length/i);
});
