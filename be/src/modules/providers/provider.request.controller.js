const Booking = require("../bookings/booking.model.js");
const ServiceRequest = require("../requests/request.model.js");
require("../services/service.model.js");
require("../categories/service-category.model.js");
require("../users/user.model.js");
const { AppError } = require("../../shared/app-error.js");

/** Assigned bookings awaiting confirmation from this provider. */
const INCOMING_REQUEST_STATUSES = Object.freeze(["PENDING_CONFIRMATION"]);

const toId = (value) => value?.toString();

/**
 * GET /api/provider/requests/incoming
 * Returns bookings assigned to this provider that are PENDING_CONFIRMATION.
 * Requires `isVerifiedProvider` (→ req.providerProfile) and `validateIncomingQuery` (→ req.incomingQuery).
 */
async function getIncomingRequests(req, res) {
  const profile = req.providerProfile;
  const { page, limit } = req.incomingQuery;

  const filter = {
    provider: req.user._id,
    status: "PENDING_CONFIRMATION",
  };

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("service", "name pricingType basePrice estimatedDurationMinutes")
      .populate("customer", "fullName avatarUrl phone")
      .populate({
        path: "request",
        populate: { path: "category", select: "name slug iconUrl" },
      })
      .lean(),
    Booking.countDocuments(filter),
  ]);

  const data = bookings.map((b) => ({
    id: toId(b._id),
    bookingId: toId(b._id),
    requestId: toId(b.request?._id || b.request),
    status: b.status,
    service: b.service
      ? {
          id: toId(b.service._id),
          name: b.service.name,
          pricingType: b.service.pricingType,
          basePrice: b.service.basePrice,
        }
      : null,
    category: b.request?.category
      ? {
          id: toId(b.request.category._id),
          name: b.request.category.name,
          slug: b.request.category.slug,
          iconUrl: b.request.category.iconUrl,
        }
      : null,
    customer: b.customer
      ? {
          id: toId(b.customer._id),
          fullName: b.customer.fullName,
          avatarUrl: b.customer.avatarUrl,
        }
      : null,
    description: b.request?.description || "",
    address: b.address,
    scheduledStartAt: b.scheduledStartAt,
    scheduledEndAt: b.scheduledEndAt,
    preferredStartAt: b.scheduledStartAt,
    preferredEndAt: b.scheduledEndAt,
    price: b.price,
    photos: b.request?.attachments || [],
    createdAt: b.createdAt,
  }));

  res.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      serviceAreas: profile.serviceAreas ?? [],
    },
  });
}

module.exports = { getIncomingRequests, INCOMING_REQUEST_STATUSES };
