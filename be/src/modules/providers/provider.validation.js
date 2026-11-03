const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');

const INCOMING_SORTS = Object.freeze({
  newest: { createdAt: -1 },
  soonest: { preferredStartAt: 1, createdAt: -1 },
});

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;
const MAX_SKILLS = 20;

const toPositiveInt = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
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

module.exports = { INCOMING_SORTS, validateIncomingQuery, validateSkillsPayload };
