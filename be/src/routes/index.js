const { Router } = require("express");
const authRoutes = require("../modules/auth/auth.routes.js");
const serviceCategoryRoutes = require("../modules/categories/service-category.routes.js");
const serviceRoutes = require("../modules/services/service.routes.js");
const adminServiceRoutes = require("../modules/services/admin.service.routes.js");
const serviceRequestRoutes = require("../modules/requests/service-request.routes.js");
const bookingRoutes = require("../modules/bookings/booking.routes.js");
const providerRoutes = require("../modules/providers/provider.routes.js");
const providerSkillRoutes = require("../modules/providers/provider.skill.routes.js");
const adminCategoryRoutes = require("../modules/categories/admin.category.routes.js");
const adminUserRoutes = require("../modules/users/admin.user.routes.js");
const uploadRoutes = require("../modules/upload/upload.routes.js");

const router = Router();
router.use("/auth", authRoutes);
router.use("/service-categories", serviceCategoryRoutes);
router.use("/services", serviceRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/requests", serviceRequestRoutes); // Alias to support /api/requests/:requestId/...
router.use("/bookings", bookingRoutes);
router.use("/admin/categories", adminCategoryRoutes);
router.use("/admin/services", adminServiceRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/provider/skills", providerSkillRoutes);
router.use("/provider", providerRoutes);
router.use("/providers", providerRoutes); // Alias to support /api/providers/search
router.use("/upload", uploadRoutes);
router.get("/health", (req, res) =>
  res.json({
    success: true,
    service: "home-service-booking-api",
    timestamp: new Date().toISOString(),
  }),
);
module.exports = router;
