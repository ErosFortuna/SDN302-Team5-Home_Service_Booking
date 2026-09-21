const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const serviceSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 3000 },
  basePrice: { type: Number, required: true, min: 0 },
  estimatedDurationMinutes: { type: Number, required: true, min: 15, max: 1440 },
  pricingType: { type: String, enum: ['FIXED', 'FROM', 'QUOTE_REQUIRED'], default: 'QUOTE_REQUIRED' },
  requirements: [{ type: String, trim: true, maxlength: 300 }],
  isActive: { type: Boolean, default: true, index: true },
}, baseOptions);

serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
