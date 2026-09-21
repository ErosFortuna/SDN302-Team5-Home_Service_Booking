const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 80 },
  recipientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true, maxlength: 500 },
  ward: { type: String, trim: true, maxlength: 100 },
  district: { type: String, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number] } },
}, { _id: false });

const serviceRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  address: { type: addressSchema, required: true },
  preferredStartAt: { type: Date, required: true, index: true },
  preferredEndAt: { type: Date, required: true },
  budgetMin: { type: Number, min: 0 },
  budgetMax: { type: Number, min: 0 },
  status: { type: String, enum: ['OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'EXPIRED'], default: 'OPEN', index: true },
  attachments: [{ type: String, trim: true, maxlength: 2048 }],
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  expiresAt: { type: Date, index: true },
}, baseOptions);

serviceRequestSchema.pre('validate', function validate(next) {
  if (this.preferredEndAt <= this.preferredStartAt) return next(new Error('preferredEndAt must be after preferredStartAt'));
  if (this.budgetMin != null && this.budgetMax != null && this.budgetMax < this.budgetMin) return next(new Error('budgetMax must be >= budgetMin'));
  next();
});

serviceRequestSchema.index({ customer: 1, createdAt: -1 });
serviceRequestSchema.index({ service: 1, status: 1, preferredStartAt: 1 });
serviceRequestSchema.index({ 'address.location': '2dsphere' });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
