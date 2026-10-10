const mongoose = require('mongoose');
const Booking = require('./booking.model.js');
const { AppError } = require('../../shared/app-error.js');

const isSameId = (a, b) => Boolean(a && b) && a.toString() === b.toString();

/** Loads `req.params.id` into `req.booking` (400 on bad id, 404 if missing). */
async function loadBooking(req, res, next) {
  const { id } = req.params;
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

/** Only the CUSTOMER who owns this booking may continue. */
function isBookingCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'CUSTOMER' || !isSameId(req.booking && req.booking.customer, req.user._id)) {
    throw new AppError(403, 'You are not the customer of this booking');
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

module.exports = { loadBooking, isAssignedProvider, isBookingCustomer, isBookingParticipant };
