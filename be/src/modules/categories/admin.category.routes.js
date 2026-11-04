<<<<<<< HEAD
import { Router } from "express";
import { verifyAdmin } from "../../middlewares/auth.middleware.js";
import {
=======
const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
>>>>>>> development
  validateCategoryId,
  validateCategoryQuery,
  validateCreateCategory,
  validateToggleCategory,
  validateUpdateCategory,
<<<<<<< HEAD
} from "../../middlewares/category.validation.js";
import {
=======
} = require('./category.validation.js');
const {
>>>>>>> development
  createCategory,
  getAllCategories,
  getCategoryById,
  toggleCategoryStatus,
  updateCategory,
<<<<<<< HEAD
} from "./admin.category.controller.js";
=======
} = require('./admin.category.controller.js');
>>>>>>> development

/** Mounted at /api/admin/categories — UC-57 / UC-58 (ADMIN only). */
const router = Router();

<<<<<<< HEAD
router.use(verifyAdmin);

router.get("/", validateCategoryQuery, getAllCategories);
router.post("/", validateCreateCategory, createCategory);
router.get("/:id", validateCategoryId, getCategoryById);
router.patch("/:id", validateCategoryId, validateUpdateCategory, updateCategory);
router.patch("/:id/status", validateCategoryId, validateToggleCategory, toggleCategoryStatus);
// No hard DELETE by design: categories are referenced by services, requests and provider skills.

export default router;
=======
const verifyAdmin = [protect, authorize('ADMIN')];

router.get('/', verifyAdmin, validateCategoryQuery, getAllCategories);
router.post('/', verifyAdmin, validateCreateCategory, createCategory);
router.get('/:id', verifyAdmin, validateCategoryId, getCategoryById);
router.patch('/:id', verifyAdmin, validateCategoryId, validateUpdateCategory, updateCategory);
router.patch('/:id/status', verifyAdmin, validateCategoryId, validateToggleCategory, toggleCategoryStatus);
// No hard DELETE by design: categories are referenced by services, requests and provider skills.

router.use(handleAppError);

module.exports = router;
>>>>>>> development
