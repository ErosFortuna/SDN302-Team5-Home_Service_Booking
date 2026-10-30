const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateDateRangeQuery,
  validatePaginationQuery,
} = require('./report.validation.js');
const {
  getDashboard,
  getRevenueTimeSeries,
  getRevenueByProvider,
} = require('./report.controller.js');

const router = Router();

// Tất cả các endpoints trong module Report / Analytics đều yêu cầu quyền ADMIN
router.use(protect, authorize('ADMIN'));

/**
 * [GET] /api/admin/reports/dashboard
 * UC-53: Dashboard tổng quan
 */
router.get('/dashboard', validateDateRangeQuery, getDashboard);

/**
 * [GET] /api/admin/reports/revenue-time-series
 * UC-61: Biểu đồ doanh thu theo chuỗi thời gian
 */
router.get('/revenue-time-series', validateDateRangeQuery, getRevenueTimeSeries);

/**
 * [GET] /api/admin/reports/revenue-by-provider
 * UC-61: Báo cáo doanh thu và xếp hạng theo từng Provider
 */
router.get(
  '/revenue-by-provider',
  validateDateRangeQuery,
  validatePaginationQuery,
  getRevenueByProvider
);

router.use(handleAppError);

module.exports = router;
