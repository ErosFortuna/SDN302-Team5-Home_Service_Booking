const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options.js');

const priceRangeSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: true,
      min: 0,
    },
    max: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const possibilitySchema = new mongoose.Schema(
  {
    cause: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    estimatedPrice: {
      type: priceRangeSchema,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
);

const aiEstimateAuditSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    serviceCategoryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    possibilities: [possibilitySchema],
    suggestedQuestions: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],
    recommendations: [
      {
        type: String,
        trim: true,
        maxlength: 500,
      },
    ],
    disclaimer: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    overallEstimate: {
      type: priceRangeSchema,
      required: false,
    },
    modelUsed: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    tokensUsed: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 45,
    },
  },
  baseOptions
);

aiEstimateAuditSchema.index({ createdAt: -1 });

const AiEstimateAudit =
  mongoose.models.AiEstimateAudit ||
  mongoose.model('AiEstimateAudit', aiEstimateAuditSchema);

module.exports = {
  AiEstimateAudit,
};
