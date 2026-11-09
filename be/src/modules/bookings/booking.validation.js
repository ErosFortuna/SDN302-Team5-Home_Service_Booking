const { AppError } = require('../../shared/app-error.js');
const { isAllowedMediaUrl, isObjectId } = require('../../shared/validators.js');
const { BOOKING_STATUS, BOOKING_STATUS_VALUES, DECLINE_REASON } = require('./booking.status.js');

const PROVIDER_DECLINE_REASONS = Object.freeze([
  DECLINE_REASON.BUSY,
  DECLINE_REASON.TOO_FAR,
  DECLINE_REASON.OUT_OF_SKILL,
  DECLINE_REASON.PRICE_ISSUE,
  DECLINE_REASON.OTHER,
]);

const isOptionalString = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.trim().length <= max);
const trimOrUndefined = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function fail(errors) {
  if (errors.length) throw new AppError(400, 'Validation failed', errors);
}

/**
 * PATCH /bookings/:id/confirm
 * Provider confirms a pending booking request.
 * Enforces clean body to prevent mass-assignment attacks (NFR-06).
 */
function validateConfirmBooking(req, res, next) {
  const body = req.body || {};
  const forbidden = ['status', 'provider', 'customer', 'price', 'scheduledStartAt', 'scheduledEndAt'];
  const errors = [];

  for (const key of forbidden) {
    if (body[key] !== undefined) {
      errors.push({ field: key, message: `Field '${key}' cannot be modified through this endpoint` });
    }
  }
  fail(errors);

  req.body = {};
  next();
}

/**
 * PATCH /bookings/:id/decline
 * body: { reasonCode: 'BUSY' | 'TOO_FAR' | 'OUT_OF_SKILL' | 'PRICE_ISSUE' | 'OTHER', note? }
 * (note required with at least 5 chars when reasonCode = 'OTHER', max 500 chars).
 */
function validateDeclineBooking(req, res, next) {
  const { reasonCode, note, ...extraFields } = req.body || {};
  const errors = [];

  if (!PROVIDER_DECLINE_REASONS.includes(reasonCode)) {
    errors.push({
      field: 'reasonCode',
      message: `reasonCode must be one of: ${PROVIDER_DECLINE_REASONS.join(', ')}`,
    });
  }

  const trimmedNote = trimOrUndefined(note);

  if (reasonCode === DECLINE_REASON.OTHER) {
    if (!trimmedNote || trimmedNote.length < 5) {
      errors.push({
        field: 'note',
        message: 'note is required and must be at least 5 characters when reasonCode is OTHER',
      });
    } else if (trimmedNote.length > 500) {
      errors.push({
        field: 'note',
        message: 'note cannot exceed 500 characters',
      });
    }
  } else if (note !== undefined && note !== null) {
    if (typeof note !== 'string' || trimmedNote.length > 500) {
      errors.push({
        field: 'note',
        message: 'note must be a string of at most 500 characters',
      });
    }
  }

  // Prevent mass-assignment / extra field injection (NFR-06)
  const extraKeys = Object.keys(extraFields);
  if (extraKeys.length > 0) {
    for (const key of extraKeys) {
      errors.push({ field: key, message: `Unrecognized field '${key}' is not allowed` });
    }
  }

  fail(errors);

  req.body = {
    reasonCode,
    note: trimmedNote,
  };
  next();
}

/** PATCH /bookings/:id/status  body: { status, note?, confirmCompletion?, photos?, progressPhotos?, proofPhotos?, finalPrice? } */
function validateStatusUpdate(req, res, next) {
  const { status, note, confirmCompletion, photos, progressPhotos, proofPhotos, finalPrice } = req.body || {};
  const errors = [];

  if (!BOOKING_STATUS_VALUES.includes(status)) {
    errors.push({ field: 'status', message: `status must be one of: ${BOOKING_STATUS_VALUES.join(', ')}` });
  }
  if (!isOptionalString(note, 500)) {
    errors.push({ field: 'note', message: 'note must be a string of at most 500 characters' });
  }
  if (confirmCompletion !== undefined && typeof confirmCompletion !== 'boolean') {
    errors.push({ field: 'confirmCompletion', message: 'confirmCompletion must be a boolean' });
  }
  if (finalPrice !== undefined) {
    if (!Number.isSafeInteger(finalPrice) || finalPrice < 0) {
      errors.push({ field: 'finalPrice', message: 'finalPrice must be a non-negative integer' });
    } else if (status !== BOOKING_STATUS.COMPLETED) {
      errors.push({ field: 'finalPrice', message: 'finalPrice can only be provided when completing a booking' });
    }
  }

  if (photos !== undefined) {
    if (!Array.isArray(photos) || photos.some((p) => typeof p !== 'string' || !isAllowedMediaUrl(p))) {
      errors.push({ field: 'photos', message: 'photos must be an array of allowed image URLs (Cloudinary HTTPS or dev data URI)' });
    }
  }
  if (progressPhotos !== undefined) {
    if (!Array.isArray(progressPhotos) || progressPhotos.some((p) => typeof p !== 'string' || !isAllowedMediaUrl(p))) {
      errors.push({ field: 'progressPhotos', message: 'progressPhotos must be an array of allowed image URLs (Cloudinary HTTPS or dev data URI)' });
    }
  }
  if (proofPhotos !== undefined) {
    if (!Array.isArray(proofPhotos) || proofPhotos.some((p) => typeof p !== 'string' || !isAllowedMediaUrl(p))) {
      errors.push({ field: 'proofPhotos', message: 'proofPhotos must be an array of allowed image URLs (Cloudinary HTTPS or dev data URI)' });
    }
  }

  const photoList = Array.isArray(photos)
    ? photos
    : Array.isArray(progressPhotos)
      ? progressPhotos
      : Array.isArray(proofPhotos)
        ? proofPhotos
        : undefined;

  fail(errors);

  req.body = {
    status,
    note: trimOrUndefined(note),
    confirmCompletion,
    photos: photoList,
    ...(finalPrice !== undefined ? { finalPrice } : {}),
  };
  next();
}

