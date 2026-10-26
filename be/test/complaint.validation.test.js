const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateCreateComplaint,
  validateResolveComplaint,
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

test('validateCreateComplaint rejects missing booking ID', () => {
  const req = { body: { category: 'QUALITY', description: 'Dịch vụ kém chất lượng rất nhiều' } };
  const res = mockRes();
  let calledNext = false;

  validateCreateComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /booking id is required/i);
});

test('validateCreateComplaint rejects invalid category', () => {
  const req = {
    body: {
      booking: '507f1f77bcf86cd799439011',
      category: 'INVALID_CATEGORY',
      description: 'Dịch vụ kém chất lượng và làm hư hỏng thiết bị',
    },
  };
  const res = mockRes();
  let calledNext = false;

  validateCreateComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /category must be one of/i);
});

test('validateCreateComplaint rejects description shorter than 10 characters', () => {
  const req = {
    body: {
      booking: '507f1f77bcf86cd799439011',
      category: 'QUALITY',
      description: 'Quá tệ',
    },
  };
  const res = mockRes();
  let calledNext = false;

  validateCreateComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /between 10 and 4000/i);
});

test('validateCreateComplaint passes with valid inputs', () => {
  const req = {
    body: {
      booking: '507f1f77bcf86cd799439011',
      category: 'QUALITY',
      title: 'Thợ làm rò rỉ nước',
      description: 'Thợ sửa ống nước nhưng sau khi hoàn thành vẫn tiếp tục rò rỉ nước ngập sàn nhà',
      evidenceUrls: ['https://res.cloudinary.com/demo/image.jpg'],
    },
  };
  const res = mockRes();
  let calledNext = false;

  validateCreateComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
});

test('validateResolveComplaint requires resolution note', () => {
  const req = { body: { resolutionNote: '' } };
  const res = mockRes();
  let calledNext = false;

  validateResolveComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /resolution note is required/i);
});

test('validateResolveComplaint passes with note, status, and refundAmount', () => {
  const req = {
    body: {
      resolutionNote: 'Đã hòa giải và hoàn trả 150.000 VNĐ cho khách hàng',
      status: 'RESOLVED',
      refundAmount: 150000,
    },
  };
  const res = mockRes();
  let calledNext = false;

  validateResolveComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
});

test('validateReplyComplaint requires message', () => {
  const req = { body: { message: '' } };
  const res = mockRes();
  let calledNext = false;

  validateReplyComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /reply message is required/i);
});

test('validateReplyComplaint passes with valid message', () => {
  const req = {
    body: {
      message: 'Tôi đã kiểm tra lại và gửi thêm ảnh minh chứng lúc nghiệm thu',
      evidenceUrls: ['https://example.com/receipt.png'],
    },
  };
  const res = mockRes();
  let calledNext = false;

  validateReplyComplaint(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
});
