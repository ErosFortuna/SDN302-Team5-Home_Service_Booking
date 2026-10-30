const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    method: {
      type: String,
      enum: ['VNPAY', 'MOMO', 'STRIPE', 'CASH', 'WALLET', 'BANK_TRANSFER'],
      default: 'VNPAY',
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'REFUND_PENDING', 'FAILED'],
      default: 'PAID',
      index: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    refundedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  baseOptions
);

paymentSchema.index({ status: 1, paidAt: -1 });
paymentSchema.index({ provider: 1, status: 1, paidAt: -1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = Payment;
