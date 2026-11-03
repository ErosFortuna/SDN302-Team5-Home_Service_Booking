const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const bookingSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true, index: true },
  quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  scheduledStartAt: { type: Date, required: true, index: true },
  scheduledEndAt: { type: Date, required: true },
  address: { type: mongoose.Schema.Types.Mixed, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], default: 'PENDING_CONFIRMATION', index: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'COD'], default: 'UNPAID', index: true },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  completedAt: Date,
}, baseOptions);

bookingSchema.pre('validate', function validate(next) {
  if (this.scheduledEndAt <= this.scheduledStartAt) return next(new Error('scheduledEndAt must be after scheduledStartAt'));
  next();
});

bookingSchema.index({ provider: 1, scheduledStartAt: 1, scheduledEndAt: 1, status: 1 });
bookingSchema.index({ customer: 1, scheduledStartAt: -1 });
bookingSchema.index({ status: 1, scheduledStartAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
