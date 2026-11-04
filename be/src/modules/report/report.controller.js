const reportService = require('./report.service.js');

/**
 * [GET] /api/admin/reports/dashboard
 * UC-53: Lấy toàn bộ chỉ số KPI, phân bổ dịch vụ, tỷ lệ hoàn thành/hủy và chất lượng vận hành
 */
async function getDashboard(req, res, next) {
  try {
    const data = await reportService.getDashboardOverview(req.reportFilter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/admin/reports/revenue-time-series
 * UC-61: Lấy chuỗi thời gian doanh thu nhóm theo ngày/tuần/tháng
 */
async function getRevenueTimeSeries(req, res, next) {
  try {
    const data = await reportService.getRevenueTimeSeries(req.reportFilter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/admin/reports/revenue-by-provider
 * UC-61: Lấy bảng xếp hạng doanh thu và số lượng đơn hoàn thành theo từng thợ
 */
async function getRevenueByProvider(req, res, next) {
  try {
    const result = await reportService.getRevenueByProvider({
      ...req.reportFilter,
      ...req.pagination,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      dateRange: result.dateRange,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getRevenueTimeSeries,
  getRevenueByProvider,
};
