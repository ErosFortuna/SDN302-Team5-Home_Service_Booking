const { Router } = require('express');
const { protect } = require('../../middlewares/auth.middleware.js');
const {
  listMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('./notification.controller.js');

const router = Router();

router.use(protect);
router.get('/', listMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:notificationId/read', markNotificationAsRead);

module.exports = router;
