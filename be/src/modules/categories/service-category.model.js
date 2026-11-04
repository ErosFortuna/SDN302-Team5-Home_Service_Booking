const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const PRICING_MODES = Object.freeze(['FIXED']);
/** Icon keys understood by the web client (mapped to lucide icons). */
const CATEGORY_ICONS = Object.freeze([
  'wrench', 'droplets', 'zap', 'snowflake', 'sparkles', 'paintbrush', 'key', 'hammer',
  'plug', 'washing-machine', 'truck', 'leaf', 'bug', 'shield', 'home', 'tv',
]);

export const PRICING_MODES = Object.freeze(['FIXED', 'REQUEST_QUOTE']);
/** Icon keys understood by the web client (mapped to lucide icons). */
export const CATEGORY_ICONS = Object.freeze([
  'wrench', 'droplets', 'zap', 'snowflake', 'sparkles', 'paintbrush', 'key', 'hammer',
  'plug', 'washing-machine', 'truck', 'leaf', 'bug', 'shield', 'home', 'tv',
]);

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 500 },
<<<<<<< HEAD
  pricingMode: { type: String, enum: PRICING_MODES, default: 'REQUEST_QUOTE', index: true },
=======
  // UC-57/58: admin-managed pricing mode & icon
  pricingMode: { type: String, enum: PRICING_MODES, default: 'FIXED', index: true },
>>>>>>> development
  icon: { type: String, enum: CATEGORY_ICONS, default: 'wrench' },
  iconUrl: { type: String, trim: true, maxlength: 2048 },
  /** Soft-delete flag: inactive categories are hidden from providers and customers. */
  isActive: { type: Boolean, default: true, index: true },
  deactivatedAt: Date,
  sortOrder: { type: Number, default: 0, min: 0 },
}, baseOptions);

serviceCategorySchema.index({ slug: 1 }, { unique: true });
serviceCategorySchema.index({ isActive: 1, sortOrder: 1 });

<<<<<<< HEAD
/** "Điện lạnh & Máy giặt" → "dien-lanh-may-giat" */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default mongoose.models.ServiceCategory || mongoose.model('ServiceCategory', serviceCategorySchema);
=======
const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);

module.exports = ServiceCategory;
module.exports.PRICING_MODES = PRICING_MODES;
module.exports.CATEGORY_ICONS = CATEGORY_ICONS;
>>>>>>> development
