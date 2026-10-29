const { AppError } = require('../../shared/app-error.js');
const { BOOKING_STATUS_VALUES, MATERIAL_APPROVAL, DECLINE_REASON } = require('./booking.status.js');

const MAX_ITEMS_PER_REQUEST = 20;
const MAX_UNIT_PRICE = 100000000;

const PROVIDER_DECLINE_REASONS = Object.freeze([
  DECLINE_REASON.BUSY,
  DECLINE_REASON.TOO_FAR,
  DECLINE_REASON.OUT_OF_SKILL,
  DECLINE_REASON.PRICE_ISSUE,
  DECLINE_REASON.OTHER,
]);

const isNonEmptyString = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
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

/** PATCH /bookings/:id/status  body: { status, note?, confirmCompletion? } */
function validateStatusUpdate(req, res, next) {
  const { status, note, confirmCompletion } = req.body || {};
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
  fail(errors);

  req.body = { status, note: trimOrUndefined(note), confirmCompletion };
  next();
}

/**
 * POST /bookings/:id/materials
 * body: { items: [{ name, quantity, price, note? }] }  or a single item { name, quantity, price, note? }
 */
function validateMaterialPayload(req, res, next) {
  const body = req.body || {};
  const rawItems = Array.isArray(body.items) ? body.items : [body];
  const errors = [];

  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS_PER_REQUEST) {
    errors.push({ field: 'items', message: `Provide between 1 and ${MAX_ITEMS_PER_REQUEST} items` });
  }

  const items = rawItems.map((raw = {}, i) => {
    const quantity = Number(raw.quantity);
    const price = Number(raw.price);
    const at = (field) => `items[${i}].${field}`;

    if (!isNonEmptyString(raw.name, 120)) errors.push({ field: at('name'), message: 'name is required (max 120 chars)' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000)
      errors.push({ field: at('quantity'), message: 'quantity must be an integer between 1 and 1000' });
    if (!Number.isFinite(price) || price < 0 || price > MAX_UNIT_PRICE)
      errors.push({ field: at('price'), message: `price must be between 0 and ${MAX_UNIT_PRICE}` });
    if (!isOptionalString(raw.note, 300)) errors.push({ field: at('note'), message: 'note max 300 chars' });

    return { name: trimOrUndefined(raw.name), quantity, price, note: trimOrUndefined(raw.note) };
  });

  fail(errors);
  req.body = { items };
  next();
}

/** PATCH /bookings/:id/materials/decision  body: { decision: "APPROVED" | "REJECTED" } */
function validateMaterialDecision(req, res, next) {
  const { decision } = req.body || {};
  const allowed = [MATERIAL_APPROVAL.APPROVED, MATERIAL_APPROVAL.REJECTED];
  fail(allowed.includes(decision) ? [] : [{ field: 'decision', message: `decision must be ${allowed.join(' or ')}` }]);
  req.body = { decision };
  next();
}

module.exports = {
  PROVIDER_DECLINE_REASONS,
  validateConfirmBooking,
  validateDeclineBooking,
  validateStatusUpdate,
  validateMaterialPayload,
  validateMaterialDecision,
};
