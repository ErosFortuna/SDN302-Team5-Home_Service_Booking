const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const User = require('../users/user.model.js');
const ProviderProfile = require('./provider.model.js');
const ServiceRequest = require('../requests/request.model.js');
const Service = require('../services/service.model.js');
const ServiceCategory = require('../categories/service-category.model.js');
const Booking = require('../bookings/booking.model.js');
const Review = require('../reviews/review.model.js');
const Availability = require('../availability/availability.model.js');
const { BOOKING_STATUS } = require('../bookings/booking.status.js');
const { env } = require('../../config/env.js');
const { AppError } = require('../../shared/app-error.js');
const { isObjectId } = require('../../shared/validators.js');
const {
  haversineKm,
  evaluateScheduleMatch,
  scoreProvider,
  matchesServiceArea,
  isProviderEligibleForRequest,
} = require('./provider.matching.js');
const { escapeRegex } = require('../../shared/regex.js');

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
 * GET /api/requests/:requestId/recommended-providers
 * (Also available at /api/service-requests/:requestId/recommended-providers)
 *
 * Find & recommend best matching providers for an OPEN service request.
 */
async function getRecommendedProviders(req, res) {
  const { requestId } = req.params;
  const { limit, radiusKm, sortBy } = req.recommendedQuery;

  if (!isObjectId(requestId)) {
    throw new AppError(400, 'Mã yêu cầu không hợp lệ');
  }

  const request = await ServiceRequest.findById(requestId)
    .populate('service', 'name category basePrice pricingType estimatedDurationMinutes')
    .populate('category', 'name slug')
    .lean();

  if (!request) {
    throw new AppError(404, 'Không tìm thấy yêu cầu dịch vụ');
  }

  // Authorization: STAFF / ADMIN can view recommendations for dispatch; CUSTOMER owner can view for self-select
  const callerRole = req.user?.role || 'STAFF';
  const isPrivileged = ['STAFF', 'ADMIN'].includes(callerRole);
  const isOwner = request.customer && (request.customer._id || request.customer).toString() === req.user?._id?.toString();
  if (!isPrivileged && !isOwner) {
    throw new AppError(403, 'Bạn không có quyền xem gợi ý thợ cho yêu cầu này');
  }

  // Request status guard: only OPEN requests can receive provider recommendations
  if (request.status !== 'OPEN') {
    throw new AppError(400, 'Chỉ gợi ý thợ cho yêu cầu đang ở trạng thái OPEN', {
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

  // Step A: Hard Filters (V-24 item 2)
  // 1. User.role = PROVIDER, User.status = ACTIVE
  // 2. ProviderProfile.verificationStatus = VERIFIED
  // 3. ProviderProfile.skills contains targetCategoryId
  const activeProviders = await User.find({ role: 'PROVIDER', status: 'ACTIVE' })
    .select('_id')
    .lean();
  const activeUserIds = (activeProviders || []).map((u) => u._id);

  // Configurable candidate ceiling (V-24): do NOT cut by rating before distance/schedule matching
  const maxRecommendedCandidates = env.providerRecommendMaxCandidates || 200;
  const candidateProfiles = await ProviderProfile.find({
    verificationStatus: 'VERIFIED',
    isDeleted: { $ne: true },
    skills: new mongoose.Types.ObjectId(targetCategoryId),
    user: { $in: activeUserIds },
  })
    .populate({
      path: 'user',
      match: { role: 'PROVIDER', status: 'ACTIVE' },
      select: 'fullName avatarUrl status role', // NFR-02: Strictly omit email, phone, passwordHash, googleSubject
    })
    .limit(maxRecommendedCandidates)
    .lean();

  // Filter out profiles whose user account is inactive, blocked, or not PROVIDER
  const declinedIds = new Set((request.declinedProviders || []).map((id) => id.toString()));
  const activeProfiles = candidateProfiles.filter((p) => p.user && p.user.status === 'ACTIVE' && !declinedIds.has(p.user._id.toString()));

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
  const scheduleStartAt = new Date(request.preferredStartAt);
  const serviceDurationMinutes = request.service?.estimatedDurationMinutes || 60;
  const scheduleEndAt = new Date(scheduleStartAt.getTime() + serviceDurationMinutes * 60000);
  const earliestRelevantBookingEndAt = new Date(scheduleStartAt.getTime() - 180 * 60000);

  const [activeBookings, availabilities, historicalAggregates] = await Promise.all([
    // Include the maximum configured travel buffer before the requested start.
    Booking.find({
      provider: { $in: candidateUserIds },
      scheduledStartAt: { $lt: scheduleEndAt },
      scheduledEndAt: { $gt: earliestRelevantBookingEndAt },
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
      scheduleStartAt,
      scheduleEndAt,
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
      basePrice: request.service?.basePrice || 0,
      expectedPrice: request.service?.basePrice || 0,
      pricingType: request.service?.pricingType || 'FIXED',
      isFrom: request.service?.pricingType === 'FROM',
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
    keyword,
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

  // 1. Filter active providers first (V-24 item 1)
  const activeProviders = await User.find({ role: 'PROVIDER', status: 'ACTIVE' })
    .select('_id fullName')
    .lean();
  const activeUserIds = (activeProviders || []).map((u) => u._id);

  // Hard filter pushed down to MongoDB (V-24):
  const filter = {
    verificationStatus: 'VERIFIED',
    isDeleted: { $ne: true },
    user: { $in: activeUserIds },
  };

  if (targetCategoryId) {
    filter.skills = new mongoose.Types.ObjectId(targetCategoryId);
  }

  // Push minRating filter down to MongoDB using stored averageRating (V-24 item 1 & 3)
  if (minRating != null) {
    filter.averageRating = { $gte: minRating };
  }

  // Push location/city filter down to MongoDB (V-24) when coordinates are not provided.
  const hasCoords = lat != null && lng != null;
  if (!hasCoords && city) {
    const cleanCity = city.trim().replace(/^(thành phố|tp\.?|tỉnh)\s+/i, '').trim();
    const cityPattern = escapeRegex(cleanCity || city.trim());
    const cityRegex = new RegExp(cityPattern, 'i');
    filter.$or = [{ city: cityRegex }, { serviceAreas: cityRegex }];
  }

  // Push keyword matching to MongoDB if provided
  if (keyword) {
    const kw = keyword.toLowerCase();
    const kwPattern = escapeRegex(keyword.trim());
    const kwRegex = new RegExp(kwPattern, 'i');

    const nameMatchedUserIds = (activeProviders || [])
      .filter((u) => u.fullName && u.fullName.toLowerCase().includes(kw))
      .map((u) => u._id);

    let categoryMatchedIds = [];
    try {
      const matchingCategories = await ServiceCategory.find({
        name: kwRegex,
      }).select('_id').lean();
      categoryMatchedIds = (matchingCategories || []).map((c) => c._id);
    } catch {
      categoryMatchedIds = [];
    }

    const keywordOr = [
      { businessName: kwRegex },
      { city: kwRegex },
      { serviceAreas: kwRegex },
      { user: { $in: nameMatchedUserIds } },
      { skills: { $in: categoryMatchedIds } },
      { serviceCategories: { $in: categoryMatchedIds } },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: keywordOr }];
      delete filter.$or;
    } else {
      filter.$or = keywordOr;
    }
  }

  // Configurable candidate ceiling read ONLY via env.js (V-24 item 1 & 5)
  const configuredMaxCandidates = env.providerSearchMaxCandidates || 100;
  const candidateLimit = Math.max(configuredMaxCandidates, page * limit);

  let query = ProviderProfile.find(filter)
    .populate({
      path: 'user',
      match: { role: 'PROVIDER', status: 'ACTIVE' },
      select: 'fullName avatarUrl status role', // NFR-02
    })
    .populate({ path: 'skills', select: 'name slug' })
    .populate({ path: 'serviceCategories', select: 'name slug' });

  // Only sort by rating at DB if we do NOT need in-memory radius filtering.
  // When radius/coords filtering is active in memory, do NOT limit by rating (V-24 item 1).
  if (!hasCoords) {
    query = query.sort({ averageRating: -1, completedJobCount: -1 });
  }

  query = query.limit(candidateLimit);

  const profiles = await query.lean();
  const isTruncated = profiles.length >= candidateLimit;

  const activeProfiles = profiles.filter((p) => p.user && p.user.status === 'ACTIVE');

  // Filter by location or city if requested
  const filtered = [];

  for (const profile of activeProfiles) {
    const averageRating = profile.averageRating ?? 0;
    const reviewCount = profile.reviewCount ?? 0;
    const completedJobCount = profile.completedJobCount ?? 0;

    const searchableText = [
      profile.businessName,
      profile.user.fullName,
      profile.city,
      ...(profile.serviceAreas || []),
      ...(profile.skills || []).map((skill) => skill?.name),
      ...(profile.serviceCategories || []).map((category) => category?.name),
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    if (keyword && !searchableText.includes(keyword.toLocaleLowerCase())) continue;
    if (minRating != null && averageRating < minRating) continue;

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
      averageRating,
      reviewCount,
      completedJobCount,
      yearsOfExperience: profile.yearsOfExperience,
      skills: [...new Set([
        ...(profile.skills || []).map((skill) => skill?.name),
        ...(profile.serviceCategories || []).map((category) => category?.name),
      ].filter(Boolean))],
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
      ...(isTruncated ? { truncated: true } : {}),
    },
  });
}

module.exports = {
  searchRateLimiter,
  getRecommendedProviders,
  searchProviders,
  matchesServiceArea,
  isProviderEligibleForRequest,
};
