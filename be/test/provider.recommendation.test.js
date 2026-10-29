const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateRecommendedProvidersQuery,
  validateSearchProvidersQuery,
} = require('../src/modules/providers/provider.validation.js');
const { AppError } = require('../src/shared/app-error.js');

test('validateRecommendedProvidersQuery sets defaults for missing parameters', () => {
  const req = { query: {} };
  let nextCalled = false;
  validateRecommendedProvidersQuery(req, {}, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.deepStrictEqual(req.recommendedQuery, {
    limit: 10,
    radiusKm: 15,
    sortBy: 'score',
  });
});

test('validateRecommendedProvidersQuery parses valid inputs', () => {
  const req = {
    query: {
      limit: '25',
      radiusKm: '30.5',
      sortBy: 'rating',
    },
  };
  let nextCalled = false;
  validateRecommendedProvidersQuery(req, {}, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.recommendedQuery.limit, 25);
  assert.strictEqual(req.recommendedQuery.radiusKm, 30.5);
  assert.strictEqual(req.recommendedQuery.sortBy, 'rating');
});

test('validateRecommendedProvidersQuery rejects invalid limit, radius, or sortBy', () => {
  const req = {
    query: {
      limit: '40', // max is 30
      radiusKm: '-5',
      sortBy: 'invalid_sort',
    },
  };

  assert.throws(
    () => {
      validateRecommendedProvidersQuery(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.details.length, 3);
      return true;
    }
  );
});

test('validateSearchProvidersQuery parses valid parameters and sanitizes city', () => {
  const req = {
    query: {
      categoryId: '66f100000000000000000001',
      city: '  TP. Hồ Chí Minh  ',
      lat: '10.7769',
      lng: '106.7009',
      minRating: '4.5',
      page: '2',
      limit: '15',
    },
  };
  let nextCalled = false;
  validateSearchProvidersQuery(req, {}, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.searchQuery.city, 'TP. Hồ Chí Minh');
  assert.strictEqual(req.searchQuery.lat, 10.7769);
  assert.strictEqual(req.searchQuery.lng, 106.7009);
  assert.strictEqual(req.searchQuery.minRating, 4.5);
  assert.strictEqual(req.searchQuery.page, 2);
  assert.strictEqual(req.searchQuery.limit, 15);
});

test('validateSearchProvidersQuery blocks Mongo injection in city', () => {
  const req = {
    query: {
      city: '$where',
    },
  };

  assert.throws(
    () => {
      validateSearchProvidersQuery(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      return true;
    }
  );
});

test('validateSearchProvidersQuery rejects incomplete lat/lng coordinates', () => {
  const req = {
    query: {
      lat: '10.7769',
      // lng missing
    },
  };

  assert.throws(
    () => {
      validateSearchProvidersQuery(req, {}, () => {});
    },
    (err) => {
      assert.ok(err instanceof AppError);
      assert.strictEqual(err.statusCode, 400);
      return true;
    }
  );
});
