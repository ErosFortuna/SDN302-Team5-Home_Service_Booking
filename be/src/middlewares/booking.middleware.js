import mongoose from "mongoose";
import Booking from "../modules/bookings/booking.model.js";
import { AppError } from "../shared/app-error.js";

const isSameId = (a, b) => Boolean(a && b) && a.toString() === b.toString();

/** Loads `req.params.id` into `req.booking` (400 on bad id, 404 if missing). */
export async function loadBooking(req, _res, next) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Invalid booking id");

  const booking = await Booking.findById(id);
  if (!booking) throw new AppError(404, "Booking not found");

  req.booking = booking;
  next();
}

/** Only the PROVIDER assigned to this booking may continue. Requires `protect` + `loadBooking`. */
export function isAssignedProvider(req, _res, next) {
  if (req.user?.role !== "PROVIDER") {
    throw new AppError(403, "Only service providers can perform this action");
  }
  if (!isSameId(req.booking?.provider, req.user._id)) {
    throw new AppError(403, "You are not the provider assigned to this booking");
  }
  next();
}

/** Only the CUSTOMER who owns this booking may continue. */
export function isBookingCustomer(req, _res, next) {
  if (req.user?.role !== "CUSTOMER" || !isSameId(req.booking?.customer, req.user._id)) {
    throw new AppError(403, "You are not the customer of this booking");
  }
  next();
}

/** Assigned provider, owning customer, or back-office (STAFF / ADMIN). */
export function isBookingParticipant(req, _res, next) {
  const { user, booking } = req;
  const allowed =
    ["STAFF", "ADMIN"].includes(user?.role) ||
    isSameId(booking?.provider, user?._id) ||
    isSameId(booking?.customer, user?._id);

  if (!allowed) throw new AppError(403, "You do not have access to this booking");
  next();
}
