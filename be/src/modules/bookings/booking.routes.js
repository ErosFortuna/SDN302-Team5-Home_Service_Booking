const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  loadBooking,
  isAssignedProvider,
  isBookingCustomer,
  isBookingParticipant,
} = require('./booking.middleware.js');
const {
  validateConfirmBooking,
  validateDeclineBooking,
  validateStatusUpdate,
  validateMaterialPayload,
  validateMaterialDecision,
} = require('./booking.validation.js');
const {
  getMyProviderBookings,
  getBookingById,
  confirmBooking,
  declineBooking,
  updateServiceStatus,
  addMaterialAndFee,
  removeMaterial,
  decideMaterials,
} = require('./booking.controller.js');

/** Mounted at /api/bookings */
const router = Router();

router.use(protect);

// Provider - Confirm & Decline Booking Requests (UC-14)
router.patch('/:bookingId/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);
router.patch('/:id/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);

router.patch('/:bookingId/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);
router.patch('/:id/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);

// Provider - My Bookings & Progress Tracking (UC-38)
router.get('/provider/me', authorize('PROVIDER'), getMyProviderBookings);
router.patch('/:id/status', authorize('PROVIDER'), validateStatusUpdate, loadBooking, isAssignedProvider, updateServiceStatus);
router.post('/:id/materials', authorize('PROVIDER'), validateMaterialPayload, loadBooking, isAssignedProvider, addMaterialAndFee);
router.delete('/:id/materials/:materialId', authorize('PROVIDER'), loadBooking, isAssignedProvider, removeMaterial);

// Customer
router.patch('/:id/materials/decision', authorize('CUSTOMER'), validateMaterialDecision, loadBooking, isBookingCustomer, decideMaterials);

// Shared
router.get('/:id', loadBooking, isBookingParticipant, getBookingById);

router.use(handleAppError);

module.exports = router;
