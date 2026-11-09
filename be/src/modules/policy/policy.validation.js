const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');
const { POLICY_TYPES } = require('./policy.model.js');

const ALLOWED_POLICY_CREATE_FIELDS = ['title', 'type', 'content', 'version', 'isMandatory', 'isActive', 'summary', 'effectiveDate'];
const ALLOWED_POLICY_UPDATE_FIELDS = ['title', 'content', 'isMandatory', 'isActive', 'summary', 'effectiveDate'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function fail(errors) {
  throw new AppError(400, 'Dữ liệu chính sách không hợp lệ', errors);
}

/**
 * Validate creating a new policy (or new version).
 */
function validateCreatePolicy(req, _res, next) {
  if (!isPlainObject(req.body)) {
    fail([{ field: 'body', message: 'Body phải là một JSON object' }]);
  }

  const errors = [];
  const data = {};

  const unknown = Object.keys(req.body).filter((k) => !ALLOWED_POLICY_CREATE_FIELDS.includes(k));
  if (unknown.length) {
    errors.push({ field: unknown.join(', '), message: 'Trường không được phép trong payload' });
  }

  const { title, type, content, version, isMandatory, isActive, summary, effectiveDate } = req.body;

  // Title
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 200) {
    errors.push({ field: 'title', message: 'Tiêu đề phải là chuỗi từ 2 đến 200 ký tự' });
  } else {
    data.title = title.trim();
  }

  // Type
  if (!POLICY_TYPES.includes(type)) {
    errors.push({ field: 'type', message: `Loại chính sách phải là một trong: ${POLICY_TYPES.join(', ')}` });
  } else {
    data.type = type;
  }

  // Content
  if (typeof content !== 'string' || content.trim().length < 10) {
    errors.push({ field: 'content', message: 'Nội dung chính sách tối thiểu 10 ký tự' });
  } else if (content.length > 100000) {
    errors.push({ field: 'content', message: 'Nội dung chính sách vượt quá 100,000 ký tự' });
  } else {
    data.content = content.trim();
  }

  // Version
  const versionRegex = /^v?\d+(\.\d+)*$/i;
  if (typeof version !== 'string' || !versionRegex.test(version.trim())) {
    errors.push({ field: 'version', message: 'Phiên bản không hợp lệ (ví dụ: v1.0, 2.0)' });
  } else {
    data.version = version.trim();
  }

  // isMandatory
  if (isMandatory !== undefined) {
    if (typeof isMandatory !== 'boolean') {
      errors.push({ field: 'isMandatory', message: 'isMandatory phải là boolean' });
    } else {
      data.isMandatory = isMandatory;
    }
  } else {
    data.isMandatory = true;
  }

  // isActive
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive phải là boolean' });
    } else {
      data.isActive = isActive;
    }
  } else {
    data.isActive = false;
  }

  // Summary
  if (summary !== undefined && summary !== null) {
    if (typeof summary !== 'string') {
      errors.push({ field: 'summary', message: 'Tóm tắt phải là chuỗi' });
    } else if (summary.trim().length > 500) {
      errors.push({ field: 'summary', message: 'Tóm tắt tối đa 500 ký tự' });
    } else {
      data.summary = summary.trim();
    }
  }

  // Effective Date
  if (effectiveDate !== undefined && effectiveDate !== null) {
    const d = new Date(effectiveDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'effectiveDate', message: 'Ngày hiệu lực không hợp lệ' });
    } else {
      data.effectiveDate = d;
    }
  }

  if (errors.length) fail(errors);

  req.policyData = data;
  next();
}

/**
 * Validate updating an existing policy.
 */
