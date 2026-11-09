const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const providerSubscriptionSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan' },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  lastPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPayment' },
}, baseOptions);

providerSubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

module.exports = mongoose.model('ProviderSubscription', providerSubscriptionSchema);
