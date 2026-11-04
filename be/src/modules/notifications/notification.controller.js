const mongoose = require('mongoose');
const Notification = require('./notification.model.js');
const { AppError } = require('../../shared/app-error.js');

const MAX_PAGE_SIZE = 100;

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'page must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new AppError(400, `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }

  return { page, limit };
}

async function listMyNotifications(req, res) {
  const { page, limit } = parsePagination(req.query);
  const filter = { recipient: req.user._id };
  const [notifications, totalItems] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  return res.json({
    success: true,
    data: notifications.map((notification) => ({
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      ...(notification.resourceType && { resourceType: notification.resourceType }),
      ...(notification.resourceId && { resourceId: notification.resourceId.toString() }),
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    },
  });
}

async function getUnreadCount(req, res) {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    readAt: null,
  });
  return res.json({ success: true, data: { unreadCount } });
}

async function markNotificationAsRead(req, res) {
  const { notificationId } = req.params;
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError(400, 'notificationId must be a valid id');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true, runValidators: true },
  ).select('_id readAt');

  if (notification) {
    return res.json({
      success: true,
      message: 'Notification marked as read',
      data: { id: notification._id.toString(), readAt: notification.readAt },
    });
  }

  const existing = await Notification.findOne({
    _id: notificationId,
    recipient: req.user._id,
  }).select('_id readAt');
  if (!existing) throw new AppError(404, 'Notification not found');

  return res.json({
    success: true,
    message: 'Notification already read',
    data: { id: existing._id.toString(), readAt: existing.readAt },
  });
}

async function markAllNotificationsAsRead(req, res) {
  const result = await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return res.json({
    success: true,
    message: 'Notifications marked as read',
    data: { modifiedCount: result.modifiedCount },
  });
}

module.exports = {
  listMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  parsePagination,
};
