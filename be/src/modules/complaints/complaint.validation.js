const { isObjectId } = require('../../shared/validators.js');

const COMPLAINT_CATEGORIES = new Set([
  'QUALITY',
  'LATE_ARRIVAL',
  'NO_SHOW',
  'PRICE',
  'BEHAVIOR',
  'DAMAGE',
  'OTHER',
]);

const RESOLUTION_STATUSES = new Set(['RESOLVED', 'REJECTED']);

function validateCreateComplaint(req, res, next) {
  const rawBooking = req.body.booking || req.body.bookingId;
  const { category, title, description, evidenceUrls } = req.body;

  // 1. Booking validation (supports both booking and bookingId)
  if (!rawBooking) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }
  if (!isObjectId(rawBooking)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
  }
  req.body.booking = rawBooking;

  // 2. Category validation
  if (!category || typeof category !== 'string' || !COMPLAINT_CATEGORIES.has(category.trim().toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${Array.from(COMPLAINT_CATEGORIES).join(', ')}`,
    });
  }

  // 3. Title validation (optional)
  if (title != null) {
    if (typeof title !== 'string' || title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be a string up to 200 characters',
      });
    }
  }

  // 4. Description validation (min 10, max 4000)
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ success: false, message: 'Description is required' });
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 10 || trimmedDescription.length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'Description must be between 10 and 4000 characters',
    });
  }

  // 5. Evidence URLs validation (optional, max 5 URLs)
  if (evidenceUrls != null) {
    if (!Array.isArray(evidenceUrls)) {
      return res.status(400).json({ success: false, message: 'Evidence URLs must be an array' });
    }
    if (evidenceUrls.length > 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 evidence URLs allowed' });
    }
    for (const url of evidenceUrls) {
      if (typeof url !== 'string' || url.length > 2048) {
        return res.status(400).json({
          success: false,
          message: 'Each evidence URL must be a valid string up to 2048 characters',
        });
      }
    }
  }

  next();
}

function validateResolveComplaint(req, res, next) {
  const { resolutionNote, status, refundAmount } = req.body;

  if (!resolutionNote || typeof resolutionNote !== 'string' || resolutionNote.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Resolution note is required and must be at least 5 characters',
    });
  }
  if (resolutionNote.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Resolution note cannot exceed 2000 characters',
    });
  }

  if (status != null) {
    const upperStatus = status.trim().toUpperCase();
    if (!RESOLUTION_STATUSES.has(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${Array.from(RESOLUTION_STATUSES).join(', ')}`,
      });
    }
  }

  if (refundAmount != null) {
    const num = Number(refundAmount);
    if (isNaN(num) || num < 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be a positive number',
      });
    }
  }

  next();
}

function validateReplyComplaint(req, res, next) {
  const { message, evidenceUrls } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Reply message is required',
    });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Reply message cannot exceed 2000 characters',
    });
  }

  if (evidenceUrls != null) {
    if (!Array.isArray(evidenceUrls)) {
      return res.status(400).json({ success: false, message: 'Evidence URLs must be an array' });
    }
    if (evidenceUrls.length > 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 evidence URLs allowed' });
    }
    for (const url of evidenceUrls) {
      if (typeof url !== 'string' || url.length > 2048) {
        return res.status(400).json({
          success: false,
          message: 'Each evidence URL must be a valid string up to 2048 characters',
        });
      }
    }
  }

  next();
}

module.exports = {
  validateCreateComplaint,
  validateResolveComplaint,
  validateReplyComplaint,
};
