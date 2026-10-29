const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const User = require('../users/user.model.js');
const ProviderProfile = require('./provider.model.js');
const ServiceRequest = require('../requests/request.model.js');
const Service = require('../services/service.model.js');
const ServiceCategory = require('../categories/service-category.model.js');
const Booking = require('../bookings/booking.model.js');
const Availability = require('../availability/availability.model.js');
const { BOOKING_STATUS } = require('../bookings/booking.status.js');
const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');
const {
  haversineKm,
  evaluateScheduleMatch,
  scoreProvider,
} = require('./provider.matching.js');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Rate limiter for provider search endpoint (NFR-03).
 */
const searchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Bạn đã thực hiện quá nhiều lượt tìm kiếm. Vui lòng thử lại sau 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Checks whether a provider profile matches the customer's city or district
 * as a geographic fallback when exact GPS coordinates are unavailable.
 */
function matchesServiceArea(profile, district, city) {
  const areas = (profile.serviceAreas || []).map((a) => String(a).trim().toLowerCase());
  const profileCity = profile.city ? String(profile.city).trim().toLowerCase() : null;

  const targetCity = city ? String(city).trim().toLowerCase() : null;
  const targetDistrict = district ? String(district).trim().toLowerCase() : null;

  if (targetCity && profileCity && (profileCity.includes(targetCity) || targetCity.includes(profileCity))) {
    return true;
  }

  for (const area of areas) {
    if (targetDistrict && (area.includes(targetDistrict) || targetDistrict.includes(area))) {
      return true;
    }
    if (targetCity && (area.includes(targetCity) || targetCity.includes(area))) {
      return true;
    }
  }

  return false;
}

/**
 * GET /api/requests/:requestId/recommended-providers
 * (Also available at /api/service-requests/:requestId/recommended-providers)
 *
 * Find & recommend best matching providers for an OPEN or QUOTED service request.
 */
