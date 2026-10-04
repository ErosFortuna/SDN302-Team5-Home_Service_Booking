const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const complaintSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  against: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['QUALITY', 'LATE_ARRIVAL', 'NO_SHOW', 'PRICE', 'BEHAVIOR', 'DAMAGE', 'OTHER'], required: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
  evidenceUrls: [{ type: String, trim: true, maxlength: 2048 }],
  status: { type: String, enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED'], default: 'OPEN', index: true },
  resolutionNote: { type: String, trim: true, maxlength: 2000 },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, baseOptions);

complaintSchema.index({ reporter: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
