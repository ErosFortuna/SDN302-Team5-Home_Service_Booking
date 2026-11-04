const Service = require('./service.model.js');
const ServiceCategory = require('../categories/service-category.model.js');
const { AppError } = require('../../shared/app-error.js');
const { slugify } = require('../categories/category.dto.js');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isDuplicateKey = (error) => error?.code === 11000;

function toServiceDTO(service) {
  const { _id, category, ...fields } = service;
  return {
    id: _id.toString(),
    ...fields,
    category: category && typeof category === 'object' ? {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
    } : category?.toString(),
  };
}

async function assertCategoryExists(categoryId) {
  if (!await ServiceCategory.exists({ _id: categoryId })) {
    throw new AppError(400, 'Danh mục dịch vụ không tồn tại', [{ field: 'categoryId', message: 'Vui lòng chọn danh mục hợp lệ' }]);
  }
}

async function assertSlugAvailable(name, excludeId) {
  const slug = slugify(name);
  if (!slug) throw new AppError(400, 'Tên dịch vụ phải chứa chữ hoặc số', [{ field: 'name', message: 'Tên không hợp lệ' }]);
  const exists = await Service.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) });
  if (exists) throw new AppError(409, 'Tên dịch vụ đã tồn tại', [{ field: 'name', message: 'Tên dịch vụ đã tồn tại' }]);
  return slug;
}

async function getAllServices(req, res) {
  const { search, status, categoryId, page, limit } = req.serviceQuery;
  const filter = {};
  if (status === 'active') filter.isActive = { $ne: false };
  if (status === 'inactive') filter.isActive = false;
  if (categoryId) filter.category = categoryId;
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { description: regex }, { slug: regex }];
  }

  const [services, total, counts] = await Promise.all([
    Service.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
    Service.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] } },
      } },
    ]),
  ]);
  const totalCount = counts[0]?.total ?? 0;
  const activeCount = counts[0]?.active ?? 0;

  res.json({
    success: true,
    data: services.map(toServiceDTO),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats: { total: totalCount, active: activeCount, inactive: totalCount - activeCount },
    },
  });
}

async function getServiceById(req, res) {
  const service = await Service.findById(req.params.id).populate('category', 'name slug').lean();
  if (!service) throw new AppError(404, 'Không tìm thấy dịch vụ');
  res.json({ success: true, data: toServiceDTO(service) });
}

async function createService(req, res) {
  await assertCategoryExists(req.serviceData.category);
  const slug = await assertSlugAvailable(req.serviceData.name);
  try {
    const service = await Service.create({ ...req.serviceData, slug, isActive: true });
    const populated = await Service.findById(service._id).populate('category', 'name slug').lean();
    res.status(201).json({ success: true, message: 'Đã tạo dịch vụ', data: toServiceDTO(populated) });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AppError(409, 'Tên dịch vụ đã tồn tại');
    throw error;
  }
}

async function updateService(req, res) {
  const update = { ...req.serviceData };
  if (update.category) await assertCategoryExists(update.category);
  if (update.name) update.slug = await assertSlugAvailable(update.name, req.params.id);
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).populate('category', 'name slug').lean();
    if (!service) throw new AppError(404, 'Không tìm thấy dịch vụ');
    res.json({ success: true, message: 'Đã cập nhật dịch vụ', data: toServiceDTO(service) });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AppError(409, 'Tên dịch vụ đã tồn tại');
    throw error;
  }
}

async function setServiceActive(req, res) {
  const update = req.body.isActive
    ? { $set: { isActive: true }, $unset: { deactivatedAt: 1 } }
    : { $set: { isActive: false, deactivatedAt: new Date() } };
  const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('category', 'name slug').lean();
  if (!service) throw new AppError(404, 'Không tìm thấy dịch vụ');
  res.json({
    success: true,
    message: req.body.isActive ? 'Đã kích hoạt lại dịch vụ' : 'Đã vô hiệu hóa dịch vụ',
    data: toServiceDTO(service),
  });
}

async function deleteService(req, res) {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false, deactivatedAt: new Date() } },
    { new: true },
  ).populate('category', 'name slug').lean();
  if (!service) throw new AppError(404, 'Không tìm thấy dịch vụ');
  res.json({ success: true, message: 'Đã vô hiệu hóa dịch vụ', data: toServiceDTO(service) });
}

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  setServiceActive,
  deleteService,
};
