const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required for Point location'],
      validate: {
        validator: function (coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            typeof coords[0] === 'number' &&
            !isNaN(coords[0]) &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            typeof coords[1] === 'number' &&
            !isNaN(coords[1]) &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] with longitude in [-180, 180] and latitude in [-90, 90]',
      },
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 80 },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true, maxlength: 500 },
    ward: { type: String, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    location: { type: pointSchema, default: undefined },
  },
  { _id: false }
);

// UC-35: optional AI analysis of the customer's photos/description
const aiAnalysisSchema = new mongoose.Schema(
  {
    summary: { type: String, trim: true, maxlength: 1000 },
    suspectedIssue: { type: String, trim: true, maxlength: 300 },
    urgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] },
    estimatedPriceMin: { type: Number, min: 0 },
    estimatedPriceMax: { type: Number, min: 0 },
    suggestedTools: [{ type: String, trim: true, maxlength: 120 }],
    recommendations: [{ type: String, trim: true, maxlength: 300 }],
    confidence: { type: Number, min: 0, max: 1 },
    analyzedAt: Date,
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', index: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    address: { type: addressSchema, required: true },
    preferredStartAt: { type: Date, required: true, index: true },
    preferredEndAt: { type: Date, required: true },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'EXPIRED'],
      default: 'OPEN',
      index: true,
    },
    attachments: [{ type: String, trim: true, maxlength: 2048 }],
    aiAnalysis: { type: aiAnalysisSchema, default: undefined },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date, index: true },
  },
  baseOptions
);

serviceRequestSchema.pre('validate', function validate(next) {
  if (this.preferredStartAt && this.preferredEndAt && this.preferredEndAt <= this.preferredStartAt) {
    return next(new Error('preferredEndAt must be after preferredStartAt'));
  }
  if (this.budgetMin != null && this.budgetMax != null && this.budgetMax < this.budgetMin) {
    return next(new Error('budgetMax must be >= budgetMin'));
  }
  next();
});

serviceRequestSchema.index({ customer: 1, createdAt: -1 });
serviceRequestSchema.index({ service: 1, status: 1, preferredStartAt: 1 });
serviceRequestSchema.index({ 'address.location': '2dsphere' }, { sparse: true });
serviceRequestSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
