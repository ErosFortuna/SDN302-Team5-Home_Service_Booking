const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');

const INCOMING_SORTS = Object.freeze({
  newest: { createdAt: -1 },
  soonest: { preferredStartAt: 1, createdAt: -1 },
});

const RECOMMENDED_SORTS = Object.freeze(['score', 'rating', 'distance']);

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;
const MAX_SKILLS = 20;

const DEFAULT_RECOMMENDED_LIMIT = 10;
const MAX_RECOMMENDED_LIMIT = 30;
const DEFAULT_RADIUS_KM = 15;
const MAX_RADIUS_KM = 100;

const toPositiveInt = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

const toBoundedNumber = (value, fallback, min = 0, max = Infinity) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return !Number.isNaN(n) && n >= min && n <= max ? n : NaN;
};

/**
 * GET /provider/requests/incoming — normalised into `req.incomingQuery`
 * (Express 5 makes `req.query` read-only).
 *   page >= 1 (1) · limit 1..50 (9) · category: one of the provider's skills
 *   sort: newest | soonest · area: mine | all
 */
function validateIncomingQuery(req, res, next) {
  const { page, limit, category, sort = 'newest', area = 'mine' } = req.query;
  const errors = [];

  const pageNum = toPositiveInt(page, 1);
  const limitNum = toPositiveInt(limit, DEFAULT_LIMIT);

  if (Number.isNaN(pageNum)) errors.push({ field: 'page', message: 'page must be a positive integer' });
  if (Number.isNaN(limitNum) || limitNum > MAX_LIMIT) {
    errors.push({ field: 'limit', message: `limit must be an integer between 1 and ${MAX_LIMIT}` });
  }
  if (category !== undefined && !isObjectId(category)) {
    errors.push({ field: 'category', message: 'category must be a valid id' });
  }
  if (!Object.prototype.hasOwnProperty.call(INCOMING_SORTS, sort)) {
    errors.push({ field: 'sort', message: `sort must be one of: ${Object.keys(INCOMING_SORTS).join(', ')}` });
  }
  if (!['mine', 'all'].includes(area)) errors.push({ field: 'area', message: "area must be 'mine' or 'all'" });

  if (errors.length) throw new AppError(400, 'Invalid query parameters', errors);

  req.incomingQuery = { page: pageNum, limit: limitNum, category, sort, area };
  next();
}

/** PUT /provider/skills  { skillIds: string[] } → req.skillIds (deduplicated) */
function validateSkillsPayload(req, res, next) {
  const { skillIds } = req.body || {};
  const fail = (message) => {
    throw new AppError(400, 'Dữ liệu không hợp lệ', [{ field: 'skillIds', message }]);
  };

  if (!Array.isArray(skillIds)) fail('skillIds phải là mảng');

  const invalid = skillIds.filter((id) => !isObjectId(id));
  if (invalid.length) fail(`Mã không hợp lệ: ${invalid.slice(0, 5).join(', ')}`);

  const unique = [...new Set(skillIds.map(String))];
  if (unique.length > MAX_SKILLS) fail(`Tối đa ${MAX_SKILLS} kỹ năng`);

  req.skillIds = unique;
  next();
}

/**
 * GET /api/requests/:requestId/recommended-providers
 * Validates and normalises recommendation query parameters.
 * Checks limit (1-30), radiusKm (0.5-100), sortBy (score|rating|distance).
 */
