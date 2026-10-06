import mongoose from 'mongoose';
import { baseOptions } from '../../shared/schema-options.js';
import Service from '../services/service.model.js';

/** Request lifecycle. Providers only see INCOMING ones (UC-35). */
export const REQUEST_STATUSES = Object.freeze(['REQUESTED', 'MATCHING', 'QUOTED', 'BOOKED', 'CANCELLED', 'EXPIRED']);
export const INCOMING_REQUEST_STATUSES = Object.freeze(['REQUESTED', 'MATCHING']);
export const URGENCY_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']);

/** GeoJSON Point — optional; `default: undefined` avoids an empty `coordinates: []` that breaks the 2dsphere index. */
const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true, default: 'Point' },
  coordinates: {
    type: [Number],
    default: undefined,
    required: true,
    validate: { validator: (v) => Array.isArray(v) && v.length === 2, message: 'coordinates must be [lng, lat]' },
  },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 80 },
  recipientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true, maxlength: 500 },
  ward: { type: String, trim: true, maxlength: 100 },
  district: { type: String, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  location: { type: pointSchema, default: undefined },
}, { _id: false });

/** Result of the AI photo/description analysis (optional). */
const aiAnalysisSchema = new mongoose.Schema({
  summary: { type: String, trim: true, maxlength: 1000 },
  suspectedIssue: { type: String, trim: true, maxlength: 300 },
  urgency: { type: String, enum: URGENCY_LEVELS },
  estimatedPriceMin: { type: Number, min: 0 },
  estimatedPriceMax: { type: Number, min: 0 },
  suggestedTools: [{ type: String, trim: true, maxlength: 120 }],
  recommendations: [{ type: String, trim: true, maxlength: 300 }],
  confidence: { type: Number, min: 0, max: 1 },
  analyzedAt: Date,
}, { _id: false });

const serviceRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  /** Denormalised from `service.category` so provider matching is a single indexed query. */
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  address: { type: addressSchema, required: true },
  preferredStartAt: { type: Date, required: true, index: true },
  preferredEndAt: { type: Date, required: true },
  budgetMin: { type: Number, min: 0 },
  budgetMax: { type: Number, min: 0 },
  status: { type: String, enum: REQUEST_STATUSES, default: 'REQUESTED', index: true },
  /** Photo URLs uploaded by the customer. */
  attachments: [{ type: String, trim: true, maxlength: 2048 }],
  aiAnalysis: { type: aiAnalysisSchema, default: undefined },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  expiresAt: { type: Date, index: true },
}, baseOptions);

serviceRequestSchema.pre('validate', async function validate() {
  // Keep `category` in sync with the chosen service.
  if (this.service && (!this.category || this.isModified('service'))) {
    const service = await Service.findById(this.service).select('category').lean();
    if (service) this.category = service.category;
  }
  if (this.preferredEndAt <= this.preferredStartAt) throw new Error('preferredEndAt must be after preferredStartAt');
  if (this.budgetMin != null && this.budgetMax != null && this.budgetMax < this.budgetMin) {
    throw new Error('budgetMax must be >= budgetMin');
  }
});

serviceRequestSchema.index({ customer: 1, createdAt: -1 });
serviceRequestSchema.index({ service: 1, status: 1, preferredStartAt: 1 });
// Main index for the provider inbox: category ∈ skills AND status ∈ incoming, newest first.
serviceRequestSchema.index({ category: 1, status: 1, createdAt: -1 });
serviceRequestSchema.index({ 'address.location': '2dsphere' }, { sparse: true });

export default mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);
