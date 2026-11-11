const { AppError } = require('../../shared/app-error.js');
const { validateDateRangeQuery } = require('../report/report.validation.js');

function validatePerformanceQuery(req, res, next) {
  const requestGranularity = String(req.query.requestGranularity || 'day').toLowerCase();
  if (!['day', 'week'].includes(requestGranularity)) {
    return next(new AppError(400, 'requestGranularity không hợp lệ. Cho phép: day, week'));
  }
  return validateDateRangeQuery(req, res, (error) => {
    if (error) return next(error);
    req.reportFilter.requestGranularity = requestGranularity;
    return next();
  });
}

module.exports = { validatePerformanceQuery };
