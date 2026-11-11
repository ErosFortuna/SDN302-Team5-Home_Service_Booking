const Booking = require('../bookings/booking.model.js');

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const PERIOD_FORMAT = Object.freeze({ day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' });

async function getPerformanceReport(providerId, filters) {
  const { startDateTime, endDateTime, granularity, requestGranularity } = filters;
  const revenuePeriod = PERIOD_FORMAT[granularity];
  const requestPeriod = PERIOD_FORMAT[requestGranularity];
  const revenueMatch = {
    provider: providerId,
    status: 'COMPLETED',
    finalPrice: { $type: 'number' },
    completedAt: { $gte: startDateTime, $lte: endDateTime },
  };
  const requestMatch = {
    provider: providerId,
    createdAt: { $gte: startDateTime, $lte: endDateTime },
  };

  const [revenue, requestStats, responseStats] = await Promise.all([
    Booking.aggregate([
      { $match: revenueMatch },
      { $facet: {
        summary: [{ $group: { _id: null, totalRevenue: { $sum: '$finalPrice' }, completedBookings: { $sum: 1 } } }],
        series: [
          { $group: {
            _id: { $dateToString: { format: revenuePeriod, date: '$completedAt', timezone: TIMEZONE } },
            revenue: { $sum: '$finalPrice' },
            completedBookings: { $sum: 1 },
          } },
          { $sort: { _id: 1 } },
        ],
      } },
    ]),
    Booking.aggregate([
      { $match: requestMatch },
      { $facet: {
        summary: [{ $count: 'totalRequests' }],
        series: [
          { $group: {
            _id: { $dateToString: { format: requestPeriod, date: '$createdAt', timezone: TIMEZONE } },
            bookingCount: { $sum: 1 },
          } },
          { $sort: { _id: 1 } },
        ],
      } },
    ]),
    Booking.aggregate([
      { $match: requestMatch },
      { $unwind: '$statusHistory' },
      { $match: {
        'statusHistory.changedBy': providerId,
        'statusHistory.to': { $in: ['CONFIRMED', 'CANCELLED'] },
      } },
      { $sort: { 'statusHistory.changedAt': 1 } },
      { $group: {
        _id: '$_id',
        createdAt: { $first: '$createdAt' },
        respondedAt: { $first: '$statusHistory.changedAt' },
      } },
      { $project: { responseMinutes: { $divide: [{ $subtract: ['$respondedAt', '$createdAt'] }, 60000] } } },
      { $group: { _id: null, respondedRequests: { $sum: 1 }, averageResponseMinutes: { $avg: '$responseMinutes' } } },
    ]),
  ]);

  const revenueData = revenue[0] || { summary: [], series: [] };
  const requestData = requestStats[0] || { summary: [], series: [] };
  const revenueSummary = revenueData.summary[0] || {};
  const totalRequests = requestData.summary[0]?.totalRequests || 0;
  const respondedRequests = responseStats[0]?.respondedRequests || 0;

  return {
    dateRange: { startDate: filters.startDate, endDate: filters.endDate },
    summary: {
      totalRevenue: revenueSummary.totalRevenue || 0,
      completedBookings: revenueSummary.completedBookings || 0,
      totalRequests,
      respondedRequests,
      responseRate: totalRequests ? Math.round((respondedRequests / totalRequests) * 10000) / 100 : 0,
      averageResponseMinutes: responseStats[0]?.averageResponseMinutes ?? null,
    },
    revenueSeries: revenueData.series.map((item) => ({ period: item._id, revenue: item.revenue, completedBookings: item.completedBookings })),
    requestSeries: requestData.series.map((item) => ({
      period: item._id,
      bookingCount: item.bookingCount,
      sharePercent: totalRequests ? Math.round((item.bookingCount / totalRequests) * 10000) / 100 : 0,
    })),
    granularity,
    requestGranularity,
  };
}

module.exports = { getPerformanceReport };
