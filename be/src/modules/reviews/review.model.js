const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  comment: { type: String, trim: true, maxlength: 2000 },
  response: { type: String, trim: true, maxlength: 2000 },
  isVisible: { type: Boolean, default: true, index: true },
}, baseOptions);

reviewSchema.index({ provider: 1, isVisible: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
