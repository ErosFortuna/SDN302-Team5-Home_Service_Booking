const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

// Mock helper
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

// -----------------------------------------------------------------------------
// 1. HTTP Smoke Tests: Proves routes are mounted and return 401 without token
// -----------------------------------------------------------------------------
test('Smoke: /api/complaints routes are mounted in app and return 401 without auth token', async (t) => {
  const app = require('../src/app.js');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/complaints`;

  try {
    // 1. GET /api/complaints without token
    const resGet = await fetch(baseUrl);
    assert.strictEqual(resGet.status, 401, 'GET /api/complaints must return 401 when unauthenticated');
    const bodyGet = await resGet.json();
    assert.strictEqual(bodyGet.message, 'Authentication required');

    // 2. GET /api/complaints with invalid token
    const resBadToken = await fetch(baseUrl, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.strictEqual(resBadToken.status, 401, 'Must return 401 when token is invalid');

    // 3. POST /api/complaints without token
    const resPost = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking: '507f1f77bcf86cd799439011' }),
    });
    assert.strictEqual(resPost.status, 401, 'POST /api/complaints must return 401 when unauthenticated');

    // 4. POST /api/complaints/:id/reply without token
    const resReply = await fetch(`${baseUrl}/507f1f77bcf86cd799439011/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Phản hồi thử nghiệm' }),
    });
    assert.strictEqual(resReply.status, 401, 'POST reply must return 401 when unauthenticated');

    // 5. PATCH /api/complaints/:id/resolve without token
    const resResolve = await fetch(`${baseUrl}/507f1f77bcf86cd799439011/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionNote: 'Đã giải quyết xong' }),
    });
    assert.strictEqual(resResolve.status, 401, 'PATCH resolve must return 401 when unauthenticated');
  } finally {
    server.close();
  }
});

// -----------------------------------------------------------------------------
// 2. Unit Logic & Authorization Tests: createComplaint
// -----------------------------------------------------------------------------
test('createComplaint: rejects when booking is still in PENDING_CONFIRMATION', async () => {
  const { createComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Booking = require('../src/modules/bookings/booking.model.js');

  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  // Stub Booking.findById
  const originalFindById = Booking.findById;
  Booking.findById = () => ({
    populate: async () => ({
      _id: bookingId,
      customer: customerId,
      provider: new mongoose.Types.ObjectId(),
      status: 'PENDING_CONFIRMATION',
    }),
  });

  const req = {
    user: { _id: customerId, role: 'CUSTOMER' },
    body: {
      booking: bookingId.toString(),
      category: 'QUALITY',
      description: 'Dịch vụ kém chất lượng rất nhiều và không đúng cam kết',
    },
  };
  const res = mockRes();

  try {
    await createComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /pending confirmation/i);
  } finally {
    Booking.findById = originalFindById;
  }
});

test('createComplaint: rejects when user is not the booking owner (403 IDOR)', async () => {
  const { createComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Booking = require('../src/modules/bookings/booking.model.js');

  const realCustomer = new mongoose.Types.ObjectId();
  const maliciousCustomer = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  const originalFindById = Booking.findById;
  Booking.findById = () => ({
    populate: async () => ({
      _id: bookingId,
      customer: realCustomer,
      provider: new mongoose.Types.ObjectId(),
      status: 'COMPLETED',
    }),
  });

  const req = {
    user: { _id: maliciousCustomer, role: 'CUSTOMER' },
    body: {
      booking: bookingId.toString(),
      category: 'QUALITY',
      description: 'Tôi muốn khiếu nại thay người khác không được phép',
    },
  };
  const res = mockRes();

  try {
    await createComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /only the customer who owns this booking/i);
  } finally {
    Booking.findById = originalFindById;
  }
});

test('createComplaint: mass assignment protection - status and refundAmount in body are ignored', async () => {
  const { createComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Booking = require('../src/modules/bookings/booking.model.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const originalBookingFind = Booking.findById;
  const originalComplaintCreate = Complaint.create;
  const originalComplaintFind = Complaint.findById;

  let createdPayload = null;

  Booking.findById = () => ({
    populate: async () => ({
      _id: bookingId,
      customer: customerId,
      provider: providerId,
      status: 'COMPLETED',
    }),
  });

  Complaint.create = async (payload) => {
    createdPayload = payload;
    return { _id: complaintId };
  };

  Complaint.findById = () => ({
    populate: () => ({
      populate: async () => ({
        _id: complaintId,
        status: createdPayload.status,
        refundAmount: createdPayload.refundAmount,
      }),
    }),
  });

  const req = {
    user: { _id: customerId, role: 'CUSTOMER' },
    body: {
      booking: bookingId.toString(),
      category: 'DAMAGE',
      description: 'Làm vỡ kính cửa sổ trong lúc di chuyển đồ đạc',
      // Attacker attempts mass assignment:
      status: 'RESOLVED',
      refundAmount: 99999999,
      resolvedBy: customerId,
    },
  };
  const res = mockRes();

  try {
    await createComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(createdPayload.status, 'OPEN', 'Status must always default to OPEN');
    assert.strictEqual(createdPayload.refundAmount, 0, 'Refund must always be 0 on creation');
  } finally {
    Booking.findById = originalBookingFind;
    Complaint.create = originalComplaintCreate;
    Complaint.findById = originalComplaintFind;
  }
});

// -----------------------------------------------------------------------------
// 3. IDOR Protection: getComplaintById
// -----------------------------------------------------------------------------
test('getComplaintById: rejects unrelated third-party users with 403', async () => {
  const { getComplaintById } = require('../src/modules/complaints/complaint.controller.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const reporterId = new mongoose.Types.ObjectId();
  const againstId = new mongoose.Types.ObjectId();
  const hackerId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const originalFindById = Complaint.findById;
  Complaint.findById = () => ({
    populate: () => ({
      populate: () => ({
        populate: () => ({
          populate: async () => ({
            _id: complaintId,
            reporter: { _id: reporterId },
            against: { _id: againstId },
          }),
        }),
      }),
    }),
  });

  const req = {
    params: { id: complaintId.toString() },
    user: { _id: hackerId, role: 'CUSTOMER' },
  };
  const res = mockRes();

  try {
    await getComplaintById(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.message, /do not have access/i);
  } finally {
    Complaint.findById = originalFindById;
  }
});

test('getComplaintById: allows reporter, against provider, and staff/admin', async () => {
  const { getComplaintById } = require('../src/modules/complaints/complaint.controller.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const reporterId = new mongoose.Types.ObjectId();
  const againstId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const fakeComplaint = {
    _id: complaintId,
    reporter: { _id: reporterId },
    against: { _id: againstId },
  };

  const originalFindById = Complaint.findById;
  Complaint.findById = () => ({
    populate: () => ({
      populate: () => ({
        populate: () => ({
          populate: async () => fakeComplaint,
        }),
      }),
    }),
  });

  try {
    // 1. Reporter can view
    const res1 = mockRes();
    await getComplaintById({ params: { id: complaintId.toString() }, user: { _id: reporterId, role: 'CUSTOMER' } }, res1, () => {});
    assert.strictEqual(res1.statusCode, 200);

    // 2. Against provider can view
    const res2 = mockRes();
    await getComplaintById({ params: { id: complaintId.toString() }, user: { _id: againstId, role: 'PROVIDER' } }, res2, () => {});
    assert.strictEqual(res2.statusCode, 200);

    // 3. Staff can view
    const res3 = mockRes();
    await getComplaintById({ params: { id: complaintId.toString() }, user: { _id: staffId, role: 'STAFF' } }, res3, () => {});
    assert.strictEqual(res3.statusCode, 200);
  } finally {
    Complaint.findById = originalFindById;
  }
});

// -----------------------------------------------------------------------------
// 4. Thread Discussion & State Transition: replyComplaint
// -----------------------------------------------------------------------------
test('replyComplaint: rejects reply when complaint is already RESOLVED or CLOSED', async () => {
  const { replyComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const reporterId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const originalFindById = Complaint.findById;
  Complaint.findById = async () => ({
    _id: complaintId,
    reporter: reporterId,
    against: new mongoose.Types.ObjectId(),
    status: 'RESOLVED',
  });

  const req = {
    params: { id: complaintId.toString() },
    user: { _id: reporterId, role: 'CUSTOMER' },
    body: { message: 'Tôi vẫn chưa hài lòng với số tiền bồi thường' },
  };
  const res = mockRes();

  try {
    await replyComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /cannot reply to a resolved or closed complaint/i);
  } finally {
    Complaint.findById = originalFindById;
  }
});

test('replyComplaint: auto-transitions status from OPEN to UNDER_REVIEW when provider replies', async () => {
  const { replyComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const reporterId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const originalFindById = Complaint.findById;
  const originalFindByIdAndUpdate = Complaint.findByIdAndUpdate;

  Complaint.findById = async () => ({
    _id: complaintId,
    reporter: reporterId,
    against: providerId,
    status: 'OPEN',
  });

  let updateArg = null;
  Complaint.findByIdAndUpdate = (id, ops) => {
    updateArg = ops;
    return {
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => ({ _id: complaintId }),
          }),
        }),
      }),
    };
  };

  const req = {
    params: { id: complaintId.toString() },
    user: { _id: providerId, role: 'PROVIDER' },
    body: { message: 'Tôi xin giải trình về sự cố trên như sau...' },
  };
  const res = mockRes();

  try {
    await replyComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(updateArg.$set.status, 'UNDER_REVIEW', 'Status must auto-transition to UNDER_REVIEW');
    assert.strictEqual(updateArg.$set.providerResponse.note, 'Tôi xin giải trình về sự cố trên như sau...');
    assert.strictEqual(updateArg.$push.replies.message, 'Tôi xin giải trình về sự cố trên như sau...');
  } finally {
    Complaint.findById = originalFindById;
    Complaint.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

// -----------------------------------------------------------------------------
// 5. Resolution & Concurrency Guard: resolveComplaint
// -----------------------------------------------------------------------------
test('resolveComplaint: returns 409 when complaint was already resolved/closed', async () => {
  const { resolveComplaint } = require('../src/modules/complaints/complaint.controller.js');
  const Complaint = require('../src/modules/complaints/complaint.model.js');

  const staffId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const originalFindOneAndUpdate = Complaint.findOneAndUpdate;
  const originalFindById = Complaint.findById;

  // findOneAndUpdate returns null because status is already RESOLVED
  Complaint.findOneAndUpdate = () => null;
  Complaint.findById = async () => ({
    _id: complaintId,
    status: 'RESOLVED',
  });

  const req = {
    params: { id: complaintId.toString() },
    user: { _id: staffId, role: 'STAFF' },
    body: {
      status: 'RESOLVED',
      resolutionNote: 'Đã hoàn tất bồi thường theo đúng thỏa thuận',
      refundAmount: 100000,
    },
  };
  const res = mockRes();

  try {
    await resolveComplaint(req, res, () => {});
    assert.strictEqual(res.statusCode, 409, 'Must return 409 Conflict when resolving an already closed complaint');
    assert.match(res.body.message, /already/i);
  } finally {
    Complaint.findOneAndUpdate = originalFindOneAndUpdate;
    Complaint.findById = originalFindById;
  }
});

test('resolveComplaint: rejects invalid resolution status (not RESOLVED or REJECTED)', async () => {
  const { resolveComplaint } = require('../src/modules/complaints/complaint.controller.js');

  const staffId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  const req = {
    params: { id: complaintId.toString() },
    user: { _id: staffId, role: 'STAFF' },
    body: {
      status: 'INVALID_STATUS',
      resolutionNote: 'Ghi chú giải quyết hợp lệ',
    },
  };
  const res = mockRes();

  await resolveComplaint(req, res, () => {});
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.message, /status must be either resolved or rejected/i);
});

