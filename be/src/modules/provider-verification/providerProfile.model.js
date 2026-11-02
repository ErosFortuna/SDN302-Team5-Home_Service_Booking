const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const documentSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      enum: ['ID_CARD', 'CERTIFICATE', 'BUSINESS_LICENSE', 'OTHER'],
      default: 'OTHER',
    },
    fileUrl: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true, versionKey: false }
);

const verificationLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_INFO', 'RESUBMIT'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'VERIFIED'],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 1000 },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true, versionKey: false }
);

const providerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: { type: String, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    bio: { type: String, trim: true, maxlength: 2000 },
    yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
    serviceCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    serviceAreas: [{ type: String, trim: true, maxlength: 100 }],
    documents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'VERIFIED'],
      default: 'PENDING',
      index: true,
    },
    additionalInfoRequested: { type: Boolean, default: false },
    adminReviewNote: { type: String, trim: true, maxlength: 1000 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationLogs: {
      type: [verificationLogSchema],
      default: [],
    },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    completedJobCount: { type: Number, min: 0, default: 0 },
    payoutInfo: { type: mongoose.Schema.Types.Mixed, select: false },
  },
  baseOptions
);

providerProfileSchema.index({ verificationStatus: 1, createdAt: -1 });
providerProfileSchema.index({ serviceAreas: 1 });
providerProfileSchema.index({ skills: 1 });
providerProfileSchema.index({ serviceCategories: 1 });

const ProviderProfile =
  mongoose.models.ProviderProfile ||
  mongoose.model('ProviderProfile', providerProfileSchema);

module.exports = ProviderProfile;

