<<<<<<< HEAD
import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import bookingRoutes from '../modules/bookings/booking.routes.js';
import providerRoutes from '../modules/providers/provider.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/provider', providerRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
export default router;
=======
const { Router } = require("express");
const authRoutes = require("../modules/auth/auth.routes.js");
const serviceCategoryRoutes = require("../modules/categories/service-category.routes.js");
const serviceRoutes = require("../modules/services/service.routes.js");
const adminServiceRoutes = require("../modules/services/admin.service.routes.js");
const serviceRequestRoutes = require("../modules/requests/service-request.routes.js");
const bookingRoutes = require("../modules/bookings/booking.routes.js");
const complaintRoutes = require("../modules/complaints/complaint.routes.js");
const providerRoutes = require("../modules/providers/provider.routes.js");
const providerSkillRoutes = require("../modules/providers/provider.skill.routes.js");
const { providerProfileRouter, publicProviderProfileRouter } = require("../modules/providers/provider-profile.routes.js");
const adminCategoryRoutes = require("../modules/categories/admin.category.routes.js");
const adminUserRoutes = require("../modules/users/admin.user.routes.js");
const uploadRoutes = require("../modules/upload/upload.routes.js");
const notificationRoutes = require("../modules/notifications/notification.routes.js");
const paymentRoutes = require("../modules/payments/payment.routes.js");
const { plansRouter, providerSubscriptionRouter } = require("../modules/payments/membership.routes.js");
const availabilityRoutes = require("../modules/availability/availability.routes.js");
const providerVerificationRoutes = require("../modules/provider-verification/providerVerification.routes.js");
const reportRoutes = require("../modules/report/report.routes.js");
const reviewRoutes = require("../modules/reviews/review.routes.js");

const router = Router();
router.use("/auth", authRoutes);
router.use("/service-categories", serviceCategoryRoutes);
router.use("/services", serviceRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/requests", serviceRequestRoutes); // Alias to support /api/requests/:requestId/...
router.use("/bookings", bookingRoutes);
router.use("/complaints", complaintRoutes);
router.use("/admin/categories", adminCategoryRoutes);
router.use("/admin/services", adminServiceRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/provider/profile", providerProfileRouter);
router.use("/provider/skills", providerSkillRoutes);
router.use("/provider", providerRoutes);
router.use("/providers", providerRoutes); // Alias to support /api/providers/search
router.use("/providers/:providerId", publicProviderProfileRouter);
router.use("/upload", uploadRoutes);
router.use("/notifications", notificationRoutes);
router.use("/membership/plans", plansRouter);
router.use("/provider/subscription", providerSubscriptionRouter);
router.use("/payments", paymentRoutes);
router.use("/availability", availabilityRoutes);
router.use("/admin/providers", providerVerificationRoutes);
router.use("/provider-verification", providerVerificationRoutes);
router.use("/admin/reports", reportRoutes);
router.use("/reports", reportRoutes);
router.use(reviewRoutes);

router.get("/health", (req, res) =>
  res.json({
    success: true,
    service: "home-service-booking-api",
    timestamp: new Date().toISOString(),
  }),
);
module.exports = router;
>>>>>>> development
