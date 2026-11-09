const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const POLICY_TYPES = Object.freeze([
  'PRIVACY_POLICY',
  'TERMS_OF_SERVICE',
  'PROVIDER_CONTRACT',
]);

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề chính sách là bắt buộc'],
      trim: true,
      minlength: [2, 'Tiêu đề tối thiểu 2 ký tự'],
      maxlength: [200, 'Tiêu đề tối đa 200 ký tự'],
    },
    type: {
      type: String,
      required: [true, 'Loại chính sách là bắt buộc'],
      enum: {
        values: POLICY_TYPES,
        message: 'Loại chính sách không hợp lệ',
      },
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung chính sách là bắt buộc'],
      minlength: [10, 'Nội dung tối thiểu 10 ký tự'],
      maxlength: [100000, 'Nội dung quá dài'],
    },
    version: {
      type: String,
      required: [true, 'Phiên bản chính sách là bắt buộc'],
      trim: true,
      match: [/^v?\d+(\.\d+)*$/i, 'Định dạng phiên bản không hợp lệ (ví dụ: v1.0, 2.1)'],
    },
    isMandatory: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [500, 'Tóm tắt tối đa 500 ký tự'],
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  baseOptions
);

// Unique version per policy type
policySchema.index({ type: 1, version: 1 }, { unique: true });
// Fast query for active policies by type
policySchema.index({ type: 1, isActive: 1 });

const userConsentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: POLICY_TYPES,
      index: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 45,
      default: 'Unknown',
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  baseOptions
);

// A user consents to a specific policy version once
userConsentSchema.index({ user: 1, policy: 1 }, { unique: true });
userConsentSchema.index({ user: 1, type: 1, acceptedAt: -1 });

userConsentSchema.virtual('userId').get(function () {
  return this.user;
});
userConsentSchema.virtual('policyId').get(function () {
  return this.policy;
});

const Policy = mongoose.models.Policy || mongoose.model('Policy', policySchema);
const UserConsent = mongoose.models.UserConsent || mongoose.model('UserConsent', userConsentSchema);

module.exports = {
  Policy,
  UserConsent,
  POLICY_TYPES,
};
