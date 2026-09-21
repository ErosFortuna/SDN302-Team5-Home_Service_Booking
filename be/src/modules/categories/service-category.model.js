const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 500 },
  iconUrl: { type: String, trim: true, maxlength: 2048 },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0, min: 0 },
}, baseOptions);

serviceCategorySchema.index({ slug: 1 }, { unique: true });
serviceCategorySchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
