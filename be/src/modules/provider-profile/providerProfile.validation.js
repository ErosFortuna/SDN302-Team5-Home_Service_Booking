const mongoose = require('mongoose');
const { AppError } = require('../../shared/app-error.js');

const VALID_SORT_OPTIONS = Object.freeze(['newest', 'highest', 'lowest']);
const MAX_LIMIT = 50;

/**
 * Validates that a string is a valid MongoDB ObjectId
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.isValidObjectId(id);
}

/**
 * Pure function to validate a providerId string
 * @param {string} id
 * @returns {string} trimmed id
 */
function validateProviderIdValue(id) {
  if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id.trim())) {
    throw new AppError(400, 'Mã định danh thợ (providerId) không hợp lệ.');
  }
  return id.trim();
}

/**
 * Pure function to validate review listing query parameters
 * @param {object} query
 * @returns {{ page: number, limit: number, rating?: number, sortBy: string }}
 */
function validateReviewQueryValue(query = {}) {
  let page = 1;
  let limit = 10;
  let rating;
  let sortBy = 'newest';

  if (query.page !== undefined) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new AppError(400, 'Tham số page phải là số nguyên dương lớn hơn hoặc bằng 1.');
    }
    page = parsedPage;
  }

  if (query.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      throw new AppError(
        400,
        `Tham số limit phải là số nguyên dương trong khoảng từ 1 đến ${MAX_LIMIT}.`
      );
    }
    limit = parsedLimit;
  }

  if (query.rating !== undefined && query.rating !== '' && query.rating !== 'all') {
    const parsedRating = Number(query.rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new AppError(400, 'Số sao lọc đánh giá phải là số nguyên từ 1 đến 5.');
    }
    rating = parsedRating;
  }

  if (query.sortBy !== undefined && query.sortBy !== '') {
    const cleanSort = String(query.sortBy).trim().toLowerCase();
    if (!VALID_SORT_OPTIONS.includes(cleanSort)) {
      throw new AppError(
        400,
        `Tham số sortBy không hợp lệ. Các giá trị cho phép: ${VALID_SORT_OPTIONS.join(', ')}.`
      );
    }
    sortBy = cleanSort;
  }

  return { page, limit, rating, sortBy };
}

/**
 * Express middleware to validate :id in route params
 */
function validateProviderId(req, res, next) {
  try {
    const id = req.params.id || req.params.providerId;
    req.validatedProviderId = validateProviderIdValue(id);
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Express middleware to validate query params for review listing
 */
function validateReviewQuery(req, res, next) {
  try {
    req.validatedReviewQuery = validateReviewQueryValue(req.query);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  isValidObjectId,
  validateProviderIdValue,
  validateReviewQueryValue,
  validateProviderId,
  validateReviewQuery,
  VALID_SORT_OPTIONS,
  MAX_LIMIT,
};

