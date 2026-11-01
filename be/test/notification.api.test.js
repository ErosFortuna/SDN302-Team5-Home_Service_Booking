const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const Notification = require('../src/modules/notifications/notification.model.js');
const {
  listMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  parsePagination,
} = require('../src/modules/notifications/notification.controller.js');
const { AppError } = require('../src/shared/app-error.js');

function mockResponse() {
  return {
    body: null,
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('notification routes require authentication', async () => {
  const app = require('../src/app.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/notifications`;

  try {
    for (const path of ['', '/unread-count', '/read-all', '/507f1f77bcf86cd799439011/read']) {
      const method = path === '/read-all' || path.endsWith('/read') ? 'PATCH' : 'GET';
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path} should require authentication`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('notification pagination rejects invalid or excessive limits', () => {
  assert.deepEqual(parsePagination({ page: '2', limit: '50' }), { page: 2, limit: 50 });
  assert.throws(() => parsePagination({ page: '0' }), (error) => error instanceof AppError && error.statusCode === 400);
  assert.throws(() => parsePagination({ limit: '101' }), (error) => error instanceof AppError && error.statusCode === 400);
});

test('listMyNotifications scopes results to the authenticated user and returns pagination', async () => {
  const userId = new mongoose.Types.ObjectId();
  const notificationId = new mongoose.Types.ObjectId();
  let listFilter;
  let countFilter;
  const originalFind = Notification.find;
  const originalCountDocuments = Notification.countDocuments;

  Notification.find = (filter) => {
    listFilter = filter;
    return {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      lean: async () => [{
        _id: notificationId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        message: 'Your booking is confirmed.',
        resourceType: 'BOOKING',
        resourceId: notificationId,
        readAt: null,
        createdAt: new Date('2026-11-01T10:00:00Z'),
      }],
    };
  };
  Notification.countDocuments = async (filter) => {
    countFilter = filter;
    return 1;
  };

  try {
    const res = mockResponse();
    await listMyNotifications({
      user: { _id: userId },
      query: { page: '1', limit: '20', recipient: new mongoose.Types.ObjectId().toString() },
    }, res);

    assert.deepEqual(listFilter, { recipient: userId });
    assert.deepEqual(countFilter, { recipient: userId });
    assert.equal(res.body.data[0].id, notificationId.toString());
    assert.deepEqual(res.body.pagination, {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  } finally {
    Notification.find = originalFind;
    Notification.countDocuments = originalCountDocuments;
  }
});

test('unread count and mark-all-read only use the authenticated recipient', async () => {
  const userId = new mongoose.Types.ObjectId();
  const originalCountDocuments = Notification.countDocuments;
  const originalUpdateMany = Notification.updateMany;
  const filters = [];
  Notification.countDocuments = async (filter) => {
    filters.push(filter);
    return 2;
  };
  Notification.updateMany = async (filter) => {
    filters.push(filter);
    return { modifiedCount: 2 };
  };

  try {
    const countResponse = mockResponse();
    await getUnreadCount({ user: { _id: userId } }, countResponse);
    assert.equal(countResponse.body.data.unreadCount, 2);

    const readResponse = mockResponse();
    await markAllNotificationsAsRead({ user: { _id: userId } }, readResponse);
    assert.equal(readResponse.body.data.modifiedCount, 2);
    assert.deepEqual(filters, [
      { recipient: userId, readAt: null },
      { recipient: userId, readAt: null },
    ]);
  } finally {
    Notification.countDocuments = originalCountDocuments;
    Notification.updateMany = originalUpdateMany;
  }
});

test('markNotificationAsRead does not expose a notification owned by another user', async () => {
  const originalFindOneAndUpdate = Notification.findOneAndUpdate;
  const originalFindOne = Notification.findOne;
  let updateFilter;
  let lookupFilter;
  Notification.findOneAndUpdate = (filter) => {
    updateFilter = filter;
    return { select: async () => null };
  };
  Notification.findOne = (filter) => {
    lookupFilter = filter;
    return { select: async () => null };
  };

  try {
    const userId = new mongoose.Types.ObjectId();
    const notificationId = new mongoose.Types.ObjectId();
    await assert.rejects(
      markNotificationAsRead({
        params: { notificationId: notificationId.toString() },
        user: { _id: userId },
      }, mockResponse()),
      (error) => error instanceof AppError && error.statusCode === 404,
    );
    assert.deepEqual(updateFilter, {
      _id: notificationId.toString(),
      recipient: userId,
      readAt: null,
    });
    assert.deepEqual(lookupFilter, {
      _id: notificationId.toString(),
      recipient: userId,
    });
  } finally {
    Notification.findOneAndUpdate = originalFindOneAndUpdate;
    Notification.findOne = originalFindOne;
  }
});