/** PATCH /bookings/:id/reschedule body: { scheduledStartAt, note? } */
function validateCustomerReschedule(req, res, next) {
  const { scheduledStartAt, note, ...extraFields } = req.body || {};
  const errors = [];
  const start = new Date(scheduledStartAt);

  if (typeof scheduledStartAt !== 'string' || !Number.isFinite(start.getTime())) {
    errors.push({ field: 'scheduledStartAt', message: 'scheduledStartAt must be a valid date string' });
  }
  if (!isOptionalString(note, 500)) {
    errors.push({ field: 'note', message: 'note must be a string of at most 500 characters' });
  }
  for (const key of Object.keys(extraFields)) {
    errors.push({ field: key, message: `Unrecognized field '${key}' is not allowed` });
  }
  fail(errors);

  req.body = { scheduledStartAt: start, note: trimOrUndefined(note) };
  next();
}

/** POST /bookings/:id/cancel body: { reason } */
function validateCustomerCancellation(req, res, next) {
  const { reason, ...extraFields } = req.body || {};
  const trimmedReason = trimOrUndefined(reason);
  const errors = [];

  if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 500) {
    errors.push({ field: 'reason', message: 'reason is required and must be between 3 and 500 characters' });
  }
  for (const key of Object.keys(extraFields)) {
    errors.push({ field: key, message: `Unrecognized field '${key}' is not allowed` });
  }
  fail(errors);

  req.body = { reason: trimmedReason };
  next();
}

const PAYMENT_STATUS_VALUES = Object.freeze(['UNPAID', 'PENDING', 'PAID', 'COD']);

/** PATCH /bookings/:id/adjust (STAFF / ADMIN only) body: { finalPrice?, paymentStatus?, note? } */
function validateBookingAdjustment(req, res, next) {
  const { finalPrice, paymentStatus, note, ...extraFields } = req.body || {};
  const errors = [];

  const extraKeys = Object.keys(extraFields);
  if (extraKeys.length > 0) {
    errors.push({ field: extraKeys[0], message: `Unrecognized field: ${extraKeys[0]}` });
  }

  if (finalPrice === undefined && paymentStatus === undefined) {
    errors.push({ field: 'body', message: 'At least one of finalPrice or paymentStatus must be provided' });
  }

  if (finalPrice !== undefined) {
    if (!Number.isSafeInteger(finalPrice) || finalPrice < 0) {
      errors.push({ field: 'finalPrice', message: 'finalPrice must be a non-negative integer' });
    }
  }

  if (paymentStatus !== undefined) {
    if (!PAYMENT_STATUS_VALUES.includes(paymentStatus)) {
      errors.push({
        field: 'paymentStatus',
        message: `paymentStatus must be one of: ${PAYMENT_STATUS_VALUES.join(', ')}`,
      });
    }
  }

  if (!isOptionalString(note, 500)) {
    errors.push({ field: 'note', message: 'note must be a string of at most 500 characters' });
  }

  fail(errors);

  req.body = {
    ...(finalPrice !== undefined ? { finalPrice } : {}),
    ...(paymentStatus !== undefined ? { paymentStatus } : {}),
    note: trimOrUndefined(note),
  };
  next();
}

/** POST /bookings/:id/confirm-payment (CUSTOMER) body: { note? } */
function validateConfirmPayment(req, res, next) {
  const { note, ...extraFields } = req.body || {};
  const errors = [];

  const extraKeys = Object.keys(extraFields);
  if (extraKeys.length > 0) {
    errors.push({ field: extraKeys[0], message: `Unrecognized field: ${extraKeys[0]}` });
  }

  if (!isOptionalString(note, 500)) {
    errors.push({ field: 'note', message: 'note must be a string of at most 500 characters' });
  }

  fail(errors);

  req.body = {
    note: trimOrUndefined(note),
  };
  next();
}

function validateSelectProvider(req, res, next) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const errors = [];
  const allowed = new Set(['providerId', 'scheduledStartAt']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) errors.push({ field: key, message: `Unrecognized field: ${key}` });
  }
  if (!isObjectId(req.params?.requestId)) errors.push({ field: 'requestId', message: 'requestId must be a valid id' });
  if (!isObjectId(body.providerId)) errors.push({ field: 'providerId', message: 'providerId must be a valid id' });
  if (body.scheduledStartAt !== undefined && body.scheduledStartAt !== null &&
      (typeof body.scheduledStartAt !== 'string' || Number.isNaN(new Date(body.scheduledStartAt).getTime()))) {
    errors.push({ field: 'scheduledStartAt', message: 'scheduledStartAt must be a valid date string' });
  }
  fail(errors);
  req.body = {
    providerId: body.providerId,
    ...(body.scheduledStartAt !== undefined ? { scheduledStartAt: body.scheduledStartAt } : {}),
  };
  next();
}

module.exports = {
  PROVIDER_DECLINE_REASONS,
  PAYMENT_STATUS_VALUES,
  validateConfirmBooking,
  validateDeclineBooking,
  validateStatusUpdate,
  validateCustomerReschedule,
  validateCustomerCancellation,
  validateBookingAdjustment,
  validateConfirmPayment,
  validateSelectProvider,
};
