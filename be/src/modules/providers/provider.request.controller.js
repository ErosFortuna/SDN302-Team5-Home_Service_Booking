import ServiceRequest, { INCOMING_REQUEST_STATUSES } from "../requests/request.model.js";
import Quote from "../quotes/quote.model.js";
// Registered for populate(): service / category / customer
import "../services/service.model.js";
import "../categories/service-category.model.js";
import "../users/user.model.js";
import { AppError } from "../../shared/app-error.js";
import { INCOMING_SORTS } from "../../middlewares/provider.validation.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toId = (value) => value?.toString();

/** Case-insensitive exact match of district OR city against the provider's service areas. */
function buildAreaFilter(serviceAreas = []) {
  const patterns = serviceAreas.filter(Boolean).map((a) => new RegExp(`^\\s*${escapeRegex(a.trim())}\\s*$`, "i"));
  if (!patterns.length) return null;
  return { $or: [{ "address.district": { $in: patterns } }, { "address.city": { $in: patterns } }] };
}

/**
 * Public shape of a request as seen by a provider BEFORE being hired.
 * Customer contact details (phone, email, recipient) are intentionally hidden.
 */
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
  const profile = req.providerProfile;
  const { page, limit, category, sort, area } = req.incomingQuery;

  const skills = (profile.skills ?? []).filter((c) => c && c.isActive !== false);
  const skillIds = skills.map((c) => toId(c._id));
  const matchedCategories = skills.map((c) => ({ id: toId(c._id), name: c.name, slug: c.slug, iconUrl: c.iconUrl }));
  const baseMeta = { page, limit, sort, area, matchedCategories, serviceAreas: profile.serviceAreas ?? [] };

  // No skills configured → nothing can match. Not an error: the UI shows a guided empty state.
  if (!skillIds.length) {
    return res.json({ success: true, data: [], meta: { ...baseMeta, total: 0, totalPages: 0, reason: "NO_SKILLS" } });
  }
  if (category && !skillIds.includes(category)) {
    throw new AppError(400, "Danh mục này không nằm trong kỹ năng của bạn", [{ field: "category", message: "not in your skills" }]);
  }

  const now = new Date();
  const conditions = [
    { status: { $in: INCOMING_REQUEST_STATUSES } },
    { category: { $in: category ? [category] : skillIds } },
    { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
  ];
  if (area === "mine") {
    const areaFilter = buildAreaFilter(profile.serviceAreas);
    if (areaFilter) conditions.push(areaFilter);
  }
  const filter = { $and: conditions };

  const [docs, total] = await Promise.all([
    ServiceRequest.find(filter)
      .sort(INCOMING_SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("service", "name pricingType basePrice")
      .populate("category", "name slug iconUrl")
      .populate("customer", "fullName avatarUrl")
      .lean(),
    ServiceRequest.countDocuments(filter),
  ]);

  // Flag requests this provider has already quoted (one query, no N+1).
  const quoted = docs.length
    ? await Quote.find({ provider: req.user._id, request: { $in: docs.map((d) => d._id) } }).select("request").lean()
    : [];
  const quotedIds = new Set(quoted.map((q) => toId(q.request)));

  res.json({
    success: true,
    data: docs.map((d) => toIncomingRequestDTO(d, quotedIds)),
    meta: { ...baseMeta, total, totalPages: Math.ceil(total / limit) },
  });
}
