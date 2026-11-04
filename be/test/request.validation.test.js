const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUpdateRequest, validateCancelRequest } = require('../src/modules/requests/request.validation.js');

function runValidation(middleware, body) {
  const req = { body };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let continued = false;
  middleware(req, res, () => { continued = true; });
  return { res, continued };
}

test('request update accepts whitelisted partial data', () => {
  const result = runValidation(validateUpdateRequest, { description: 'Please repair the leaking kitchen sink.' });
  assert.equal(result.continued, true);
  assert.equal(result.res.statusCode, 200);
});

test('request update rejects protected fields and invalid ranges', () => {
  const protectedField = runValidation(validateUpdateRequest, { status: 'CANCELLED' });
  assert.equal(protectedField.res.statusCode, 400);

  const invalidDates = runValidation(validateUpdateRequest, { preferredStartAt: null });
  assert.equal(invalidDates.res.statusCode, 400);

  const invalidBudget = runValidation(validateUpdateRequest, { budgetMin: 400000, budgetMax: 100000 });
  assert.equal(invalidBudget.res.statusCode, 400);
});

test('request cancellation requires a bounded reason', () => {
  assert.equal(runValidation(validateCancelRequest, {}).res.statusCode, 400);
  assert.equal(runValidation(validateCancelRequest, { reason: 'No longer needed' }).continued, true);
  assert.equal(runValidation(validateCancelRequest, { reason: 'x'.repeat(501) }).res.statusCode, 400);
});