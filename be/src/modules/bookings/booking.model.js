const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  ACTIVE_BOOKING_STATUSES,
  DECLINE_REASON_VALUES,
} = require('./booking.status.js');

const { ObjectId } = mongoose.Schema.Types;

const statusHistorySchema = new mongoose.Schema({
  from: { type: String, enum: BOOKING_STATUS_VALUES, required: true },
  to: { type: String, enum: BOOKING_STATUS_VALUES, required: true },
  changedBy: { type: ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 500 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

const scheduleHistorySchema = new mongoose.Schema({
  fromStartAt: { type: Date, required: true },
  fromEndAt: { type: Date, required: true },
  toStartAt: { type: Date, required: true },
  toEndAt: { type: Date, required: true },
  changedBy: { type: ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 500 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

const bookingSchema = new mongoose.Schema({
  request: { type: ObjectId, ref: 'ServiceRequest', required: true, unique: true, index: true },

  customer: { type: ObjectId, ref: 'User', required: true, index: true },
  provider: { type: ObjectId, ref: 'User', required: true, index: true },
  service: { type: ObjectId, ref: 'Service', required: true, index: true },
  scheduledStartAt: { type: Date, required: true, index: true },
  scheduledEndAt: { type: Date, required: true },
  address: { type: mongoose.Schema.Types.Mixed, required: true },
  price: { type: Number, required: true, min: 0 },
  finalPrice: { type: Number, min: 0 },
  status: { type: String, enum: BOOKING_STATUS_VALUES, default: BOOKING_STATUS.PENDING_CONFIRMATION, index: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'COD'], default: 'UNPAID', index: true },
  // Cancellation details
  cancelledBy: { type: String, enum: ['PROVIDER', 'CUSTOMER', 'SYSTEM', 'STAFF', 'ADMIN'], index: true },
  cancelReason: { type: String, trim: true, maxlength: 500 },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  reasonCode: { type: String, enum: DECLINE_REASON_VALUES, index: true },
  cancelledAt: Date,
  completedAt: Date,
  statusHistory: { type: [statusHistorySchema], default: [] },
  scheduleHistory: { type: [scheduleHistorySchema], default: [] },
  startedAt: Date,
  completionNote: { type: String, trim: true, maxlength: 500 },
  progressPhotos: { type: [String], default: [] },
  proofPhotos: { type: [String], default: [] },
}, baseOptions);

bookingSchema.virtual('totalAmount').get(function totalAmount() {
  return this.finalPrice ?? this.price ?? 0;
});

bookingSchema.pre('validate', function validate(next) {
  if (this.scheduledEndAt <= this.scheduledStartAt) return next(new Error('scheduledEndAt must be after scheduledStartAt'));
  if (this.cancelReason && !this.cancellationReason) {
    this.cancellationReason = this.cancelReason;
  } else if (this.cancellationReason && !this.cancelReason) {
    this.cancelReason = this.cancellationReason;
  }
  next();
});

bookingSchema.index({ provider: 1, scheduledStartAt: 1, scheduledEndAt: 1, status: 1 });
bookingSchema.index({ customer: 1, scheduledStartAt: -1 });
bookingSchema.index({ status: 1, scheduledStartAt: 1 });
// Partial unique index (V-12): Prevent duplicate bookings starting at the exact same time
// for the same provider among active/effective bookings (excluding CANCELLED/DECLINED/EXPIRED).
bookingSchema.index(
  { provider: 1, scheduledStartAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [...ACTIVE_BOOKING_STATUSES],
      },
    },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
