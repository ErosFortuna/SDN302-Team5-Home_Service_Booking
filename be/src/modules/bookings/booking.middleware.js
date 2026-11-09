const mongoose = require('mongoose');
const Booking = require('./booking.model.js');
const { AppError } = require('../../shared/app-error.js');

const isSameId = (a, b) => Boolean(a && b) && a.toString() === b.toString();

/** Loads `req.params.bookingId || req.params.id` into `req.booking` (400 on bad id, 404 if missing). */
async function loadBooking(req, res, next) {
  const id = req.params.bookingId || req.params.id;
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid booking id');

  const booking = await Booking.findById(id);
  if (!booking) throw new AppError(404, 'Booking not found');

  req.booking = booking;
  next();
}

/** Only the PROVIDER assigned to this booking may continue. Requires `protect` + `loadBooking`. */
function isAssignedProvider(req, res, next) {
  if (!req.user || req.user.role !== 'PROVIDER') {
    throw new AppError(403, 'Only service providers can perform this action');
  }
  if (!isSameId(req.booking && req.booking.provider, req.user._id)) {
    throw new AppError(403, 'You are not the provider assigned to this booking');
  }
  next();
}

/** Assigned provider, owning customer, or back-office (STAFF / ADMIN). */
function isBookingParticipant(req, res, next) {
  const { user, booking } = req;
  const allowed =
    ['STAFF', 'ADMIN'].includes(user && user.role) ||
    isSameId(booking && booking.provider, user && user._id) ||
    isSameId(booking && booking.customer, user && user._id);

  if (!allowed) throw new AppError(403, 'You do not have access to this booking');
  next();
}

/** Owning customer OR back-office (STAFF / ADMIN). */
function canManageBookingSchedule(req, res, next) {
  const { user, booking } = req;
  const isPrivileged = ['STAFF', 'ADMIN'].includes(user && user.role);
  const isOwner = isSameId(booking && booking.customer, user && user._id);
  if (!isPrivileged && !isOwner) {
    throw new AppError(403, 'You do not have permission to manage this booking schedule');
  }
  next();
}

/** Assigned provider OR back-office (STAFF / ADMIN). */
function canUpdateBookingStatus(req, res, next) {
  const { user, booking } = req;
  const isPrivileged = ['STAFF', 'ADMIN'].includes(user && user.role);
  const isAssigned = user && user.role === 'PROVIDER' && isSameId(booking && booking.provider, user._id);

  if (!isPrivileged && !isAssigned) {
    if (user && user.role === 'PROVIDER') {
      throw new AppError(403, 'You are not the provider assigned to this booking');
    }
    throw new AppError(403, 'You do not have permission to update this booking status');
  }
  next();
}

/** Only the owning CUSTOMER of this booking may continue. */
function isOwningCustomer(req, res, next) {
  const { user, booking } = req;
  if (!user || user.role !== 'CUSTOMER') {
    throw new AppError(403, 'Chỉ khách hàng mới có quyền thực hiện thao tác này');
  }
  if (!isSameId(booking && booking.customer, user._id)) {
    throw new AppError(403, 'Bạn không phải là khách hàng của đơn đặt này');
  }
  next();
}

module.exports = {
  loadBooking,
  isAssignedProvider,
  canUpdateBookingStatus,
  isOwningCustomer,
  isBookingParticipant,
  canManageBookingSchedule,
};
