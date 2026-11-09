const test = require('node:test');
const assert = require('node:assert/strict');
const { env } = require('../src/config/env.js');
const { cloudinary } = require('../src/config/cloudinary.js');
const { AppError } = require('../src/shared/app-error.js');
const { uploadImageBuffer, uploadMultipleImages } = require('../src/modules/upload/upload.service.js');
const { handleUploadImages, resolveUploadFolder } = require('../src/modules/upload/upload.controller.js');
const {
  detectImageMimeType,
  validateImageBuffer,
  fileFilter,
  ALLOWED_MIME_TYPES,
} = require('../src/modules/upload/upload.validation.js');

const VALID_JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
const VALID_PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'ascii'),
]);
const VALID_GIF_BUFFER = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00', 'binary');
const SVG_BUFFER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
const FAKE_IMAGE_BUFFER = Buffer.from('This is a text file masquerading as a JPEG image', 'utf8');

function withMockedCloudinary(fn) {
  return async () => {
    const originalUploadStream = cloudinary.uploader.upload_stream;
    const originalEnv = {
      cloudinaryUrl: env.cloudinaryUrl,
      cloudinaryCloudName: env.cloudinaryCloudName,
      cloudinaryApiKey: env.cloudinaryApiKey,
      cloudinaryApiSecret: env.cloudinaryApiSecret,
      nodeEnv: env.nodeEnv,
    };

    // Ensure configured branch is always exercised and mocked (never calls network)
    env.cloudinaryCloudName = env.cloudinaryCloudName || 'mock-cloud';
    env.cloudinaryApiKey = env.cloudinaryApiKey || 'mock-key';
    env.cloudinaryApiSecret = env.cloudinaryApiSecret || 'mock-secret';

    let callSeq = 0;
    cloudinary.uploader.upload_stream = (options, callback) => {
      callSeq += 1;
      const seq = callSeq;
      const folder = options?.folder || 'home-service-booking/service-requests';
      const baseId = options?.public_id || `img_${seq}`;
      return {
        end(buffer) {
          callback(null, {
            secure_url: `https://res.cloudinary.com/mock-cloud/image/upload/v1/${folder}/${baseId}.jpg`,
            public_id: `${folder}/${baseId}`,
            format: 'jpg',
            width: 800,
            height: 600,
            bytes: buffer ? buffer.length : 0,
          });
        },
      };
    };

    try {
      await fn();
    } finally {
      cloudinary.uploader.upload_stream = originalUploadStream;
      Object.assign(env, originalEnv);
    }
  };
}

// ---------------------------------------------------------
// 1. Magic bytes detection & validation tests
// ---------------------------------------------------------
test('detectImageMimeType identifies valid image formats from magic bytes', () => {
  assert.equal(detectImageMimeType(VALID_JPEG_BUFFER), 'image/jpeg');
  assert.equal(detectImageMimeType(VALID_PNG_BUFFER), 'image/png');
  assert.equal(detectImageMimeType(VALID_WEBP_BUFFER), 'image/webp');
  assert.equal(detectImageMimeType(VALID_GIF_BUFFER), 'image/gif');
  assert.equal(detectImageMimeType(SVG_BUFFER), null);
  assert.equal(detectImageMimeType(FAKE_IMAGE_BUFFER), null);
  assert.equal(detectImageMimeType(Buffer.from([])), null);
  assert.equal(detectImageMimeType(null), null);
});

