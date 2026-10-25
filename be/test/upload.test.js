const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadImageBuffer, uploadMultipleImages } = require('../src/modules/upload/upload.service.js');
const { isCloudinaryConfigured } = require('../src/config/cloudinary.js');

test('uploadImageBuffer handles image buffer and returns URL and publicId', async () => {
  const dummyBuffer = Buffer.from('fake image content for testing');
  const result = await uploadImageBuffer(dummyBuffer, {
    folder: 'test-folder',
    filename: 'test.jpg',
    mimeType: 'image/jpeg',
  });

  assert.ok(result.url, 'Expected result to have a url');
  assert.ok(result.publicId, 'Expected result to have a publicId');
});

test('uploadMultipleImages handles multiple files array', async () => {
  const files = [
    { buffer: Buffer.from('image1'), originalname: 'img1.png', mimetype: 'image/png' },
    { buffer: Buffer.from('image2'), originalname: 'img2.jpg', mimetype: 'image/jpeg' },
  ];

  const results = await uploadMultipleImages(files);
  assert.equal(results.length, 2);
  assert.ok(results[0].url);
  assert.ok(results[1].url);
});