async function getRecommendedProviders(req, res) {
  const { requestId } = req.params;
  const { limit, radiusKm, sortBy } = req.recommendedQuery;

  if (!isObjectId(requestId)) {
    throw new AppError(400, 'Mã yêu cầu không hợp lệ');
  }

  const request = await ServiceRequest.findById(requestId)
    .populate('service', 'name category basePrice pricingType')
    .populate('category', 'name slug')
    .lean();

  if (!request) {
    throw new AppError(404, 'Không tìm thấy yêu cầu dịch vụ');
  }

  // NFR-04: Authorization - only the customer who created the request may get recommendations
  if (request.customer.toString() !== req.user._id.toString()) {
    throw new AppError(403, 'Bạn không có quyền xem gợi ý thợ cho yêu cầu dịch vụ này');
  }

  // Request status guard: only OPEN or QUOTED requests can receive provider recommendations
  if (!['OPEN', 'QUOTED'].includes(request.status)) {
    throw new AppError(400, 'Chỉ gợi ý thợ cho yêu cầu đang ở trạng thái OPEN hoặc QUOTED', {
      currentStatus: request.status,
    });
  }

  // Resolve target skill category ID
  let targetCategoryId = null;
  if (request.category?._id) {
    targetCategoryId = request.category._id.toString();
  } else if (request.service?.category) {
    targetCategoryId = request.service.category.toString();
  } else if (request.service) {
    const svcDoc = await Service.findById(request.service).select('category').lean();
    if (svcDoc?.category) targetCategoryId = svcDoc.category.toString();
  }

  if (!targetCategoryId) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      message: 'Yêu cầu chưa xác định được danh mục dịch vụ phù hợp',
    });
  }

  // Step A: Hard Filters
  // 1. User.role = PROVIDER, User.status = ACTIVE
  // 2. ProviderProfile.verificationStatus = VERIFIED
  // 3. ProviderProfile.skills contains targetCategoryId
  const candidateProfiles = await ProviderProfile.find({
    verificationStatus: 'VERIFIED',
    skills: new mongoose.Types.ObjectId(targetCategoryId),
  })
    .populate({
      path: 'user',
      match: { role: 'PROVIDER', status: 'ACTIVE' },
      select: 'fullName avatarUrl status role', // NFR-02: Strictly omit email, phone, passwordHash, googleSubject
    })
    .lean();

  // Filter out profiles whose user account is inactive, blocked, or not PROVIDER
  const activeProfiles = candidateProfiles.filter((p) => p.user && p.user.status === 'ACTIVE');

  if (activeProfiles.length === 0) {
    return res.json({
      success: true,
      count: 0,
      data: [],
    });
  }

  // 4. Distance / Location filter
  const reqCoords = request.address?.location?.coordinates; // [lng, lat]
  const reqCity = request.address?.city;
  const reqDistrict = request.address?.district;

  const eligibleByLocation = [];
  const distanceMap = new Map();

  for (const profile of activeProfiles) {
    const provCoords = profile.location?.coordinates;

    if (
      Array.isArray(reqCoords) && reqCoords.length === 2 &&
      Array.isArray(provCoords) && provCoords.length === 2
    ) {
      const dist = haversineKm(reqCoords[1], reqCoords[0], provCoords[1], provCoords[0]);
      if (dist <= radiusKm) {
        eligibleByLocation.push(profile);
        distanceMap.set(profile._id.toString(), dist);
      }
    } else {
      // Fallback: match by city/district in serviceAreas or city field
      if (matchesServiceArea(profile, reqDistrict, reqCity)) {
        eligibleByLocation.push(profile);
        distanceMap.set(profile._id.toString(), null);
      }
    }
  }

  if (eligibleByLocation.length === 0) {
    return res.json({
      success: true,
      count: 0,
      data: [],
    });
  }

  // 5. Check Availability & Active Booking Conflicts (Batch querying, avoiding N+1)
  const candidateUserIds = eligibleByLocation.map((p) => p.user._id);

  const [activeBookings, availabilities, historicalAggregates] = await Promise.all([
    // Overlapping bookings: existing.start < new.end && existing.end > new.start
    // excluding CANCELLED, COMPLETED, NO_SHOW
    Booking.find({
      provider: { $in: candidateUserIds },
      scheduledStartAt: { $lt: request.preferredEndAt },
      scheduledEndAt: { $gt: request.preferredStartAt },
      status: {
        $nin: [
          BOOKING_STATUS.CANCELLED,
          BOOKING_STATUS.COMPLETED,
          BOOKING_STATUS.NO_SHOW,
        ],
      },
    })
      .select('provider scheduledStartAt scheduledEndAt status')
      .lean(),

    // Availability rules
    Availability.find({
      provider: { $in: candidateUserIds },
    }).lean(),

    // Historical average booking price for budget calculation
    Booking.aggregate([
      {
        $match: {
          provider: { $in: candidateUserIds },
          status: BOOKING_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: '$provider',
          avgPrice: { $avg: '$price' },
        },
      },
    ]),
  ]);

  // Index active bookings and availabilities by provider User ObjectId string
  const bookingsByProvider = new Map();
  for (const b of activeBookings) {
    const pid = b.provider.toString();
    if (!bookingsByProvider.has(pid)) bookingsByProvider.set(pid, []);
    bookingsByProvider.get(pid).push(b);
  }

  const availByProvider = new Map();
  for (const a of availabilities) {
    const pid = a.provider.toString();
    if (!availByProvider.has(pid)) availByProvider.set(pid, []);
    availByProvider.get(pid).push(a);
  }

  const historicalPriceMap = new Map(
    historicalAggregates.map((h) => [h._id.toString(), h.avgPrice])
  );

  // Step B: Filter by Schedule & Score Providers
  const scoredProviders = [];

  for (const profile of eligibleByLocation) {
    const userIdStr = profile.user._id.toString();
    const providerBookings = bookingsByProvider.get(userIdStr) || [];
    const providerAvails = availByProvider.get(userIdStr) || [];

    const scheduleEvaluation = evaluateScheduleMatch(
      request.preferredStartAt,
      request.preferredEndAt,
      providerAvails,
      providerBookings
    );

    // Hard filter: drop if booking conflict or marked unavailable by EXCEPTION / schedule
    if (!scheduleEvaluation.isEligible) {
      continue;
    }

    const distanceKm = distanceMap.get(profile._id.toString());
    const historicalPrice = historicalPriceMap.get(userIdStr) || null;

    const scoringResult = scoreProvider(profile, request, {
      radiusKm,
      distanceKm,
      historicalPrice,
      serviceBasePrice: request.service?.basePrice || 0,
      scheduleScore: scheduleEvaluation.scheduleScore,
      scheduleMatchType: scheduleEvaluation.matchType,
    });

    // Public shape (NFR-02: Strictly omit passwordHash, googleSubject, email, phone)
    scoredProviders.push({
      providerId: userIdStr,
      fullName: profile.user.fullName,
      businessName: profile.businessName || profile.user.fullName,
      avatarUrl: profile.user.avatarUrl || null,
      averageRating: profile.averageRating,
      reviewCount: profile.reviewCount,
      completedJobCount: profile.completedJobCount,
      yearsOfExperience: profile.yearsOfExperience,
      distanceKm: distanceKm != null ? distanceKm : null,
      score: scoringResult.score,
      scoreBreakdown: scoringResult.scoreBreakdown,
      reasons: scoringResult.reasons,
    });
  }

  // Sort
  if (sortBy === 'rating') {
    scoredProviders.sort(
      (a, b) => b.averageRating - a.averageRating || b.score - a.score
    );
  } else if (sortBy === 'distance') {
    scoredProviders.sort(
      (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || b.score - a.score
    );
  } else {
    // Default: 'score'
    scoredProviders.sort((a, b) => b.score - a.score);
  }

  const results = scoredProviders.slice(0, limit);

  return res.json({
    success: true,
    count: results.length,
    data: results,
  });
}

