const mongoose = require("mongoose");
const { baseOptions } = require("../../shared/schema-options.js");

const NOTIFICATION_TYPES = Object.freeze([
  "BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_DECLINED",
  "BOOKING_STATUS_UPDATED",
]);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    resourceType: { type: String, enum: ["REQUEST", "BOOKING"] },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    readAt: { type: Date, default: null },
  },
  baseOptions,
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
Notification.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
