const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

/**
 * V-11/V-21: Refresh-token session (token family) storage.
 *
 * Only a SHA-256 hash of the refresh token is stored. The raw token is returned
 * once to the client and never persisted. Each rotation creates a new document
 * in the same family; reusing an already-rotated token outside the short grace
 * window revokes the whole family.
 */
const authSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    generation: {
      type: Number,
      default: 0,
      min: 0,
    },
    familyExpiresAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    createdByIp: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  baseOptions,
);

// Expired sessions are removed automatically. TTL monitor granularity is ~60s,
// so application checks still enforce expiry defensively.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ user: 1, revokedAt: 1 });
authSessionSchema.index({ familyId: 1, revokedAt: 1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
