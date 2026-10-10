const { Router } = require("express");
const authRoutes = require("../modules/auth/auth.routes.js");
const serviceCategoryRoutes = require("../modules/categories/service-category.routes.js");
const serviceRoutes = require("../modules/services/service.routes.js");
const serviceRequestRoutes = require("../modules/requests/service-request.routes.js");
const bookingRoutes = require("../modules/bookings/booking.routes.js");
const providerRoutes = require("../modules/providers/provider.routes.js");
const providerSkillRoutes = require("../modules/providers/provider.skill.routes.js");
const adminCategoryRoutes = require("../modules/categories/admin.category.routes.js");

const router = Router();
router.use("/auth", authRoutes);
router.use("/service-categories", serviceCategoryRoutes);
router.use("/services", serviceRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/bookings", bookingRoutes);
router.use("/admin/categories", adminCategoryRoutes);
router.use("/provider/skills", providerSkillRoutes);
router.use("/provider", providerRoutes);
router.get("/health", (req, res) =>
  res.json({
    success: true,
    service: "home-service-booking-api",
    timestamp: new Date().toISOString(),
  }),
);
module.exports = router;
