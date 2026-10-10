const { isObjectId, isVietnamesePhone } = require('../../shared/validators.js');

function validateCreateRequest(req, res, next) {
  const {
    service,
    description,
    address,
    preferredStartAt,
    preferredEndAt,
    budgetMin,
    budgetMax,
    attachments,
  } = req.body;

  // 1. Service validation
  if (!service) {
    return res.status(400).json({ success: false, message: 'Service is required' });
  }
  if (!isObjectId(service)) {
    return res.status(400).json({ success: false, message: 'Invalid service ID' });
  }

  // 2. Description validation
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ success: false, message: 'Description is required' });
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < 10 || trimmedDescription.length > 3000) {
    return res.status(400).json({
      success: false,
      message: 'Description must be between 10 and 3000 characters',
    });
  }

  // 3. Address validation
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    return res.status(400).json({ success: false, message: 'Address is required' });
  }

  if (!address.recipientName || typeof address.recipientName !== 'string' || !address.recipientName.trim()) {
    return res.status(400).json({ success: false, message: 'Recipient name is required' });
  }
  if (address.recipientName.trim().length > 120) {
    return res.status(400).json({ success: false, message: 'Recipient name cannot exceed 120 characters' });
  }

  if (!address.phone || typeof address.phone !== 'string' || !address.phone.trim()) {
    return res.status(400).json({ success: false, message: 'Phone is required' });
  }
  if (!isVietnamesePhone(address.phone.trim())) {
    return res.status(400).json({ success: false, message: 'Invalid Vietnamese phone number' });
  }

  if (!address.addressLine || typeof address.addressLine !== 'string' || !address.addressLine.trim()) {
    return res.status(400).json({ success: false, message: 'Address line is required' });
  }
  if (address.addressLine.trim().length > 500) {
    return res.status(400).json({ success: false, message: 'Address line cannot exceed 500 characters' });
  }

  if (!address.city || typeof address.city !== 'string' || !address.city.trim()) {
    return res.status(400).json({ success: false, message: 'City is required' });
  }
  if (address.city.trim().length > 100) {
    return res.status(400).json({ success: false, message: 'City cannot exceed 100 characters' });
  }

  // Location validation if provided
  if (address.location != null) {
    if (typeof address.location !== 'object' || Array.isArray(address.location)) {
      return res.status(400).json({ success: false, message: 'Invalid address location format' });
    }
    const coords = address.location.coordinates;
    if (coords != null) {
      if (
        !Array.isArray(coords) ||
        coords.length !== 2 ||
        typeof coords[0] !== 'number' ||
        isNaN(coords[0]) ||
        typeof coords[1] !== 'number' ||
        isNaN(coords[1]) ||
        coords[0] < -180 ||
        coords[0] > 180 ||
        coords[1] < -90 ||
        coords[1] > 90
      ) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates must be [longitude, latitude] with valid ranges (-180..180, -90..90)',
        });
      }
    }
  }

  // 4. Time range validation
  if (!preferredStartAt || !preferredEndAt) {
    return res.status(400).json({
      success: false,
      message: 'Both preferredStartAt and preferredEndAt are required',
    });
  }

  const startDate = new Date(preferredStartAt);
  const endDate = new Date(preferredEndAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid preferredStartAt or preferredEndAt date format',
    });
  }

  if (endDate.getTime() <= startDate.getTime()) {
    return res.status(400).json({
      success: false,
      message: 'preferredEndAt must be after preferredStartAt',
    });
  }

  // 5. Budget validation
  if (budgetMin != null) {
    const minVal = Number(budgetMin);
    if (isNaN(minVal) || minVal < 0) {
      return res.status(400).json({ success: false, message: 'Budget cannot be negative' });
    }
  }

  if (budgetMax != null) {
    const maxVal = Number(budgetMax);
    if (isNaN(maxVal) || maxVal < 0) {
      return res.status(400).json({ success: false, message: 'Budget cannot be negative' });
    }
  }

  if (budgetMin != null && budgetMax != null) {
    const minVal = Number(budgetMin);
    const maxVal = Number(budgetMax);
    if (maxVal < minVal) {
      return res.status(400).json({ success: false, message: 'budgetMax must be >= budgetMin' });
    }
  }

  // 6. Attachments validation
  if (attachments != null) {
    if (!Array.isArray(attachments)) {
      return res.status(400).json({ success: false, message: 'Attachments must be an array' });
    }
    for (const item of attachments) {
      if (typeof item !== 'string' || item.length > 2048) {
        return res.status(400).json({
          success: false,
          message: 'Each attachment must be a string up to 2048 characters',
        });
      }
    }
  }

  next();
}

module.exports = { validateCreateRequest };
