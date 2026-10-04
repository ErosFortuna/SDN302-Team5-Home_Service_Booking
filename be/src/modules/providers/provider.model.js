const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const providerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessName: { type: String, trim: true, maxlength: 160 },
  bio: { type: String, trim: true, maxlength: 2000 },
  yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING', index: true },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  completedJobCount: { type: Number, min: 0, default: 0 },
  serviceAreas: [{ type: String, trim: true, maxlength: 100 }],
  documents: [{ type: String, trim: true, maxlength: 2048 }],
  payoutInfo: { type: mongoose.Schema.Types.Mixed, select: false },
}, baseOptions);

providerProfileSchema.index({ verificationStatus: 1, averageRating: -1 });
providerProfileSchema.index({ serviceAreas: 1 });

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