test('validateImageBuffer accepts JPEG, PNG, WEBP and rejects SVG, GIF, fake images', () => {
  assert.equal(validateImageBuffer(VALID_JPEG_BUFFER), 'image/jpeg');
  assert.equal(validateImageBuffer(VALID_PNG_BUFFER), 'image/png');
  assert.equal(validateImageBuffer(VALID_WEBP_BUFFER), 'image/webp');

  // SVG rejected
  assert.throws(
    () => validateImageBuffer(SVG_BUFFER),
    (err) => err instanceof AppError && err.statusCode === 400 && /JPEG, PNG, WEBP/.test(err.message)
  );

  // GIF rejected (not in allowlist)
  assert.throws(
    () => validateImageBuffer(VALID_GIF_BUFFER),
    (err) => err instanceof AppError && err.statusCode === 400
  );

  // Fake image text content rejected
  assert.throws(
    () => validateImageBuffer(FAKE_IMAGE_BUFFER),
    (err) => err instanceof AppError && err.statusCode === 400
  );
});

test('fileFilter accepts jpeg, png, webp and rejects svg, gif, pdf with 400 error', () => {
  // Accepted
  fileFilter({}, { mimetype: 'image/jpeg' }, (err, accepted) => {
    assert.equal(err, null);
    assert.equal(accepted, true);
  });
  fileFilter({}, { mimetype: 'IMAGE/PNG' }, (err, accepted) => {
    assert.equal(err, null);
    assert.equal(accepted, true);
  });
  fileFilter({}, { mimetype: 'image/webp' }, (err, accepted) => {
    assert.equal(err, null);
    assert.equal(accepted, true);
  });

  // SVG rejected with 400 and message matching actual list
  fileFilter({}, { mimetype: 'image/svg+xml' }, (err, accepted) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'Only image files (JPEG, PNG, WEBP) are allowed');
    assert.equal(accepted, undefined);
  });

  // GIF rejected
  fileFilter({}, { mimetype: 'image/gif' }, (err, accepted) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'Only image files (JPEG, PNG, WEBP) are allowed');
  });

  // PDF rejected
  fileFilter({}, { mimetype: 'application/pdf' }, (err, accepted) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

// ---------------------------------------------------------
// 2. Folder allowlist tests
// ---------------------------------------------------------
test('resolveUploadFolder defaults to service-requests when folder is empty or undefined', () => {
  const customer = { _id: 'cust-1', role: 'CUSTOMER' };
  assert.equal(resolveUploadFolder(customer, undefined), 'home-service-booking/service-requests');
  assert.equal(resolveUploadFolder(customer, ''), 'home-service-booking/service-requests');
  assert.equal(resolveUploadFolder(customer, '   '), 'home-service-booking/service-requests');
});

test('resolveUploadFolder allows server-whitelisted purposes', () => {
  const customer = { _id: 'cust-1', role: 'CUSTOMER' };

  // request-attachments aliases
  assert.equal(resolveUploadFolder(customer, 'request-attachments'), 'home-service-booking/service-requests');
  assert.equal(resolveUploadFolder(customer, 'service-requests'), 'home-service-booking/service-requests');
  assert.equal(resolveUploadFolder(customer, 'home-service-booking/service-requests'), 'home-service-booking/service-requests');

  // booking-photos
  assert.equal(resolveUploadFolder(customer, 'booking-photos'), 'home-service-booking/booking-photos');
  assert.equal(resolveUploadFolder(customer, 'home-service-booking/booking-photos'), 'home-service-booking/booking-photos');

  // avatars
  assert.equal(resolveUploadFolder(customer, 'avatars'), 'home-service-booking/avatars');
  assert.equal(resolveUploadFolder(customer, 'home-service-booking/avatars'), 'home-service-booking/avatars');
});

test('provider verification document uploads are scoped to the authenticated provider', () => {
  const provider = { _id: 'provider-123', role: 'PROVIDER' };
  assert.equal(
    resolveUploadFolder(provider, 'home-service-booking/provider-documents/another-provider'),
    'home-service-booking/provider-documents/provider-123',
  );
  assert.equal(
    resolveUploadFolder(provider, 'provider-documents'),
    'home-service-booking/provider-documents/provider-123',
  );
  assert.equal(
    resolveUploadFolder(provider, undefined),
    'home-service-booking/service-requests',
  );
});

test('resolveUploadFolder rejects unknown folders and unauthorized provider-documents with 422', () => {
  const customer = { _id: 'customer-123', role: 'CUSTOMER' };

  // Unknown folder rejected with 422
  assert.throws(
    () => resolveUploadFolder(customer, 'custom-folder'),
    (err) => err instanceof AppError && err.statusCode === 422
  );

  // Path traversal rejected with 422
  assert.throws(
    () => resolveUploadFolder(customer, '../../etc/passwd'),
    (err) => err instanceof AppError && err.statusCode === 422
  );

  // Non-provider cannot upload to provider-documents
  assert.throws(
    () => resolveUploadFolder(customer, 'provider-documents'),
    (err) => err instanceof AppError && err.statusCode === 422
  );
  assert.throws(
    () => resolveUploadFolder(customer, 'home-service-booking/provider-documents'),
    (err) => err instanceof AppError && err.statusCode === 422
  );
});

// ---------------------------------------------------------
// 3. Service tests with Mocked Cloudinary
// ---------------------------------------------------------
test(
  'uploadImageBuffer handles image buffer and returns URL and publicId',
  withMockedCloudinary(async () => {
    const result = await uploadImageBuffer(VALID_JPEG_BUFFER, {
      folder: 'home-service-booking/service-requests',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
    });

    assert.ok(result.url, 'Expected result to have a url');
    assert.ok(result.publicId, 'Expected result to have a publicId');
    assert.match(result.url, /^https:\/\/res\.cloudinary\.com\/mock-cloud\//);
  })
);

test(
  'uploadMultipleImages handles multiple files array',
  withMockedCloudinary(async () => {
    const files = [
      { buffer: VALID_PNG_BUFFER, originalname: 'img1.png', mimetype: 'image/png' },
      { buffer: VALID_JPEG_BUFFER, originalname: 'img2.jpg', mimetype: 'image/jpeg' },
    ];

    const results = await uploadMultipleImages(files);
    assert.equal(results.length, 2);
    assert.ok(results[0].url);
    assert.ok(results[1].url);
  })
);

// ---------------------------------------------------------
// 4. Cloudinary unconfigured behavior (Production vs Dev)
// ---------------------------------------------------------
test('when Cloudinary is unconfigured in production, uploadImageBuffer throws 503 AppError', async () => {
  const originalEnv = {
    cloudinaryUrl: env.cloudinaryUrl,
    cloudinaryCloudName: env.cloudinaryCloudName,
    cloudinaryApiKey: env.cloudinaryApiKey,
    cloudinaryApiSecret: env.cloudinaryApiSecret,
    nodeEnv: env.nodeEnv,
  };
  const originalProcessEnv = process.env.NODE_ENV;

  try {
    delete env.cloudinaryUrl;
    delete env.cloudinaryCloudName;
    delete env.cloudinaryApiKey;
    delete env.cloudinaryApiSecret;
    delete process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    env.nodeEnv = 'production';
    process.env.NODE_ENV = 'production';

    await assert.rejects(
      async () => {
        await uploadImageBuffer(VALID_JPEG_BUFFER, {
          folder: 'home-service-booking/service-requests',
          mimeType: 'image/jpeg',
        });
      },
      (err) => err instanceof AppError && err.statusCode === 503 && /not configured/.test(err.message)
    );
  } finally {
    Object.assign(env, originalEnv);
    process.env.NODE_ENV = originalProcessEnv;
  }
});

test('when Cloudinary is unconfigured in development, uploadImageBuffer returns base64 fallback', async () => {
  const originalEnv = {
    cloudinaryUrl: env.cloudinaryUrl,
    cloudinaryCloudName: env.cloudinaryCloudName,
    cloudinaryApiKey: env.cloudinaryApiKey,
    cloudinaryApiSecret: env.cloudinaryApiSecret,
    nodeEnv: env.nodeEnv,
  };
  const originalProcessEnv = process.env.NODE_ENV;

  try {
    delete env.cloudinaryUrl;
    delete env.cloudinaryCloudName;
    delete env.cloudinaryApiKey;
    delete env.cloudinaryApiSecret;
    delete process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    env.nodeEnv = 'development';
    process.env.NODE_ENV = 'development';

    const result = await uploadImageBuffer(VALID_JPEG_BUFFER, {
      folder: 'home-service-booking/service-requests',
      mimeType: 'image/jpeg',
    });

    assert.ok(result.url.startsWith('data:image/jpeg;base64,'));
    assert.ok(result.publicId.startsWith('dev_'));
  } finally {
    Object.assign(env, originalEnv);
    process.env.NODE_ENV = originalProcessEnv;
  }
});

// ---------------------------------------------------------
// 5. Controller handleUploadImages integration tests
// ---------------------------------------------------------
test(
  'handleUploadImages rejects fake image buffer with 400',
  withMockedCloudinary(async () => {
    const req = {
      user: { _id: 'cust-1', role: 'CUSTOMER' },
      files: [{ buffer: FAKE_IMAGE_BUFFER, originalname: 'fake.jpg', mimetype: 'image/jpeg' }],
      body: { folder: 'request-attachments' },
    };
    let capturedError = null;
    const res = {
      status() { return this; },
      json() { return this; },
    };
    const next = (err) => { capturedError = err; };

    await handleUploadImages(req, res, next);
    assert.ok(capturedError instanceof AppError, 'Expected AppError');
    assert.equal(capturedError.statusCode, 400);
    assert.match(capturedError.message, /JPEG, PNG, WEBP/);
  })
);

test(
  'handleUploadImages rejects SVG buffer with 400',
  withMockedCloudinary(async () => {
    const req = {
      user: { _id: 'cust-1', role: 'CUSTOMER' },
      files: [{ buffer: SVG_BUFFER, originalname: 'xss.jpg', mimetype: 'image/jpeg' }],
      body: { folder: 'request-attachments' },
    };
    let capturedError = null;
    const res = {
      status() { return this; },
      json() { return this; },
    };
    const next = (err) => { capturedError = err; };

    await handleUploadImages(req, res, next);
    assert.ok(capturedError instanceof AppError, 'Expected AppError');
    assert.equal(capturedError.statusCode, 400);
  })
);

test(
  'handleUploadImages rejects unknown folder with 422',
  withMockedCloudinary(async () => {
    const req = {
      user: { _id: 'cust-1', role: 'CUSTOMER' },
      files: [{ buffer: VALID_PNG_BUFFER, originalname: 'valid.png', mimetype: 'image/png' }],
      body: { folder: 'unknown-folder' },
    };
    let capturedError = null;
    const res = {
      status() { return this; },
      json() { return this; },
    };
    const next = (err) => { capturedError = err; };

    await handleUploadImages(req, res, next);
    assert.ok(capturedError instanceof AppError, 'Expected AppError');
    assert.equal(capturedError.statusCode, 422);
  })
);

test(
  'handleUploadImages successfully processes valid images into allowed folder',
  withMockedCloudinary(async () => {
    const req = {
      user: { _id: 'cust-1', role: 'CUSTOMER' },
      files: [{ buffer: VALID_PNG_BUFFER, originalname: 'valid.png', mimetype: 'image/png' }],
      body: { folder: 'request-attachments' },
    };
    let capturedStatus = null;
    let capturedJson = null;
    const res = {
      status(code) { capturedStatus = code; return this; },
      json(payload) { capturedJson = payload; return this; },
    };
    const next = (err) => { if (err) throw err; };

    await handleUploadImages(req, res, next);
    assert.equal(capturedStatus, 200);
    assert.equal(capturedJson.success, true);
    assert.equal(capturedJson.urls.length, 1);
    assert.match(capturedJson.urls[0], /^https:\/\/res\.cloudinary\.com\/mock-cloud\//);
  })
);
