const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const quoteSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  estimatedDurationMinutes: { type: Number, required: true, min: 15, max: 1440 },
  proposedStartAt: { type: Date, required: true },
  proposedEndAt: { type: Date, required: true },
  message: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'], default: 'PENDING', index: true },
  expiresAt: Date,
}, baseOptions);

quoteSchema.pre('validate', function validate(next) {
  if (this.proposedEndAt <= this.proposedStartAt) return next(new Error('proposedEndAt must be after proposedStartAt'));
  next();
});

quoteSchema.index({ request: 1, provider: 1 }, { unique: true });
quoteSchema.index({ provider: 1, status: 1, proposedStartAt: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
