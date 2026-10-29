const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateCreateService,
  validateUpdateService,
  validateServiceId,
  validateServiceQuery,
} = require('../src/modules/services/admin.service.validation.js');

const VALID_SERVICE = {
  categoryId: '507f1f77bcf86cd799439011',
  name: 'Vệ sinh máy lạnh',
  description: 'Vệ sinh và kiểm tra máy lạnh tại nhà.',
  basePrice: 250000,
  estimatedDurationMinutes: 60,
  pricingType: 'FROM',
  requirements: ['Có chỗ đậu xe'],
};

function invoke(middleware, req) {
  let error;
  let continued = false;
  try {
    middleware(req, {}, () => { continued = true; });
  } catch (caught) {
    error = caught;
  }
  return { error, continued };
}

test('admin service create validates and normalizes service fields', () => {
  const req = { body: { ...VALID_SERVICE, name: '  Vệ sinh   máy lạnh  ', requirements: [' Có chỗ đậu xe '] } };
  const result = invoke(validateCreateService, req);

  assert.equal(result.error, undefined);
  assert.equal(result.continued, true);
  assert.deepEqual(req.serviceData, {
    category: VALID_SERVICE.categoryId,
    name: 'Vệ sinh máy lạnh',
    description: VALID_SERVICE.description,
    basePrice: 250000,
    estimatedDurationMinutes: 60,
    pricingType: 'FROM',
    requirements: ['Có chỗ đậu xe'],
  });
});

test('admin service create rejects invalid fields and mass assignment', () => {
  const result = invoke(validateCreateService, {
    body: { ...VALID_SERVICE, categoryId: 'invalid', basePrice: -1, requirements: [42], role: 'ADMIN' },
  });

  assert.equal(result.error.statusCode, 400);
  assert.ok(result.error.details.some(({ field }) => field === 'categoryId'));
  assert.ok(result.error.details.some(({ field }) => field === 'basePrice'));
  assert.ok(result.error.details.some(({ field }) => field === 'requirements'));
  assert.ok(result.error.details.some(({ field }) => field.includes('role')));
});

test('admin service update accepts only valid partial fields', () => {
  const req = { body: { estimatedDurationMinutes: 90, requirements: [] } };
  const result = invoke(validateUpdateService, req);

  assert.equal(result.error, undefined);
  assert.deepEqual(req.serviceData, { estimatedDurationMinutes: 90, requirements: [] });
  assert.equal(invoke(validateUpdateService, { body: {} }).error.statusCode, 400);
});

test('admin service query validates filters and pagination', () => {
  const req = { query: { search: '  lạnh ', status: 'inactive', page: '2', limit: '20' } };
  const result = invoke(validateServiceQuery, req);

  assert.equal(result.error, undefined);
  assert.deepEqual(req.serviceQuery, { search: 'lạnh', status: 'inactive', categoryId: undefined, page: 2, limit: 20 });
  assert.equal(invoke(validateServiceQuery, { query: { status: 'other' } }).error.statusCode, 400);
});

test('admin service id validation requires a MongoDB ObjectId', () => {
  assert.equal(invoke(validateServiceId, { params: { id: VALID_SERVICE.categoryId } }).continued, true);
  assert.equal(invoke(validateServiceId, { params: { id: 'invalid' } }).error.statusCode, 400);
});
