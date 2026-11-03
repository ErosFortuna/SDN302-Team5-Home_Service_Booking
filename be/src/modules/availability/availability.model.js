const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const availabilitySchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['WEEKLY', 'EXCEPTION'], required: true },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  date: { type: Date },
  startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  isAvailable: { type: Boolean, default: true },
  reason: { type: String, trim: true, maxlength: 300 },
}, baseOptions);

availabilitySchema.pre('validate', function validate(next) {
  if (this.type === 'WEEKLY' && this.dayOfWeek == null) return next(new Error('dayOfWeek is required for WEEKLY availability'));
  if (this.type === 'EXCEPTION' && !this.date) return next(new Error('date is required for EXCEPTION availability'));
  if (this.isAvailable && (!this.startTime || !this.endTime)) return next(new Error('startTime and endTime are required when available'));
  if (this.startTime && this.endTime && this.endTime <= this.startTime) return next(new Error('endTime must be after startTime'));
  next();
});

availabilitySchema.index({ provider: 1, type: 1, dayOfWeek: 1, date: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
