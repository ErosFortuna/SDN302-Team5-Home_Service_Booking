import ServiceCategory from "../categories/service-category.model.js";
import ProviderProfile from "./provider.model.js";
import { AppError } from "../../shared/app-error.js";
import { CATEGORY_SORT, toCategoryDTO } from "../categories/category.dto.js";

const SKILL_FIELDS = "name slug description pricingMode icon isActive sortOrder deactivatedAt createdAt updatedAt";

/**
 * Shared response for GET/PUT:
 *  - available      : every ACTIVE category the provider may pick
 *  - selectedIds    : provider's current ACTIVE skills
 *  - inactiveSkills : skills the provider had but the admin has since disabled (hidden from matching)
 */
async function buildSkillsPayload(userId) {
  const [available, profile] = await Promise.all([
    ServiceCategory.find({ isActive: { $ne: false } }).sort(CATEGORY_SORT).lean(),
    ProviderProfile.findOne({ user: userId }).populate("skills", SKILL_FIELDS).lean(),
  ]);

  const skills = (profile?.skills ?? []).filter(Boolean); // drop refs to deleted docs
  return {
    available: available.map((c) => toCategoryDTO(c)),
    selectedIds: skills.filter((s) => s.isActive !== false).map((s) => s._id.toString()),
    inactiveSkills: skills.filter((s) => s.isActive === false).map((s) => toCategoryDTO(s)),
    profile: { exists: Boolean(profile), verificationStatus: profile?.verificationStatus ?? null },
  };
}

/** GET /api/provider/skills  (UC-33) */
export async function getMySkills(req, res) {
  res.json({ success: true, data: await buildSkillsPayload(req.user._id) });
}

/**
 * PUT /api/provider/skills  { skillIds: string[] }  (UC-33)
 * Replaces the provider's skill set. Every id must be an existing ACTIVE category.
 * Creates the provider profile on first save (verificationStatus defaults to PENDING).
 */
export async function updateMySkills(req, res) {
  const ids = req.skillIds;

  if (ids.length) {
    const valid = await ServiceCategory.find({ _id: { $in: ids }, isActive: { $ne: false } }).select("_id").lean();
    const validSet = new Set(valid.map((c) => c._id.toString()));
    const invalidIds = ids.filter((id) => !validSet.has(id));
    if (invalidIds.length) {
      throw new AppError(400, "Một số dịch vụ không tồn tại hoặc đã ngừng hoạt động. Vui lòng tải lại danh sách.", { invalidIds });
    }
  }

  await ProviderProfile.updateOne(
    { user: req.user._id },
    { $set: { skills: ids } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  res.json({
    success: true,
    message: ids.length ? `Đã lưu ${ids.length} kỹ năng` : "Đã xóa toàn bộ kỹ năng",
    data: await buildSkillsPayload(req.user._id),
  });
}
