const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

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

const providerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessName: { type: String, trim: true, maxlength: 160 },
  bio: { type: String, trim: true, maxlength: 2000 },
  yearsOfExperience: { type: Number, min: 0, max: 80, default: 0 },
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING', index: true },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  completedJobCount: { type: Number, min: 0, default: 0 },
  // UC-33: provider skills (also used by incoming-request matching, UC-35)
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
  serviceAreas: [{ type: String, trim: true, maxlength: 100 }],
  city: { type: String, trim: true, maxlength: 100 },
  location: { type: pointSchema, default: undefined },
  documents: [{ type: String, trim: true, maxlength: 2048 }],
  payoutInfo: { type: mongoose.Schema.Types.Mixed, select: false },
}, baseOptions);

providerProfileSchema.index({ verificationStatus: 1, averageRating: -1 });
providerProfileSchema.index({ serviceAreas: 1 });
providerProfileSchema.index({ skills: 1 });
providerProfileSchema.index({ city: 1 });
providerProfileSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
