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
<<<<<<< HEAD
function toIncomingRequestDTO(doc, quotedIds) {
  const { address = {}, service, category, customer } = doc;
  return {
    id: toId(doc._id),
    status: doc.status,
    service: service ? { id: toId(service._id), name: service.name, pricingType: service.pricingType, basePrice: service.basePrice } : null,
    category: category ? { id: toId(category._id), name: category.name, slug: category.slug, iconUrl: category.iconUrl } : null,
    customer: customer ? { id: toId(customer._id), fullName: customer.fullName, avatarUrl: customer.avatarUrl } : null,
    description: doc.description,
    address: { addressLine: address.addressLine, ward: address.ward, district: address.district, city: address.city },
    preferredStartAt: doc.preferredStartAt,
    preferredEndAt: doc.preferredEndAt,
    budgetMin: doc.budgetMin,
    budgetMax: doc.budgetMax,
    photos: doc.attachments ?? [],
    aiAnalysis: doc.aiAnalysis ?? null,
    hasQuoted: quotedIds.has(toId(doc._id)),
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
  };
}

/**
 * GET /api/provider/requests/incoming   (UC-35 View Incoming Requests)
 *
 * Basic matching: status ∈ {REQUESTED, MATCHING}  AND  category ∈ provider.skills (active only)
 *                 AND not expired  [AND district/city ∈ provider.serviceAreas when area=mine].
 * Requires `isApprovedProvider` (→ req.providerProfile) and `validateIncomingQuery` (→ req.incomingQuery).
 */
export async function getIncomingRequests(req, res) {
=======
async function getIncomingRequests(req, res) {
>>>>>>> development
  const profile = req.providerProfile;
  const { page, limit } = req.incomingQuery;

<<<<<<< HEAD
  const skills = (profile.skills ?? []).filter((c) => c && c.isActive !== false);
  const skillIds = skills.map((c) => toId(c._id));
  const matchedCategories = skills.map((c) => ({ id: toId(c._id), name: c.name, slug: c.slug, iconUrl: c.iconUrl }));
  const baseMeta = { page, limit, sort, area, matchedCategories, serviceAreas: profile.serviceAreas ?? [] };
=======
  const filter = {
    provider: req.user._id,
    status: "PENDING_CONFIRMATION",
  };
>>>>>>> development

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
