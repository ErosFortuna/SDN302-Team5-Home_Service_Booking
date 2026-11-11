const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidDateString,
  formatDateToYYYYMMDD,
  validateDateRangeQuery,
  validatePaginationQuery,
} = require('../src/modules/report/report.validation.js');
const { AppError } = require('../src/shared/app-error.js');
const MembershipPayment = require('../src/modules/payments/membership-payment.model.js');
const reportService = require('../src/modules/report/report.service.js');

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

test('report: summarizes provider membership transactions and paid amount', async (t) => {
  const originalAggregate = MembershipPayment.aggregate;
  const originalFind = MembershipPayment.find;
  const originalCountDocuments = MembershipPayment.countDocuments;
  const startDateTime = new Date('2026-10-01T00:00:00.000Z');
  const endDateTime = new Date('2026-10-31T23:59:59.999Z');
  const payment = {
    _id: { toString: () => 'payment-id' },
    orderCode: 12345,
    provider: { fullName: 'Provider One', email: 'provider@example.test', phone: '0900000000' },
    planNameSnapshot: 'Gói Premium',
    amount: 500000,
    currency: 'VND',
    status: 'PAID',
    createdAt: startDateTime,
    paidAt: startDateTime,
  };
  const aggregationPipelines = [];
  let queryFilter;

  t.after(() => {
    MembershipPayment.aggregate = originalAggregate;
    MembershipPayment.find = originalFind;
    MembershipPayment.countDocuments = originalCountDocuments;
  });

  MembershipPayment.aggregate = async (pipeline) => {
    aggregationPipelines.push(pipeline);
    return pipeline[0].$match.status
      ? [{ period: '2026-10-01', amount: 500000, transactionCount: 1 }]
      : [{ totalTransactions: 2, paidTransactions: 1, paidAmount: 500000 }];
  };
  MembershipPayment.find = (filter) => {
    queryFilter = filter;
    const query = {
      populate() { return this; },
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      lean: async () => [payment],
    };
    return query;
  };
  MembershipPayment.countDocuments = async () => 2;

  const result = await reportService.getMembershipPaymentReport({
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    startDateTime,
    endDateTime,
    page: 1,
    limit: 10,
  });

  assert.deepEqual(queryFilter.createdAt, { $gte: startDateTime, $lte: endDateTime });
  assert.equal(aggregationPipelines.length, 2);
  assert.deepEqual(result.summary, {
    totalTransactions: 2,
    paidTransactions: 1,
    paidAmount: 500000,
  });
  assert.equal(result.transactions[0].providerName, 'Provider One');
  assert.equal(result.transactions[0].planName, 'Gói Premium');
  assert.equal(result.transactions[0].status, 'PAID');
  assert.deepEqual(result.timeSeries, [
    { period: '2026-10-01', amount: 500000, transactionCount: 1 },
  ]);
  assert.equal(result.pagination.total, 2);
});

test('report: dashboard revenue aggregates only paid provider membership transactions', async (t) => {
  const originalAggregate = MembershipPayment.aggregate;
  const startDateTime = new Date('2026-10-01T00:00:00.000Z');
  const endDateTime = new Date('2026-10-31T23:59:59.999Z');
  let pipeline;

  t.after(() => {
    MembershipPayment.aggregate = originalAggregate;
  });

  MembershipPayment.aggregate = async (value) => {
    pipeline = value;
    return [{ grossRevenue: 750000, paidCount: 2 }];
  };

  const result = await reportService.aggregateMembershipRevenue(startDateTime, endDateTime);

  assert.deepEqual(pipeline[0].$match, {
    status: 'PAID',
    paidAt: { $gte: startDateTime, $lte: endDateTime },
  });
  assert.deepEqual(result, {
    grossRevenue: 750000,
    netRevenue: 750000,
    paidCount: 2,
  });
});
