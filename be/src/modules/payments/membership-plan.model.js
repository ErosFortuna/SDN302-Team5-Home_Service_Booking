const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const membershipPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100, unique: true },
  monthlyPrice: { type: Number, required: true, min: 1000, max: 100000000, validate: Number.isInteger },
  benefits: [{ type: String, trim: true, maxlength: 200 }],
  isActive: { type: Boolean, default: true, index: true },
  version: { type: Number, default: 1, min: 1 },
}, baseOptions);

membershipPlanSchema.index({ isActive: 1, monthlyPrice: 1 });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
