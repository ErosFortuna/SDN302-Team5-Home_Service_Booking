const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  MATERIAL_APPROVAL,
  MATERIAL_APPROVAL_VALUES,
  sumMaterials,
} = require('./booking.status.js');

const { ObjectId } = mongoose.Schema.Types;

// UC-38: extra material / fee recorded by the provider while IN_PROGRESS.
// Every item starts as PENDING and must be approved by the customer before it counts into `additionalFees`.
const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  quantity: { type: Number, required: true, min: 1, max: 1000 },
  price: { type: Number, required: true, min: 0, max: 100000000 }, // unit price (VND)
  note: { type: String, trim: true, maxlength: 300 },
  approvalStatus: { type: String, enum: MATERIAL_APPROVAL_VALUES, default: MATERIAL_APPROVAL.PENDING },
  addedBy: { type: ObjectId, ref: 'User', required: true },
  decidedAt: Date,
}, { ...baseOptions, timestamps: { createdAt: true, updatedAt: false } });

materialSchema.virtual('lineTotal').get(function lineTotal() {
  return this.quantity * this.price;
});

const statusHistorySchema = new mongoose.Schema({
  from: { type: String, enum: BOOKING_STATUS_VALUES, required: true },
  to: { type: String, enum: BOOKING_STATUS_VALUES, required: true },
  changedBy: { type: ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 500 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

const bookingSchema = new mongoose.Schema({
  request: { type: ObjectId, ref: 'ServiceRequest', required: true, unique: true, index: true },
  quote: { type: ObjectId, ref: 'Quote', required: true, unique: true },
  customer: { type: ObjectId, ref: 'User', required: true, index: true },
  provider: { type: ObjectId, ref: 'User', required: true, index: true },
  service: { type: ObjectId, ref: 'Service', required: true, index: true },
  scheduledStartAt: { type: Date, required: true, index: true },
  scheduledEndAt: { type: Date, required: true },
  address: { type: mongoose.Schema.Types.Mixed, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: BOOKING_STATUS_VALUES, default: BOOKING_STATUS.PENDING_CONFIRMATION, index: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'COD'], default: 'UNPAID', index: true },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  completedAt: Date,
  // UC-38: progress tracking & extra costs
  materials: { type: [materialSchema], default: [] },
  additionalFees: { type: Number, min: 0, default: 0 }, // cached sum of APPROVED materials
  statusHistory: { type: [statusHistorySchema], default: [] },
  startedAt: Date,
  completionNote: { type: String, trim: true, maxlength: 500 },
}, baseOptions);

bookingSchema.virtual('pendingFees').get(function pendingFees() {
  return sumMaterials(this.materials, MATERIAL_APPROVAL.PENDING);
});

bookingSchema.virtual('totalAmount').get(function totalAmount() {
  return (this.price || 0) + (this.additionalFees || 0);
});

bookingSchema.pre('validate', function validate(next) {
  if (this.scheduledEndAt <= this.scheduledStartAt) return next(new Error('scheduledEndAt must be after scheduledStartAt'));
  this.additionalFees = sumMaterials(this.materials, MATERIAL_APPROVAL.APPROVED);
  next();
});

bookingSchema.index({ provider: 1, scheduledStartAt: 1, scheduledEndAt: 1, status: 1 });
bookingSchema.index({ customer: 1, scheduledStartAt: -1 });
bookingSchema.index({ status: 1, scheduledStartAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