/**
 * GET /api/providers/search
 * Authenticated public search for providers.
 */
async function searchProviders(req, res) {
  const {
    serviceId,
    categoryId,
    city,
    lat,
    lng,
    radiusKm,
    minRating,
    page,
    limit,
  } = req.searchQuery;

  let targetCategoryId = categoryId;
  if (!targetCategoryId && serviceId) {
    const svc = await Service.findById(serviceId).select('category').lean();
    if (svc?.category) targetCategoryId = svc.category.toString();
  }

  const filter = {
    verificationStatus: 'VERIFIED',
  };

  if (targetCategoryId) {
    filter.skills = new mongoose.Types.ObjectId(targetCategoryId);
  }

  if (minRating != null) {
    filter.averageRating = { $gte: minRating };
  }

  const profiles = await ProviderProfile.find(filter)
    .populate({
      path: 'user',
      match: { role: 'PROVIDER', status: 'ACTIVE' },
      select: 'fullName avatarUrl status role', // NFR-02
    })
    .lean();

  const activeProfiles = profiles.filter((p) => p.user && p.user.status === 'ACTIVE');

  // Filter by location or city if requested
  const hasCoords = lat != null && lng != null;
  const filtered = [];

  for (const profile of activeProfiles) {
    let distanceKm = null;
    const pCoords = profile.location?.coordinates;

    if (hasCoords && Array.isArray(pCoords) && pCoords.length === 2) {
      distanceKm = haversineKm(lat, lng, pCoords[1], pCoords[0]);
      if (distanceKm > radiusKm) {
        continue;
      }
    } else if (city) {
      if (!matchesServiceArea(profile, null, city)) {
        continue;
      }
    }

    filtered.push({
      providerId: profile.user._id.toString(),
      fullName: profile.user.fullName,
      businessName: profile.businessName || profile.user.fullName,
      avatarUrl: profile.user.avatarUrl || null,
      averageRating: profile.averageRating,
      reviewCount: profile.reviewCount,
      completedJobCount: profile.completedJobCount,
      yearsOfExperience: profile.yearsOfExperience,
      city: profile.city || (profile.serviceAreas && profile.serviceAreas[0]) || null,
      serviceAreas: profile.serviceAreas || [],
      distanceKm,
    });
  }

  // Sort by average rating descending, then completed jobs descending
  filtered.sort((a, b) => b.averageRating - a.averageRating || b.completedJobCount - a.completedJobCount);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedData = filtered.slice((page - 1) * limit, page * limit);

  return res.json({
    success: true,
    data: paginatedData,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

module.exports = {
  searchRateLimiter,
  getRecommendedProviders,
  searchProviders,
};
