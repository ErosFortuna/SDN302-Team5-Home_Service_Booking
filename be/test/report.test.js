const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidDateString,
  formatDateToYYYYMMDD,
  validateDateRangeQuery,
  validatePaginationQuery,
} = require('../src/modules/report/report.validation.js');
const { AppError } = require('../src/shared/app-error.js');

test('report: validates date string and formatting', () => {
  assert.equal(isValidDateString('2026-10-30'), true);
  assert.equal(isValidDateString('2026-02-29'), true); // leap year
  assert.equal(isValidDateString('invalid'), false);
  assert.equal(isValidDateString('30-10-2026'), false);

  const d = new Date(2026, 9, 30);
  assert.equal(formatDateToYYYYMMDD(d), '2026-10-30');
});

test('report: validates date range query defaults and custom values', () => {
  // Test with explicit dates
  const req = {
    query: {
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      granularity: 'week',
    },
  };

  validateDateRangeQuery(req, {}, (err) => {
    assert.ifError(err);
    assert.equal(req.reportFilter.startDate, '2026-10-01');
    assert.equal(req.reportFilter.endDate, '2026-10-30');
    assert.equal(req.reportFilter.granularity, 'week');
    assert.ok(req.reportFilter.startDateTime instanceof Date);
    assert.ok(req.reportFilter.endDateTime instanceof Date);
    assert.ok(req.reportFilter.prevStartDateTime instanceof Date);
  });

  // Test defaults when query is empty
  const reqEmpty = { query: {} };
  validateDateRangeQuery(reqEmpty, {}, (err) => {
    assert.ifError(err);
    assert.ok(isValidDateString(reqEmpty.reportFilter.startDate));
    assert.ok(isValidDateString(reqEmpty.reportFilter.endDate));
    assert.equal(reqEmpty.reportFilter.granularity, 'day');
  });

  // Rejects when startDate > endDate
  const reqReversed = {
    query: {
      startDate: '2026-10-30',
      endDate: '2026-10-01',
    },
  };
  validateDateRangeQuery(reqReversed, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /startDate phải sớm hơn/);
  });

  // Rejects invalid granularity
  const reqBadGran = {
    query: {
      granularity: 'hourly',
    },
  };
  validateDateRangeQuery(reqBadGran, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /granularity không hợp lệ/);
  });
});

test('report: validates pagination query for provider reports', () => {
  const req = {
    query: {
      page: '2',
      limit: '25',
      sortBy: 'netRevenue',
      order: 'asc',
      search: '  Thợ Điện Lạnh  ',
    },
  };

  validatePaginationQuery(req, {}, (err) => {
    assert.ifError(err);
    assert.equal(req.pagination.page, 2);
    assert.equal(req.pagination.limit, 25);
    assert.equal(req.pagination.sortBy, 'netRevenue');
    assert.equal(req.pagination.order, 1);
    assert.equal(req.pagination.search, 'Thợ Điện Lạnh');
  });

  // Invalid limit
  const reqBadLimit = { query: { limit: '999' } };
  validatePaginationQuery(reqBadLimit, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});
