<<<<<<< HEAD
import mongoose from 'mongoose';
import { baseOptions } from '../../shared/schema-options.js';

export const VERIFICATION_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED']);

const providerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessName: { type: String, trim: true, maxlength: 160 },
  bio: { type: String, trim: true, maxlength: 2000 },
  yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
  verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING', index: true },
  /** Skills of the provider — used by the incoming-request matching (UC-35). */
  serviceCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
  /** Districts / cities the provider works in (free text, e.g. "Quận 1", "TP.HCM"). */
  serviceAreas: [{ type: String, trim: true, maxlength: 100 }],
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  completedJobCount: { type: Number, min: 0, default: 0 },
  documents: [{ type: String, trim: true, maxlength: 2048 }],
  payoutInfo: { type: mongoose.Schema.Types.Mixed, select: false },
}, baseOptions);
=======
const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (coords) {
          if (!coords) return true;
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            typeof coords[0] === 'number' &&
            !isNaN(coords[0]) &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            typeof coords[1] === 'number' &&
            !isNaN(coords[1]) &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] with longitude in [-180, 180] and latitude in [-90, 90]',
      },
    },
  },
  { _id: false }
);
>>>>>>> development

const verificationLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_INFO', 'RESUBMIT'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 1000 },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['ADMIN', 'STAFF', 'PROVIDER'] },
    ip: { type: String, trim: true },
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
    fullName: { type: String, trim: true, maxlength: 120 },
    businessName: { type: String, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    bio: { type: String, trim: true, maxlength: 2000 },
    yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
    serviceCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    // UC-33: provider skills (also used by incoming-request matching, UC-35)
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    serviceAreas: [{ type: String, trim: true, maxlength: 100 }],
    city: { type: String, trim: true, maxlength: 100 },
    location: { type: pointSchema, default: undefined },
    documents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
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
    bookingLockVersion: { type: Number, default: 0 },
    userStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      default: 'INACTIVE',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  baseOptions
);

providerProfileSchema.index({ verificationStatus: 1, createdAt: -1 });
providerProfileSchema.index({ verificationStatus: 1, averageRating: -1 });
providerProfileSchema.index({ isDeleted: 1, verificationStatus: 1, averageRating: -1 });
providerProfileSchema.index({
  isDeleted: 1,
  userStatus: 1,
  verificationStatus: 1,
  averageRating: -1,
  completedJobCount: -1,
  _id: -1,
});
providerProfileSchema.index({
  skills: 1,
  isDeleted: 1,
  userStatus: 1,
  verificationStatus: 1,
  averageRating: -1,
  completedJobCount: -1,
  _id: -1,
});
providerProfileSchema.index({ fullName: 1 });
providerProfileSchema.index({ businessName: 1 });
providerProfileSchema.index({ serviceAreas: 1 });
<<<<<<< HEAD
providerProfileSchema.index({ serviceCategories: 1 });

export default mongoose.models.ProviderProfile || mongoose.model('ProviderProfile', providerProfileSchema);
=======
providerProfileSchema.index({ skills: 1 });
providerProfileSchema.index({ serviceCategories: 1 });
providerProfileSchema.index({ city: 1 });
providerProfileSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports =
  mongoose.models.ProviderProfile ||
  mongoose.model('ProviderProfile', providerProfileSchema);
>>>>>>> development
