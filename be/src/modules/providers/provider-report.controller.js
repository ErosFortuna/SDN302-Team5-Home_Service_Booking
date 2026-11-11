const providerReportService = require('./provider-report.service.js');

async function getPerformanceReport(req, res, next) {
  try {
    const data = await providerReportService.getPerformanceReport(req.user._id, req.reportFilter);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPerformanceReport };
