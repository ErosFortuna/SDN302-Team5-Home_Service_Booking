import { Router } from "express";
import ServiceCategory from "./service-category.model.js";
import { CATEGORY_SORT, toCategoryDTO } from "./category.dto.js";

/** Mounted at /api/categories — public catalogue: ACTIVE categories only (disabled ones are never exposed). */
const router = Router();

router.get("/", async (_req, res) => {
  const categories = await ServiceCategory.find({ isActive: { $ne: false } }).sort(CATEGORY_SORT).lean();
  res.json({ success: true, data: categories.map((c) => toCategoryDTO(c)) });
});

export default router;
