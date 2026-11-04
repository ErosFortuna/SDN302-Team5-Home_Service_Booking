const test = require('node:test');
const assert = require('node:assert/strict');
const { env } = require('../src/config/env.js');
const { cloudinary } = require('../src/config/cloudinary.js');
const { uploadImageBuffer, uploadMultipleImages } = require('../src/modules/upload/upload.service.js');
const { resolveUploadFolder } = require('../src/modules/upload/upload.controller.js');

function withMockedCloudinary(fn) {
  return async () => {
    const originalUploadStream = cloudinary.uploader.upload_stream;
    const originalEnv = {
      cloudinaryUrl: env.cloudinaryUrl,
      cloudinaryCloudName: env.cloudinaryCloudName,
      cloudinaryApiKey: env.cloudinaryApiKey,
      cloudinaryApiSecret: env.cloudinaryApiSecret,
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

test(
  'uploadImageBuffer handles image buffer and returns URL and publicId',
  withMockedCloudinary(async () => {
    const dummyBuffer = Buffer.from('fake image content for testing');
    const result = await uploadImageBuffer(dummyBuffer, {
      folder: 'test-folder',
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
      { buffer: Buffer.from('image1'), originalname: 'img1.png', mimetype: 'image/png' },
      { buffer: Buffer.from('image2'), originalname: 'img2.jpg', mimetype: 'image/jpeg' },
    ];

    const results = await uploadMultipleImages(files);
    assert.equal(results.length, 2);
    assert.ok(results[0].url);
    assert.ok(results[1].url);
  })
);

test('provider verification document uploads are scoped to the authenticated provider', () => {
  const provider = { _id: 'provider-123', role: 'PROVIDER' };
  assert.equal(
    resolveUploadFolder(provider, 'home-service-booking/provider-documents/another-provider'),
    'home-service-booking/provider-documents/provider-123',
  );
  assert.equal(
    resolveUploadFolder(provider, undefined),
    'home-service-booking/service-requests',
  );
  assert.equal(
    resolveUploadFolder({ _id: 'customer-123', role: 'CUSTOMER' }, 'custom-folder'),
    'custom-folder',
  );
});
