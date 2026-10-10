const ServiceCategory = require("./service-category.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const { AppError } = require("../../shared/app-error.js");
const { CATEGORY_SORT, toCategoryDTO, slugify } = require("./category.dto.js");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isDuplicateKey = (err) => err?.code === 11000;
const DUPLICATE_NAME = "Tên dịch vụ đã tồn tại (trùng với một danh mục khác)";

/** { [categoryId]: number of providers having it as a skill } — one aggregation, no N+1. */
async function countProvidersBySkill(categoryIds) {
  if (!categoryIds.length) return {};
  const rows = await ProviderProfile.aggregate([
    { $match: { skills: { $in: categoryIds } } },
    { $unwind: "$skills" },
    { $match: { skills: { $in: categoryIds } } },
    { $group: { _id: "$skills", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
}

/** Whole-catalogue counters for the dashboard header (independent of filters). */
async function getCatalogStats() {
  const [row] = await ServiceCategory.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] } },
        fixed: { $sum: { $cond: [{ $eq: ["$pricingMode", "FIXED"] }, 1, 0] } },
      },
    },
  ]);
  const total = row?.total ?? 0;
  const active = row?.active ?? 0;
  const fixed = row?.fixed ?? 0;
  return { total, active, inactive: total - active, fixed, requestQuote: total - fixed };
}

async function assertSlugAvailable(slug, excludeId) {
  if (!slug) throw new AppError(400, "Tên dịch vụ phải chứa chữ hoặc số", [{ field: "name", message: "Tên không hợp lệ" }]);
  const clash = await ServiceCategory.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) });
  if (clash) throw new AppError(409, DUPLICATE_NAME, [{ field: "name", message: DUPLICATE_NAME }]);
}

async function withProviderCount(category) {
  const counts = await countProvidersBySkill([category._id]);
  return toCategoryDTO(category, { providerCount: counts[category._id.toString()] ?? 0 });
}

/** GET /api/admin/categories?search=&status=all|active|inactive&pricingMode=&page=&limit= */
async function getAllCategories(req, res) {
  const { search, status, pricingMode, page, limit } = req.categoryQuery;

  const filter = {};
  if (status === "active") filter.isActive = { $ne: false };
  if (status === "inactive") filter.isActive = false;
  if (pricingMode === "FIXED") filter.pricingMode = "FIXED";
  // Legacy docs without pricingMode are treated as REQUEST_QUOTE (schema default).
  if (pricingMode === "REQUEST_QUOTE") filter.pricingMode = { $ne: "FIXED" };
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { description: rx }, { slug: rx }];
  }

  const [docs, total, stats] = await Promise.all([
    ServiceCategory.find(filter).sort(CATEGORY_SORT).skip((page - 1) * limit).limit(limit).lean(),
    ServiceCategory.countDocuments(filter),
    getCatalogStats(),
  ]);
  const counts = await countProvidersBySkill(docs.map((d) => d._id));

  res.json({
    success: true,
    data: docs.map((d) => toCategoryDTO(d, { providerCount: counts[d._id.toString()] ?? 0 })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), stats },
  });
}

/** GET /api/admin/categories/:id */
async function getCategoryById(req, res) {
  const category = await ServiceCategory.findById(req.params.id).lean();
  if (!category) throw new AppError(404, "Không tìm thấy danh mục dịch vụ");
  res.json({ success: true, data: await withProviderCount(category) });
}

/** POST /api/admin/categories */
async function createCategory(req, res) {
  const data = req.categoryData;
  const slug = slugify(data.name);
  await assertSlugAvailable(slug);

  try {
    const category = await ServiceCategory.create({ ...data, slug, isActive: true });
    res.status(201).json({ success: true, message: "Đã tạo danh mục dịch vụ", data: toCategoryDTO(category, { providerCount: 0 }) });
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError(409, DUPLICATE_NAME); // lost a race with a concurrent create
    throw err;
  }
}

/** PATCH /api/admin/categories/:id  (partial update; isActive is changed via /status only) */
async function updateCategory(req, res) {
  const update = { ...req.categoryData };
  if (update.name) {
    update.slug = slugify(update.name);
    await assertSlugAvailable(update.slug, req.params.id);
  }

  try {
    const category = await ServiceCategory.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!category) throw new AppError(404, "Không tìm thấy danh mục dịch vụ");
    res.json({ success: true, message: "Đã cập nhật danh mục", data: await withProviderCount(category) });
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError(409, DUPLICATE_NAME);
    throw err;
  }
}

/**
 * PATCH /api/admin/categories/:id/status  { isActive }
 * Soft delete / restore. Explicit target value (not a blind flip) keeps the call idempotent
 * when two admins click at the same time. Provider skills are kept, just hidden while inactive.
 */
async function toggleCategoryStatus(req, res) {
  const { isActive } = req.body;
  const update = isActive ? { $set: { isActive: true }, $unset: { deactivatedAt: 1 } } : { $set: { isActive: false, deactivatedAt: new Date() } };

  const category = await ServiceCategory.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!category) throw new AppError(404, "Không tìm thấy danh mục dịch vụ");

  const dto = await withProviderCount(category);
  res.json({
    success: true,
    message: isActive ? "Đã kích hoạt lại danh mục" : "Đã vô hiệu hóa danh mục",
    data: dto,
  });
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
};