function validateUpdatePolicy(req, _res, next) {
  if (!isPlainObject(req.body)) {
    fail([{ field: 'body', message: 'Body phải là một JSON object' }]);
  }

  const errors = [];
  const data = {};

  const unknown = Object.keys(req.body).filter((k) => !ALLOWED_POLICY_UPDATE_FIELDS.includes(k));
  if (unknown.length) {
    errors.push({ field: unknown.join(', '), message: 'Trường không được phép cập nhật' });
  }

  const { title, content, isMandatory, isActive, summary, effectiveDate } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 200) {
      errors.push({ field: 'title', message: 'Tiêu đề phải là chuỗi từ 2 đến 200 ký tự' });
    } else {
      data.title = title.trim();
    }
  }

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length < 10) {
      errors.push({ field: 'content', message: 'Nội dung tối thiểu 10 ký tự' });
    } else if (content.length > 100000) {
      errors.push({ field: 'content', message: 'Nội dung vượt quá 100,000 ký tự' });
    } else {
      data.content = content.trim();
    }
  }

  if (isMandatory !== undefined) {
    if (typeof isMandatory !== 'boolean') {
      errors.push({ field: 'isMandatory', message: 'isMandatory phải là boolean' });
    } else {
      data.isMandatory = isMandatory;
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive phải là boolean' });
    } else {
      data.isActive = isActive;
    }
  }

  if (summary !== undefined) {
    if (summary !== null && typeof summary !== 'string') {
      errors.push({ field: 'summary', message: 'Tóm tắt phải là chuỗi' });
    } else if (summary && summary.trim().length > 500) {
      errors.push({ field: 'summary', message: 'Tóm tắt tối đa 500 ký tự' });
    } else {
      data.summary = summary ? summary.trim() : '';
    }
  }

  if (effectiveDate !== undefined && effectiveDate !== null) {
    const d = new Date(effectiveDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'effectiveDate', message: 'Ngày hiệu lực không hợp lệ' });
    } else {
      data.effectiveDate = d;
    }
  }

  if (errors.length) fail(errors);

  req.policyUpdateData = data;
  next();
}

/**
 * Validate submitting user consent (accepting single or batch policies).
 */
function validateSubmitConsent(req, _res, next) {
  if (!isPlainObject(req.body)) {
    fail([{ field: 'body', message: 'Body phải là một JSON object' }]);
  }

  const errors = [];
  const { policyId, policyIds } = req.body;

  let ids = [];
  if (policyId) {
    if (!isObjectId(policyId)) {
      errors.push({ field: 'policyId', message: 'Mã chính sách policyId không hợp lệ' });
    } else {
      ids.push(String(policyId));
    }
  } else if (Array.isArray(policyIds)) {
    if (policyIds.length === 0) {
      errors.push({ field: 'policyIds', message: 'Danh sách policyIds không được để trống' });
    } else {
      for (let i = 0; i < policyIds.length; i++) {
        if (!isObjectId(policyIds[i])) {
          errors.push({ field: `policyIds[${i}]`, message: 'Mã chính sách không hợp lệ' });
        } else {
          ids.push(String(policyIds[i]));
        }
      }
    }
  } else {
    errors.push({ field: 'policyId', message: 'Cần truyền policyId hoặc danh sách policyIds' });
  }

  if (errors.length) fail(errors);

  req.consentPolicyIds = [...new Set(ids)];
  next();
}

/**
 * Validate query parameters for listing policies.
 */
function validatePolicyQuery(req, _res, next) {
  const { type, isActive, search, page = 1, limit = 10 } = req.query;
  const errors = [];
  const parsed = {};

  if (type) {
    if (!POLICY_TYPES.includes(type)) {
      errors.push({ field: 'type', message: `type phải là một trong: ${POLICY_TYPES.join(', ')}` });
    } else {
      parsed.type = type;
    }
  }

  if (isActive !== undefined) {
    if (isActive === 'true' || isActive === '1') parsed.isActive = true;
    else if (isActive === 'false' || isActive === '0') parsed.isActive = false;
    else errors.push({ field: 'isActive', message: 'isActive phải là boolean' });
  }

  if (search && typeof search === 'string') {
    parsed.search = search.trim().slice(0, 100);
  }

  const p = Number(page);
  const l = Number(limit);
  if (!Number.isInteger(p) || p < 1) errors.push({ field: 'page', message: 'page phải là số nguyên >= 1' });
  else parsed.page = p;

  if (!Number.isInteger(l) || l < 1 || l > 100) errors.push({ field: 'limit', message: 'limit phải là số nguyên từ 1 đến 100' });
  else parsed.limit = l;

  if (errors.length) fail(errors);

  req.parsedQuery = parsed;
  next();
}

module.exports = {
  validateCreatePolicy,
  validateUpdatePolicy,
  validateSubmitConsent,
  validatePolicyQuery,
};
