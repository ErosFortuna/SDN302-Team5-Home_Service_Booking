import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import {
  loadBooking,
  isAssignedProvider,
  isBookingCustomer,
  isBookingParticipant,
} from "../../middlewares/booking.middleware.js";
import {
  validateStatusUpdate,
  validateMaterialPayload,
  validateMaterialDecision,
} from "../../middlewares/booking.validation.js";
import {
  getMyProviderBookings,
  getBookingById,
  updateServiceStatus,
  addMaterialAndFee,
  removeMaterial,
  decideMaterials,
} from "./booking.controller.js";

const router = Router();

router.use(protect);

// Provider
router.get("/provider/me", authorize("PROVIDER"), getMyProviderBookings);
router.patch("/:id/status", authorize("PROVIDER"), validateStatusUpdate, loadBooking, isAssignedProvider, updateServiceStatus);
router.post("/:id/materials", authorize("PROVIDER"), validateMaterialPayload, loadBooking, isAssignedProvider, addMaterialAndFee);
router.delete("/:id/materials/:materialId", authorize("PROVIDER"), loadBooking, isAssignedProvider, removeMaterial);

// Customer
router.patch("/:id/materials/decision", authorize("CUSTOMER"), validateMaterialDecision, loadBooking, isBookingCustomer, decideMaterials);

// Shared
router.get("/:id", loadBooking, isBookingParticipant, getBookingById);

export default router;
