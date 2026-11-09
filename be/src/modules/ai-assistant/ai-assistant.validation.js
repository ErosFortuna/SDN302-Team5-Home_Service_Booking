const { AppError } = require('../../shared/app-error.js');

function validateEstimateRequest(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(new AppError(400, 'Dữ liệu yêu cầu không hợp lệ'));
  }

  const allowedKeys = ['description', 'serviceCategoryName'];
  const unknownKeys = Object.keys(body).filter((k) => !allowedKeys.includes(k));
  if (unknownKeys.length > 0) {
    return next(
      new AppError(400, `Trường không được phép: ${unknownKeys.join(', ')}`, [
        { field: unknownKeys[0], message: 'Trường không nằm trong danh sách cho phép' },
      ])
    );
  }

  const errors = [];
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const serviceCategoryName =
    typeof body.serviceCategoryName === 'string' ? body.serviceCategoryName.trim() : '';

  if (!description) {
    errors.push({ field: 'description', message: 'Mô tả sự cố không được để trống' });
  } else if (description.length < 5) {
    errors.push({
      field: 'description',
      message: 'Mô tả sự cố cần chi tiết hơn (tối thiểu 5 ký tự)',
    });
  } else if (description.length > 3000) {
    errors.push({
      field: 'description',
      message: 'Mô tả sự cố quá dài (tối đa 3000 ký tự)',
    });
  }

  if (!serviceCategoryName) {
    errors.push({
      field: 'serviceCategoryName',
      message: 'Tên danh mục dịch vụ không được để trống',
    });
  } else if (serviceCategoryName.length > 150) {
    errors.push({
      field: 'serviceCategoryName',
      message: 'Tên danh mục dịch vụ quá dài (tối đa 150 ký tự)',
    });
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'Dữ liệu đầu vào không hợp lệ', errors));
  }

  req.validatedAiPayload = {
    description,
    serviceCategoryName,
  };

  next();
}

module.exports = {
  validateEstimateRequest,
};
