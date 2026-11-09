const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  loadBooking,
  isAssignedProvider,
  canUpdateBookingStatus,
  isOwningCustomer,
  isBookingParticipant,
  canManageBookingSchedule,
} = require('./booking.middleware.js');
const {
  validateConfirmBooking,
  validateDeclineBooking,
  validateStatusUpdate,
  validateCustomerReschedule,
  validateCustomerCancellation,
  validateBookingAdjustment,
  validateConfirmPayment,
} = require('./booking.validation.js');
const {
  getAllBookingsForStaff,
  getMyProviderBookings,
  getMyCustomerBookings,
  getBookingById,
  confirmBooking,
  declineBooking,
  updateServiceStatus,
  adjustBookingByStaff,
  confirmCustomerPayment,
  rescheduleCustomerBooking,
  cancelCustomerBooking,
} = require('./booking.controller.js');

/** Mounted at /api/bookings */
const router = Router();

router.use(protect);

// Staff / Admin - View All Bookings & Adjustments
router.get('/', authorize('STAFF', 'ADMIN'), getAllBookingsForStaff);
router.patch('/:id/adjust', authorize('STAFF', 'ADMIN'), validateBookingAdjustment, loadBooking, adjustBookingByStaff);

// Provider - Confirm & Decline Booking Requests (UC-14)
router.patch('/:bookingId/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);
router.post('/:bookingId/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);
router.patch('/:id/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);
router.post('/:id/confirm', authorize('PROVIDER'), validateConfirmBooking, loadBooking, isAssignedProvider, confirmBooking);

router.patch('/:bookingId/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);
router.post('/:bookingId/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);
router.patch('/:id/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);
router.post('/:id/decline', authorize('PROVIDER'), validateDeclineBooking, loadBooking, isAssignedProvider, declineBooking);

// Provider / Staff / Admin - My Bookings & Progress Tracking (UC-38)
router.get('/provider/me', authorize('PROVIDER'), getMyProviderBookings);
router.get('/customer/me', authorize('CUSTOMER'), getMyCustomerBookings);
router.patch('/:id/status', authorize('PROVIDER', 'STAFF', 'ADMIN'), validateStatusUpdate, loadBooking, canUpdateBookingStatus, updateServiceStatus);

// Customer & Staff - Schedule Operations
router.patch('/:id/reschedule', authorize('CUSTOMER', 'STAFF', 'ADMIN'), validateCustomerReschedule, loadBooking, canManageBookingSchedule, rescheduleCustomerBooking);
router.post('/:id/reschedule', authorize('CUSTOMER', 'STAFF', 'ADMIN'), validateCustomerReschedule, loadBooking, canManageBookingSchedule, rescheduleCustomerBooking);
router.post('/:id/cancel', authorize('CUSTOMER', 'STAFF', 'ADMIN'), validateCustomerCancellation, loadBooking, canManageBookingSchedule, cancelCustomerBooking);
router.patch('/:id/cancel', authorize('CUSTOMER', 'STAFF', 'ADMIN'), validateCustomerCancellation, loadBooking, canManageBookingSchedule, cancelCustomerBooking);

// Customer - Confirm Direct/Cash Payment (Phương án 1)
router.post('/:id/confirm-payment', authorize('CUSTOMER'), validateConfirmPayment, loadBooking, isOwningCustomer, confirmCustomerPayment);
router.patch('/:id/confirm-payment', authorize('CUSTOMER'), validateConfirmPayment, loadBooking, isOwningCustomer, confirmCustomerPayment);

// Shared
router.get('/:id', loadBooking, isBookingParticipant, getBookingById);

router.use(handleAppError);

module.exports = router;
