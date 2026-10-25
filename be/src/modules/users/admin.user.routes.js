const { Router } = require("express");
const { protect, authorize } = require("../../middlewares/auth.middleware.js");
const { handleAppError } = require("../../shared/app-error.js");
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateUserQuery,
} = require("./admin.user.validation.js");
const {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} = require("./admin.user.controller.js");

/** Mounted at /api/admin/users — admin-only user CRUD. */
const router = Router();
const verifyAdmin = [protect, authorize("ADMIN")];

router.get("/", verifyAdmin, validateUserQuery, getAllUsers);
router.post("/", verifyAdmin, validateCreateUser, createUser);
router.get("/:id", verifyAdmin, validateUserId, getUserById);
router.patch("/:id", verifyAdmin, validateUserId, validateUpdateUser, updateUser);
router.delete("/:id", verifyAdmin, validateUserId, deleteUser);

router.use(handleAppError);

module.exports = router;
