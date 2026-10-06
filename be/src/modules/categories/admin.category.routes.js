import { Router } from "express";
import { verifyAdmin } from "../../middlewares/auth.middleware.js";
import {
  validateCategoryId,
  validateCategoryQuery,
  validateCreateCategory,
  validateToggleCategory,
  validateUpdateCategory,
} from "../../middlewares/category.validation.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  toggleCategoryStatus,
  updateCategory,
} from "./admin.category.controller.js";

/** Mounted at /api/admin/categories — UC-57 / UC-58 (ADMIN only). */
const router = Router();

router.use(verifyAdmin);

router.get("/", validateCategoryQuery, getAllCategories);
router.post("/", validateCreateCategory, createCategory);
router.get("/:id", validateCategoryId, getCategoryById);
router.patch("/:id", validateCategoryId, validateUpdateCategory, updateCategory);
router.patch("/:id/status", validateCategoryId, validateToggleCategory, toggleCategoryStatus);
// No hard DELETE by design: categories are referenced by services, requests and provider skills.

export default router;
