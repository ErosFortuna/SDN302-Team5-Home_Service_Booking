const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');
const { CATEGORY_ICONS, PRICING_MODES } = require('./service-category.model.js');

const CATEGORY_FIELDS = ['name', 'description', 'pricingMode', 'icon', 'sortOrder'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const fail = (errors) => {
  throw new AppError(400, 'Dữ liệu không hợp lệ', errors);
};

/** Validates the subset of category fields present in `body`. Returns { data, errors }. */
function parseCategoryFields(body, { requireAll }) {
  const errors = [];
  const data = {};

  const unknown = Object.keys(body).filter((k) => !CATEGORY_FIELDS.includes(k));
  if (unknown.length) errors.push({ field: unknown.join(', '), message: 'Trường không được phép cập nhật' });

  if (body.name !== undefined || requireAll) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 100) errors.push({ field: 'name', message: 'Tên dịch vụ phải từ 2–100 ký tự' });
    else data.name = name;
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Mô tả phải là chuỗi' });
    } else {
      const description = (body.description || '').trim();
      if (description.length > 500) errors.push({ field: 'description', message: 'Mô tả tối đa 500 ký tự' });
      else data.description = description;
    }
  }
  if (body.pricingMode !== undefined || requireAll) {
    if (!PRICING_MODES.includes(body.pricingMode)) {
      errors.push({ field: 'pricingMode', message: `pricingMode phải là: ${PRICING_MODES.join(', ')}` });
    } else data.pricingMode = body.pricingMode;
  }
  if (body.icon !== undefined) {
    if (!CATEGORY_ICONS.includes(body.icon)) errors.push({ field: 'icon', message: 'Icon không hợp lệ' });
    else data.icon = body.icon;
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isInteger(n) || n < 0 || n > 9999) errors.push({ field: 'sortOrder', message: 'sortOrder phải là số nguyên 0–9999' });
    else data.sortOrder = n;
  }
  return { data, errors };
}

/** POST /admin/categories → req.categoryData */
function validateCreateCategory(req, res, next) {
  if (!isPlainObject(req.body)) fail([{ field: 'body', message: 'Body phải là JSON object' }]);
  const { data, errors } = parseCategoryFields(req.body, { requireAll: true });
  if (errors.length) fail(errors);
  req.categoryData = data;
  next();
}

/** PATCH /admin/categories/:id → req.categoryData (partial) */
function validateUpdateCategory(req, res, next) {
  if (!isPlainObject(req.body)) fail([{ field: 'body', message: 'Body phải là JSON object' }]);
  const { data, errors } = parseCategoryFields(req.body, { requireAll: false });
  if (errors.length) fail(errors);
  if (!Object.keys(data).length) fail([{ field: 'body', message: 'Không có trường nào để cập nhật' }]);
  req.categoryData = data;
  next();
}

/** PATCH /admin/categories/:id/status  { isActive: boolean } */
function validateToggleCategory(req, res, next) {
  if (typeof (req.body && req.body.isActive) !== 'boolean') fail([{ field: 'isActive', message: 'isActive phải là true/false' }]);
  next();
}

/** GET /admin/categories query → req.categoryQuery */
function validateCategoryQuery(req, res, next) {
  const { search = '', status = 'all', pricingMode, page = '1', limit = '10' } = req.query;
  const errors = [];
  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!['all', 'active', 'inactive'].includes(status)) errors.push({ field: 'status', message: 'status: all | active | inactive' });
  if (pricingMode !== undefined && !PRICING_MODES.includes(pricingMode)) errors.push({ field: 'pricingMode', message: 'pricingMode không hợp lệ' });
  if (!Number.isInteger(pageNum) || pageNum < 1) errors.push({ field: 'page', message: 'page phải là số nguyên ≥ 1' });
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) errors.push({ field: 'limit', message: 'limit phải từ 1–100' });
  if (typeof search !== 'string' || search.length > 100) errors.push({ field: 'search', message: 'search tối đa 100 ký tự' });
  if (errors.length) fail(errors);

  req.categoryQuery = { search: search.trim(), status, pricingMode, page: pageNum, limit: limitNum };
  next();
}

/** Validates `:id` route param. */
function validateCategoryId(req, res, next) {
  if (!isObjectId(req.params.id)) throw new AppError(400, 'Mã danh mục không hợp lệ');
  next();
}

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
  validateToggleCategory,
  validateCategoryQuery,
  validateCategoryId,
};