function validateRecommendedProvidersQuery(req, res, next) {
  const { limit, radiusKm, sortBy = 'score' } = req.query;
  const errors = [];

  const limitNum = toPositiveInt(limit, DEFAULT_RECOMMENDED_LIMIT);
  const radiusNum = toBoundedNumber(radiusKm, DEFAULT_RADIUS_KM, 0.5, MAX_RADIUS_KM);

  if (Number.isNaN(limitNum) || limitNum > MAX_RECOMMENDED_LIMIT) {
    errors.push({
      field: 'limit',
      message: `limit must be an integer between 1 and ${MAX_RECOMMENDED_LIMIT}`,
    });
  }

  if (Number.isNaN(radiusNum)) {
    errors.push({
      field: 'radiusKm',
      message: `radiusKm must be a number between 0.5 and ${MAX_RADIUS_KM}`,
    });
  }

  if (!RECOMMENDED_SORTS.includes(sortBy)) {
    errors.push({
      field: 'sortBy',
      message: `sortBy must be one of: ${RECOMMENDED_SORTS.join(', ')}`,
    });
  }

  if (errors.length) {
    throw new AppError(400, 'Invalid recommendation query parameters', errors);
  }

  req.recommendedQuery = {
    limit: limitNum,
    radiusKm: radiusNum,
    sortBy,
  };

  next();
}

/**
 * GET /api/providers/search
 * Validates query params for public/authenticated provider search.
 * Protects against object injection and Mongo operators ($where, $regex).
 */
function validateSearchProvidersQuery(req, res, next) {
  const { serviceId, categoryId, city, lat, lng, radiusKm, minRating, page, limit } = req.query;
  const errors = [];

  const pageNum = toPositiveInt(page, 1);
  const limitNum = toPositiveInt(limit, 10);
  const radiusNum = toBoundedNumber(radiusKm, DEFAULT_RADIUS_KM, 0.5, MAX_RADIUS_KM);

  if (Number.isNaN(pageNum)) {
    errors.push({ field: 'page', message: 'page must be a positive integer' });
  }
  if (Number.isNaN(limitNum) || limitNum > MAX_LIMIT) {
    errors.push({ field: 'limit', message: `limit must be an integer between 1 and ${MAX_LIMIT}` });
  }
  if (Number.isNaN(radiusNum)) {
    errors.push({ field: 'radiusKm', message: `radiusKm must be a number between 0.5 and ${MAX_RADIUS_KM}` });
  }

  if (serviceId !== undefined && !isObjectId(serviceId)) {
    errors.push({ field: 'serviceId', message: 'serviceId must be a valid ObjectId' });
  }

  if (categoryId !== undefined && !isObjectId(categoryId)) {
    errors.push({ field: 'categoryId', message: 'categoryId must be a valid ObjectId' });
  }

  let sanitizedCity;
  if (city !== undefined) {
    if (typeof city !== 'string') {
      errors.push({ field: 'city', message: 'city must be a string' });
    } else {
      sanitizedCity = city.trim().slice(0, 100);
      // Reject any attempt of Mongo operator injection
      if (sanitizedCity.startsWith('$')) {
        errors.push({ field: 'city', message: 'Invalid city format' });
      }
    }
  }

  let latNum;
  let lngNum;
  if (lat !== undefined || lng !== undefined) {
    if (lat === undefined || lng === undefined) {
      errors.push({ field: 'coordinates', message: 'Both lat and lng must be provided together' });
    } else {
      latNum = Number(lat);
      lngNum = Number(lng);
      if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.push({ field: 'lat', message: 'lat must be between -90 and 90' });
      }
      if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.push({ field: 'lng', message: 'lng must be between -180 and 180' });
      }
    }
  }

  let minRatingNum;
  if (minRating !== undefined && minRating !== '') {
    minRatingNum = Number(minRating);
    if (Number.isNaN(minRatingNum) || minRatingNum < 0 || minRatingNum > 5) {
      errors.push({ field: 'minRating', message: 'minRating must be a number between 0 and 5' });
    }
  }

  if (errors.length) {
    throw new AppError(400, 'Invalid search query parameters', errors);
  }

  req.searchQuery = {
    serviceId,
    categoryId,
    city: sanitizedCity,
    lat: latNum,
    lng: lngNum,
    radiusKm: radiusNum,
    minRating: minRatingNum,
    page: pageNum,
    limit: limitNum,
  };

  next();
}

module.exports = {
  INCOMING_SORTS,
  RECOMMENDED_SORTS,
  validateIncomingQuery,
  validateSkillsPayload,
  validateRecommendedProvidersQuery,
  validateSearchProvidersQuery,
};
