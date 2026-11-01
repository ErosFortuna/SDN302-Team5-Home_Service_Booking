const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const membershipPaymentSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderSubscription', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
  planVersion: { type: Number, required: true },
  planNameSnapshot: { type: String, required: true, trim: true, maxlength: 100 },
  amount: { type: Number, required: true, min: 1000, validate: Number.isInteger },
  currency: { type: String, enum: ['VND'], default: 'VND' },
  orderCode: { type: Number, required: true, unique: true, min: 1, validate: Number.isInteger },
  paymentLinkId: { type: String, trim: true, sparse: true, unique: true },
  checkoutUrl: { type: String, trim: true, maxlength: 2048 },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED'],
    default: 'PENDING',
    index: true,
  },
  providerReference: { type: String, trim: true, maxlength: 120 },
  paidAt: Date,
  expiresAt: { type: Date, required: true, index: true },
  appliedAt: Date,
}, baseOptions);

membershipPaymentSchema.index({ provider: 1, createdAt: -1 });
membershipPaymentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('MembershipPayment', membershipPaymentSchema);
