const { isObjectId, isVietnamesePhone } = require('../../shared/validators.js');

const UPDATE_FIELDS = new Set([
  'description',
  'address',
  'preferredStartAt',
  'preferredEndAt',
  'budgetMin',
  'budgetMax',
  'attachments',
]);
const ADDRESS_FIELDS = new Set([
  'label',
  'recipientName',
  'phone',
  'addressLine',
  'ward',
  'district',
  'city',
  'country',
  'location',
]);

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

function validateUpdateRequest(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'Request body must be an object' });
  }

  const fields = Object.keys(body);
  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one editable field is required' });
  }
  if (fields.some((field) => !UPDATE_FIELDS.has(field))) {
    return res.status(400).json({ success: false, message: 'Request contains unsupported fields' });
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length < 10 || body.description.trim().length > 3000) {
      return res.status(400).json({ success: false, message: 'Description must be between 10 and 3000 characters' });
    }
  }

  if (body.address !== undefined) {
    if (!body.address || typeof body.address !== 'object' || Array.isArray(body.address)) {
      return res.status(400).json({ success: false, message: 'Address must be an object' });
    }
    const addressFields = Object.keys(body.address);
    if (addressFields.some((field) => !ADDRESS_FIELDS.has(field))) {
      return res.status(400).json({ success: false, message: 'Address contains unsupported fields' });
    }
    for (const field of ['recipientName', 'phone', 'addressLine', 'city']) {
      if (body.address[field] !== undefined && (typeof body.address[field] !== 'string' || !body.address[field].trim())) {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }
    if (body.address.phone !== undefined && !isVietnamesePhone(body.address.phone.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid Vietnamese phone number' });
    }
    if (body.address.location !== undefined) {
      const coords = body.address.location?.coordinates;
      if (
        !body.address.location || typeof body.address.location !== 'object' || Array.isArray(body.address.location) ||
        (coords !== undefined && (
          !Array.isArray(coords) || coords.length !== 2 ||
          typeof coords[0] !== 'number' || !Number.isFinite(coords[0]) || coords[0] < -180 || coords[0] > 180 ||
          typeof coords[1] !== 'number' || !Number.isFinite(coords[1]) || coords[1] < -90 || coords[1] > 90
        ))
      ) {
        return res.status(400).json({ success: false, message: 'Invalid address location' });
      }
    }
  }

  for (const field of ['preferredStartAt', 'preferredEndAt']) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !Number.isFinite(new Date(body[field]).getTime()))) {
      return res.status(400).json({ success: false, message: `${field} must be a valid date` });
    }
  }
  if (body.preferredStartAt !== undefined && body.preferredEndAt !== undefined &&
      new Date(body.preferredEndAt) <= new Date(body.preferredStartAt)) {
    return res.status(400).json({ success: false, message: 'preferredEndAt must be after preferredStartAt' });
  }

  for (const field of ['budgetMin', 'budgetMax']) {
    if (body[field] !== undefined && body[field] !== null &&
        (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0)) {
      return res.status(400).json({ success: false, message: `${field} must be a non-negative number` });
    }
  }
  if (body.budgetMin != null && body.budgetMax != null && body.budgetMax < body.budgetMin) {
    return res.status(400).json({ success: false, message: 'budgetMax must be >= budgetMin' });
  }

  if (body.attachments !== undefined && (!Array.isArray(body.attachments) ||
      body.attachments.some((item) => typeof item !== 'string' || item.length > 2048))) {
    return res.status(400).json({ success: false, message: 'Attachments must be an array of strings up to 2048 characters' });
  }

  next();
}

function validateCancelRequest(req, res, next) {
  const { reason } = req.body ?? {};
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    return res.status(400).json({ success: false, message: 'Cancellation reason is required and must not exceed 500 characters' });
  }
  next();
}

module.exports = { validateCreateRequest, validateUpdateRequest, validateCancelRequest };
