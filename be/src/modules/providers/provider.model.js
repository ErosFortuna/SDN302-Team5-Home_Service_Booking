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

providerProfileSchema.index({ verificationStatus: 1, averageRating: -1 });
providerProfileSchema.index({ serviceAreas: 1 });
providerProfileSchema.index({ serviceCategories: 1 });

export default mongoose.models.ProviderProfile || mongoose.model('ProviderProfile', providerProfileSchema);
