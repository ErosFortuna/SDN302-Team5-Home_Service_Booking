const { AppError } = require('../../shared/app-error.js');
const { BOOKING_STATUS_VALUES, MATERIAL_APPROVAL } = require('./booking.status.js');

const MAX_ITEMS_PER_REQUEST = 20;
const MAX_UNIT_PRICE = 100000000;

const isNonEmptyString = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
const isOptionalString = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.trim().length <= max);
const trimOrUndefined = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function fail(errors) {
  if (errors.length) throw new AppError(400, 'Validation failed', errors);
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

module.exports = { validateStatusUpdate, validateMaterialPayload, validateMaterialDecision };
