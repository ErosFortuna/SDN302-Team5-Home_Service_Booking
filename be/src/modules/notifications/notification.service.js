const Notification = require('./notification.model.js');

async function createNotification(notification) {
  return Notification.create(notification);
}

module.exports = { createNotification };
