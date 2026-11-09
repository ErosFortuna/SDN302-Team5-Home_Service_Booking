const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateCategoryId,
  validateCategoryQuery,
  validateCreateCategory,
  validateToggleCategory,
  validateUpdateCategory,
} = require('./category.validation.js');
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  toggleCategoryStatus,
  updateCategory,
} = require('./admin.category.controller.js');

/** Mounted at /api/admin/categories — UC-57 / UC-58 (ADMIN only). */
const router = Router();

const verifyAdmin = [protect, authorize('ADMIN')];

router.get('/', verifyAdmin, validateCategoryQuery, getAllCategories);
router.post('/', verifyAdmin, validateCreateCategory, createCategory);
router.get('/:id', verifyAdmin, validateCategoryId, getCategoryById);
router.patch('/:id', verifyAdmin, validateCategoryId, validateUpdateCategory, updateCategory);
router.patch('/:id/status', verifyAdmin, validateCategoryId, validateToggleCategory, toggleCategoryStatus);
// No hard DELETE by design: categories are referenced by services, requests and provider skills.

router.use(handleAppError);

module.exports = router;
