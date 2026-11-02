const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const {
  validateProviderIdValue,
  validateReviewQueryValue,
  validateProviderId,
  validateReviewQuery,
  isValidObjectId,
} = require('../src/modules/provider-profile/providerProfile.validation.js');
const {
  assertProviderPubliclyViewable,
  getDefaultWeeklySchedule,
} = require('../src/modules/provider-profile/providerProfile.service.js');
const { AppError } = require('../src/shared/app-error.js');

test('provider-profile: validates ObjectId check', () => {
  const validId = new mongoose.Types.ObjectId().toString();
  assert.equal(isValidObjectId(validId), true);
  assert.equal(isValidObjectId('not-an-objectid'), false);
  assert.equal(isValidObjectId(12345), false);
  assert.equal(isValidObjectId(null), false);

  assert.equal(validateProviderIdValue(validId), validId);
  assert.throws(
    () => validateProviderIdValue('bad-id'),
    (err) => err instanceof AppError && err.statusCode === 400
  );
  assert.throws(
    () => validateProviderIdValue(''),
    (err) => err instanceof AppError && err.statusCode === 400
  );
});

test('provider-profile: validates review query options and defaults', () => {
  const defaults = validateReviewQueryValue({});
  assert.equal(defaults.page, 1);
  assert.equal(defaults.limit, 10);
  assert.equal(defaults.sortBy, 'newest');
  assert.equal(defaults.rating, undefined);

  const custom = validateReviewQueryValue({
    page: '3',
    limit: '25',
    rating: '5',
    sortBy: 'highest',
  });
  assert.equal(custom.page, 3);
  assert.equal(custom.limit, 25);
  assert.equal(custom.rating, 5);
  assert.equal(custom.sortBy, 'highest');

  // 'all' rating should result in undefined rating filter
  const allRating = validateReviewQueryValue({ rating: 'all' });
  assert.equal(allRating.rating, undefined);

  // Invalid page
  assert.throws(
    () => validateReviewQueryValue({ page: '0' }),
    (err) => err instanceof AppError && err.statusCode === 400
  );

  // Invalid limit (> 50)
  assert.throws(
    () => validateReviewQueryValue({ limit: '100' }),
    (err) => err instanceof AppError && err.statusCode === 400
  );

  // Invalid rating (> 5)
  assert.throws(
    () => validateReviewQueryValue({ rating: '6' }),
    (err) => err instanceof AppError && err.statusCode === 400
  );

  // Invalid sortBy
  assert.throws(
    () => validateReviewQueryValue({ sortBy: 'random' }),
    (err) => err instanceof AppError && err.statusCode === 400
  );
});

test('provider-profile: validates express middleware handlers', () => {
  const validId = new mongoose.Types.ObjectId().toString();
  const req1 = { params: { id: validId } };
  validateProviderId(req1, {}, (err) => {
    assert.ifError(err);
    assert.equal(req1.validatedProviderId, validId);
  });

  const reqInvalid = { params: { id: 'invalid-id' } };
  validateProviderId(reqInvalid, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });

  const reqQuery = { query: { page: '2', limit: '15', rating: '4', sortBy: 'lowest' } };
  validateReviewQuery(reqQuery, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqQuery.validatedReviewQuery.page, 2);
    assert.equal(reqQuery.validatedReviewQuery.limit, 15);
    assert.equal(reqQuery.validatedReviewQuery.rating, 4);
    assert.equal(reqQuery.validatedReviewQuery.sortBy, 'lowest');
  });
});

test('provider-profile: assertProviderPubliclyViewable enforces approved & active rules', () => {
  const validProfile = { verificationStatus: 'APPROVED' };
  const validUser = { status: 'ACTIVE', role: 'PROVIDER' };

  // Valid provider passes
  assert.equal(assertProviderPubliclyViewable(validProfile, validUser), true);

  // Rejects unapproved verificationStatus (PENDING, UNDER_REVIEW, REJECTED)
  assert.throws(
    () => assertProviderPubliclyViewable({ verificationStatus: 'PENDING' }, validUser),
    (err) => err instanceof AppError && err.statusCode === 404
  );
  assert.throws(
    () => assertProviderPubliclyViewable({ verificationStatus: 'UNDER_REVIEW' }, validUser),
    (err) => err instanceof AppError && err.statusCode === 404
  );
  assert.throws(
    () => assertProviderPubliclyViewable({ verificationStatus: 'REJECTED' }, validUser),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // Rejects BLOCKED or INACTIVE user accounts
  assert.throws(
    () => assertProviderPubliclyViewable(validProfile, { status: 'BLOCKED', role: 'PROVIDER' }),
    (err) => err instanceof AppError && err.statusCode === 404
  );
  assert.throws(
    () => assertProviderPubliclyViewable(validProfile, { status: 'INACTIVE', role: 'PROVIDER' }),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // Rejects non-PROVIDER roles
  assert.throws(
    () => assertProviderPubliclyViewable(validProfile, { status: 'ACTIVE', role: 'CUSTOMER' }),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // Rejects null profile or user
  assert.throws(
    () => assertProviderPubliclyViewable(null, validUser),
    (err) => err instanceof AppError && err.statusCode === 404
  );
  assert.throws(
    () => assertProviderPubliclyViewable(validProfile, null),
    (err) => err instanceof AppError && err.statusCode === 404
  );
});

test('provider-profile: default weekly schedule returns 7 days with Sunday off', () => {
  const schedule = getDefaultWeeklySchedule();
  assert.equal(schedule.length, 7);
  assert.equal(schedule[0].dayName, 'sunday');
  assert.equal(schedule[0].isOff, true);
  assert.equal(schedule[1].dayName, 'monday');
  assert.equal(schedule[1].isOff, false);
  assert.equal(schedule[1].startTime, '08:00');
  assert.equal(schedule[1].endTime, '17:00');
});

