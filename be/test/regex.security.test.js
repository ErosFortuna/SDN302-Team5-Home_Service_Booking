const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { escapeRegex } = require('../src/shared/regex.js');
const { validateListProvidersQuery } = require('../src/modules/provider-verification/providerVerification.validation.js');
const { validatePaginationQuery } = require('../src/modules/report/report.validation.js');
const providerVerificationService = require('../src/modules/provider-verification/providerVerification.service.js');
const { getRevenueByProvider } = require('../src/modules/report/report.service.js');
const ProviderProfile = require('../src/modules/provider-verification/providerProfile.model.js');
const User = require('../src/modules/users/user.model.js');
const Payment = require('../src/modules/report/payment.model.js');
const { AppError } = require('../src/shared/app-error.js');

test('V-25: escapeRegex properly escapes all regex special characters', () => {
  const specials = '.*+?^${}()|[\\]\\';
  const escaped = escapeRegex(specials);
  assert.equal(escaped, '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\\\\\]\\\\');

  // Verify creating a RegExp with the escaped string matches literal specials, not regex operators
  const rx = new RegExp(escaped);
  assert.ok(rx.test('.*+?^${}()|[\\]\\'));
  assert.ok(!rx.test('abc'));

  // ReDoS pattern like (a+)+$ is escaped as literal text
  const redosPattern = '(a+)+$';
  const escapedRedos = escapeRegex(redosPattern);
  assert.equal(escapedRedos, '\\(a\\+\\)\\+\\$');
  const redosRx = new RegExp(escapedRedos);
  assert.ok(redosRx.test('(a+)+$'));
  assert.ok(!redosRx.test('aaaaaaaaaaaaaaaaaaaaaaaaaa!'));

  // Handles null, undefined, numbers, normal strings
  assert.equal(escapeRegex(null), '');
  assert.equal(escapeRegex(undefined), '');
  assert.equal(escapeRegex(12345), '12345');
  assert.equal(escapeRegex('Nguyen Van A - 0912345678'), 'Nguyen Van A - 0912345678');
});

test('V-25: validateListProvidersQuery enforces maximum length (100) and type on search', () => {
  // Valid search within 100 characters
  const reqValid = { query: { search: '  Thợ Sửa Điện  ' } };
  validateListProvidersQuery(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedQuery.search, 'Thợ Sửa Điện');
  });

  // Rejects search exceeding 100 characters
  const longSearch = 'a'.repeat(101);
  const reqTooLong = { query: { search: longSearch } };
  validateListProvidersQuery(reqTooLong, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /tối đa 100 ký tự/i);
  });

  // Exactly 100 characters is allowed
  const reqExact100 = { query: { search: 'b'.repeat(100) } };
  validateListProvidersQuery(reqExact100, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqExact100.validatedQuery.search.length, 100);
  });

  // Rejects non-string search (e.g. object query injection)
  const reqObject = { query: { search: { $regex: '.*' } } };
  validateListProvidersQuery(reqObject, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

test('V-25: validatePaginationQuery in report enforces maximum length (100) and type on search', () => {
  const reqValid = { query: { search: '  Thợ Sửa Ống Nước  ' } };
  validatePaginationQuery(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.pagination.search, 'Thợ Sửa Ống Nước');
  });

  const reqTooLong = { query: { search: 'x'.repeat(101) } };
  validatePaginationQuery(reqTooLong, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /tối đa 100 ký tự/i);
  });

  const reqObject = { query: { search: { $regex: '.*' } } };
  validatePaginationQuery(reqObject, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

test('V-25: providerVerification.service listProviders escapes regex metacharacters in Mongo queries', async () => {
  const originalUserFind = User.find;
  const originalProfileFind = ProviderProfile.find;
  const originalProfileCount = ProviderProfile.countDocuments;
  const originalProfileAggregate = ProviderProfile.aggregate;

  let capturedUserQuery = null;
  let capturedProfileQuery = null;

  User.find = (q) => {
    capturedUserQuery = q;
    return {
      select: () => ({
        lean: async () => [{ _id: new mongoose.Types.ObjectId() }],
      }),
    };
  };

  ProviderProfile.find = (q) => {
    capturedProfileQuery = q;
    const chain = {
      populate: () => chain,
      sort: () => chain,
      skip: () => chain,
      limit: () => chain,
      lean: async () => [],
    };
    return chain;
  };

  ProviderProfile.countDocuments = async () => 0;
  ProviderProfile.aggregate = async () => [];

  try {
    // Search with regex characters and potential ReDoS pattern
    const searchWithRegex = 'Thợ (Điện + Nước) [HN] .Co (a+)+$';
    await providerVerificationService.listProviders({
      status: 'ALL',
      search: searchWithRegex,
      page: 1,
      limit: 10,
    });

    // Check User.find query: all fields must have escaped regex
    assert.ok(capturedUserQuery);
    assert.equal(capturedUserQuery.role, 'PROVIDER');
    const userOr = capturedUserQuery.$or;
    assert.ok(Array.isArray(userOr));

    const expectedEscaped = escapeRegex(searchWithRegex);
    assert.equal(expectedEscaped, 'Thợ \\(Điện \\+ Nước\\) \\[HN\\] \\.Co \\(a\\+\\)\\+\\$');

    assert.equal(userOr[0].fullName.$regex, expectedEscaped);
    assert.equal(userOr[1].email.$regex, expectedEscaped);
    assert.equal(userOr[2].phone.$regex, expectedEscaped);

    // Check ProviderProfile.find query: businessName & serviceAreas must have escaped regex
    assert.ok(capturedProfileQuery);
    const profileOr = capturedProfileQuery.$or;
    assert.ok(Array.isArray(profileOr));
    assert.equal(profileOr[1].businessName.$regex, expectedEscaped);
    assert.equal(profileOr[2].serviceAreas.$regex, expectedEscaped);
  } finally {
    User.find = originalUserFind;
    ProviderProfile.find = originalProfileFind;
    ProviderProfile.countDocuments = originalProfileCount;
    ProviderProfile.aggregate = originalProfileAggregate;
  }
});

test('V-25: report.service getRevenueByProvider escapes regex metacharacters in aggregation $match', async () => {
  const originalAggregate = Payment.aggregate;
  const originalCount = Payment.countDocuments;
  let capturedPipeline = null;

  Payment.countDocuments = async () => 10;
  Payment.aggregate = async (pipeline) => {
    capturedPipeline = pipeline;
    return [{ metadata: [{ total: 0 }], data: [] }];
  };

  try {
    const rawSearch = 'provider.*+?^${}()|[\\]\\';
    await getRevenueByProvider({
      search: rawSearch,
      page: 1,
      limit: 10,
      sortBy: 'netRevenue',
      order: -1,
    });

    assert.ok(capturedPipeline);
    const matchStage = capturedPipeline.find((stage) => stage.$match && stage.$match.$or);
    assert.ok(matchStage, 'Should have a $match stage with $or for search');

    const expectedEscaped = escapeRegex(rawSearch);
    assert.equal(matchStage.$match.$or[0].providerName.$regex, expectedEscaped);
    assert.equal(matchStage.$match.$or[1].email.$regex, expectedEscaped);
    assert.equal(matchStage.$match.$or[2].businessName.$regex, expectedEscaped);
  } finally {
    Payment.aggregate = originalAggregate;
    Payment.countDocuments = originalCount;
  }
});
