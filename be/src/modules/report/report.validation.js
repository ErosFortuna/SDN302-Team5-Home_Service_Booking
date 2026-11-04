const { AppError } = require('../../shared/app-error.js');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_GRANULARITIES = ['day', 'week', 'month'];
const VALID_SORT_FIELDS = ['netRevenue', 'grossRevenue', 'completedJobs', 'rating', 'name'];

/**
 * Kiểm tra chuỗi định dạng ngày YYYY-MM-DD
 */
function isValidDateString(str) {
  if (typeof str !== 'string' || !DATE_REGEX.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

/**
 * Trả về chuỗi YYYY-MM-DD từ đối tượng Date
 */
function formatDateToYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Middleware validate các tham số lọc khoảng thời gian [startDate, endDate]
 */
function validateDateRangeQuery(req, res, next) {
  try {
    let { startDate, endDate, granularity } = req.query;

    const now = new Date();

    if (!endDate) {
      endDate = formatDateToYYYYMMDD(now);
    } else if (!isValidDateString(endDate)) {
      throw new AppError(400, 'Tham số "endDate" không hợp lệ (phải có định dạng YYYY-MM-DD)');
    }

    if (!startDate) {
      // Mặc định lùi lại 30 ngày so với endDate
      const [ey, em, ed] = endDate.split('-').map(Number);
      const defaultStart = new Date(ey, em - 1, ed);
      defaultStart.setDate(defaultStart.getDate() - 29);
      startDate = formatDateToYYYYMMDD(defaultStart);
    } else if (!isValidDateString(startDate)) {
      throw new AppError(400, 'Tham số "startDate" không hợp lệ (phải có định dạng YYYY-MM-DD)');
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);

    const startDateTime = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDateTime = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    if (startDateTime.getTime() > endDateTime.getTime()) {
      throw new AppError(400, 'startDate phải sớm hơn hoặc bằng endDate');
    }

    // Tính toán khoảng thời gian kỳ trước (Previous Period) để so sánh tăng trưởng (%)
    const durationMs = endDateTime.getTime() - startDateTime.getTime() + 1;
    const prevEndDateTime = new Date(startDateTime.getTime() - 1);
    const prevStartDateTime = new Date(prevEndDateTime.getTime() - durationMs + 1);

    // Validate granularity nếu có
    let gran = 'day';
    if (granularity) {
      const g = String(granularity).toLowerCase();
      if (!VALID_GRANULARITIES.includes(g)) {
        throw new AppError(
          400,
          `granularity không hợp lệ. Cho phép: ${VALID_GRANULARITIES.join(', ')}`
        );
      }
      gran = g;
    }

    req.reportFilter = {
      startDate,
      endDate,
      startDateTime,
      endDateTime,
      prevStartDateTime,
      prevEndDateTime,
      granularity: gran,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware validate phân trang & sắp xếp cho bảng báo cáo Provider
 */
function validatePaginationQuery(req, res, next) {
  try {
    const { page, limit, sortBy, order, search } = req.query;

    const p = page ? parseInt(page, 10) : 1;
    if (isNaN(p) || p < 1) {
      throw new AppError(400, 'Tham số "page" phải là số nguyên dương >= 1');
    }

    const l = limit ? parseInt(limit, 10) : 10;
    if (isNaN(l) || l < 1 || l > 100) {
      throw new AppError(400, 'Tham số "limit" phải từ 1 đến 100');
    }

    let sort = 'netRevenue';
    if (sortBy && VALID_SORT_FIELDS.includes(String(sortBy))) {
      sort = String(sortBy);
    }

    const sortOrder = String(order).toLowerCase() === 'asc' ? 1 : -1;

    req.pagination = {
      page: p,
      limit: l,
      sortBy: sort,
      order: sortOrder,
      search: typeof search === 'string' ? search.trim() : '',
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  isValidDateString,
  formatDateToYYYYMMDD,
  validateDateRangeQuery,
  validatePaginationQuery,
};
