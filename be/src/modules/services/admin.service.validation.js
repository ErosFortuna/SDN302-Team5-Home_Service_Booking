const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');

const SERVICE_FIELDS = [
  'categoryId',
  'name',
  'description',
  'basePrice',
  'estimatedDurationMinutes',
  'pricingType',
  'requirements',
];
const PRICING_TYPES = ['FIXED', 'FROM', 'QUOTE_REQUIRED'];

const fail = (errors) => {
  throw new AppError(400, 'Dữ liệu không hợp lệ', errors);
};

function parseServiceFields(body, { requireAll }) {
  const errors = [];
  const data = {};
  const unknown = Object.keys(body).filter((key) => !SERVICE_FIELDS.includes(key));
  if (unknown.length) errors.push({ field: unknown.join(', '), message: 'Trường không được phép cập nhật' });

  if (body.categoryId !== undefined || requireAll) {
    if (!isObjectId(body.categoryId)) errors.push({ field: 'categoryId', message: 'Danh mục dịch vụ không hợp lệ' });
    else data.category = body.categoryId;
  }
  if (body.name !== undefined || requireAll) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 160) errors.push({ field: 'name', message: 'Tên dịch vụ phải từ 2–160 ký tự' });
    else data.name = name;
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Mô tả phải là chuỗi' });
    } else {
      const description = (body.description || '').trim();
      if (description.length > 3000) errors.push({ field: 'description', message: 'Mô tả tối đa 3000 ký tự' });
      else data.description = description;
    }
  }
  if (body.basePrice !== undefined || requireAll) {
    const basePrice = Number(body.basePrice);
    if (!Number.isFinite(basePrice) || basePrice < 0) errors.push({ field: 'basePrice', message: 'Giá phải là số không âm' });
    else data.basePrice = basePrice;
  }
  if (body.estimatedDurationMinutes !== undefined || requireAll) {
    const duration = Number(body.estimatedDurationMinutes);
    if (!Number.isInteger(duration) || duration < 15 || duration > 1440) {
      errors.push({ field: 'estimatedDurationMinutes', message: 'Thời lượng phải là số nguyên từ 15 đến 1440 phút' });
    } else data.estimatedDurationMinutes = duration;
  }
  if (body.pricingType !== undefined || requireAll) {
    if (!PRICING_TYPES.includes(body.pricingType)) {
      errors.push({ field: 'pricingType', message: `pricingType phải là: ${PRICING_TYPES.join(', ')}` });
    } else data.pricingType = body.pricingType;
  }
  if (body.requirements !== undefined) {
    if (!Array.isArray(body.requirements) || body.requirements.length > 20 || body.requirements.some((item) => typeof item !== 'string')) {
      errors.push({ field: 'requirements', message: 'Yêu cầu phải là danh sách tối đa 20 mục' });
    } else {
      const requirements = body.requirements.map((item) => item.trim());
      if (requirements.some((item) => item.length > 300)) {
        errors.push({ field: 'requirements', message: 'Mỗi yêu cầu tối đa 300 ký tự' });
      } else {
        data.requirements = requirements.filter(Boolean);
      }
    }
  }

  return { data, errors };
}

function validateCreateService(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    fail([{ field: 'body', message: 'Body phải là JSON object' }]);
  }
  const { data, errors } = parseServiceFields(req.body, { requireAll: true });
  if (errors.length) fail(errors);
  req.serviceData = data;
  next();
}

function validateUpdateService(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    fail([{ field: 'body', message: 'Body phải là JSON object' }]);
  }
  const { data, errors } = parseServiceFields(req.body, { requireAll: false });
  if (errors.length) fail(errors);
  if (!Object.keys(data).length) fail([{ field: 'body', message: 'Không có trường nào để cập nhật' }]);
  req.serviceData = data;
  next();
}

function validateServiceQuery(req, res, next) {
  const { search = '', status = 'all', categoryId, page = '1', limit = '10' } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const errors = [];

  if (!['all', 'active', 'inactive'].includes(status)) errors.push({ field: 'status', message: 'status: all | active | inactive' });
  if (categoryId !== undefined && !isObjectId(categoryId)) errors.push({ field: 'categoryId', message: 'Danh mục dịch vụ không hợp lệ' });
  if (!Number.isInteger(pageNumber) || pageNumber < 1) errors.push({ field: 'page', message: 'page phải là số nguyên ≥ 1' });
  if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) errors.push({ field: 'limit', message: 'limit phải từ 1–100' });
  if (typeof search !== 'string' || search.length > 100) errors.push({ field: 'search', message: 'search tối đa 100 ký tự' });
  if (errors.length) fail(errors);

  req.serviceQuery = { search: search.trim(), status, categoryId, page: pageNumber, limit: limitNumber };
  next();
}

function validateServiceId(req, res, next) {
  if (!isObjectId(req.params.id)) throw new AppError(400, 'Mã dịch vụ không hợp lệ');
  next();
}

function validateServiceStatus(req, res, next) {
  if (typeof (req.body && req.body.isActive) !== 'boolean') {
    fail([{ field: 'isActive', message: 'isActive phải là true/false' }]);
  }
  next();
}

module.exports = {
  validateCreateService,
  validateUpdateService,
  validateServiceQuery,
  validateServiceId,
  validateServiceStatus,
};
