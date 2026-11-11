/**
 * Provider matching and ranking algorithm.
 * Pure functions for deterministic scoring and recommendation.
 */

const mongoose = require('mongoose');
const { getVietnamParts, vietnamDateKey } = require('../../shared/timezone.js');

const MATCHING_WEIGHTS = Object.freeze({
  RATING: 0.35,
  DISTANCE: 0.25,
  EXPERIENCE_AND_JOBS: 0.15,
  SCHEDULE: 0.15,
  BUDGET: 0.10,
});

const BAYESIAN_PARAMS = Object.freeze({
  PRIOR_RATING: 3.5, // C: Prior average rating mean
  MIN_REVIEWS: 5,    // m: Threshold weight for confidence
});

const EXPERIENCE_CAPS = Object.freeze({
  MAX_YEARS: 15,
  MAX_JOBS: 100,
});

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula (Earth radius ~6371 km).
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers (rounded to 2 decimal places)
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    Number.isNaN(lat1) || Number.isNaN(lon1) ||
    Number.isNaN(lat2) || Number.isNaN(lon2)
  ) {
    return NaN;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const EARTH_RADIUS_KM = 6371;
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculates a Bayesian-weighted rating score (0 - 100).
 * Prevents newly registered providers with a single 5-star review from
 * unfairly outranking seasoned providers with dozens of 4.8-star reviews.
 *
 * Formula: WR = (v * R + m * C) / (v + m)
 *
 * @param {number} averageRating (0 - 5)
 * @param {number} reviewCount
 * @returns {{ weightedRating: number, ratingScore: number }}
 */
function calculateBayesianRating(averageRating = 0, reviewCount = 0) {
  const v = Math.max(0, Number(reviewCount) || 0);
  const R = Math.max(0, Math.min(5, Number(averageRating) || 0));
  const m = BAYESIAN_PARAMS.MIN_REVIEWS;
  const C = BAYESIAN_PARAMS.PRIOR_RATING;

  const weightedRating = (v * R + m * C) / (v + m);
  const ratingScore = Math.min(100, Math.max(0, (weightedRating / 5.0) * 100));

  return {
    weightedRating: Math.round(weightedRating * 100) / 100,
    ratingScore: Math.round(ratingScore * 10) / 10,
  };
}

/**
 * Calculates distance score (0 - 100).
 * Closer providers receive higher scores; score decays to 0 at radiusKm.
 *
 * @param {number|null|undefined} distanceKm
 * @param {number} radiusKm
 * @returns {number}
 */
function calculateDistanceScore(distanceKm, radiusKm = 15) {
  if (distanceKm == null || Number.isNaN(distanceKm)) {
    // Neutral fallback score when exact coordinates are absent but area matched
    return 70;
  }
  const rad = Math.max(0.1, Number(radiusKm) || 15);
  if (distanceKm <= 0) return 100;
  if (distanceKm >= rad) return 0;

  const score = 100 * (1 - distanceKm / rad);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Calculates experience and completed job score (0 - 100) with capped normalisation.
 *
 * @param {number} yearsOfExperience
 * @param {number} completedJobCount
 * @returns {number}
 */
function calculateExperienceScore(yearsOfExperience = 0, completedJobCount = 0) {
  const years = Math.max(0, Number(yearsOfExperience) || 0);
  const jobs = Math.max(0, Number(completedJobCount) || 0);

  const normYears = Math.min(1, years / EXPERIENCE_CAPS.MAX_YEARS);
  const normJobs = Math.min(1, jobs / EXPERIENCE_CAPS.MAX_JOBS);

  // Equal weight: 50% experience years, 50% completed jobs count
  const score = (normYears * 0.5 + normJobs * 0.5) * 100;
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Checks schedule availability and evaluates schedule match score (0 - 100).
 *
 * @param {Date|string} preferredStartAt
 * @param {Date|string} preferredEndAt
 * @param {Array<object>} providerAvailabilities
 * @param {Array<object>} activeBookings
 * @returns {{ isEligible: boolean, scheduleScore: number, matchType: string }}
 */
function evaluateScheduleMatch(preferredStartAt, preferredEndAt, providerAvailabilities = [], activeBookings = []) {
  const reqStart = new Date(preferredStartAt);
  const reqEnd = new Date(preferredEndAt);

  if (Number.isNaN(reqStart.getTime()) || Number.isNaN(reqEnd.getTime()) || reqEnd <= reqStart) {
    return { isEligible: false, scheduleScore: 0, matchType: 'INVALID_TIME' };
  }
  const startParts = getVietnamParts(reqStart);
  const endParts = getVietnamParts(reqEnd);
  if (
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day
  ) {
    return { isEligible: false, scheduleScore: 0, matchType: 'INVALID_TIME' };
  }

  const availability = providerAvailabilities.find(
    (item) => Array.isArray(item.weeklySchedule) || Array.isArray(item.daysOff) || item.settings
  );
  const travelBufferMinutes = availability?.settings?.travelBufferMinutes ?? 30;

  // 1. Check active booking conflicts per NFR-09:
  // existing.start < new.end && existing.end > new.start
  // (ignoring CANCELLED, COMPLETED, NO_SHOW)
  for (const booking of activeBookings) {
    const bStart = new Date(booking.scheduledStartAt);
    const bEnd = new Date(booking.scheduledEndAt);
    if (!Number.isNaN(bStart.getTime()) && !Number.isNaN(bEnd.getTime())) {
      const bufferedEnd = new Date(bEnd.getTime() + travelBufferMinutes * 60000);
      if (bStart < reqEnd && bufferedEnd > reqStart) {
        return { isEligible: false, scheduleScore: 0, matchType: 'BOOKING_CONFLICT' };
      }
    }
  }

  // If no availability records exist for this provider at all, they are available by default
  if (!availability) {
    return { isEligible: true, scheduleScore: 80, matchType: 'DEFAULT' };
  }

  if (availability.settings?.isAcceptingBookings === false) {
    return { isEligible: false, scheduleScore: 0, matchType: 'NOT_ACCEPTING' };
  }

  const toMinutes = (hhmm) => {
    if (typeof hhmm !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
    const [hours, minutes] = hhmm.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const reqDayOfWeek = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day)).getUTCDay();
  const serverLocalDayOfWeek = new Date(reqStart).getDay();
  const compatibleDayOfWeeks = new Set([reqDayOfWeek, serverLocalDayOfWeek]);
  const reqStartMin = startParts.hour * 60 + startParts.minute;
  const reqEndMin = endParts.hour * 60 + endParts.minute;
  const reqDateStr = vietnamDateKey(reqStart);

  const exception = availability.daysOff?.find((item) => item.date === reqDateStr);
  let workStart;
  let workEnd;
  let breaks = [];

  if (exception) {
    if (exception.isFullDayOff) {
      return { isEligible: false, scheduleScore: 0, matchType: 'DAY_OFF' };
    }
    workStart = toMinutes(exception.customStartTime || '08:00');
    workEnd = toMinutes(exception.customEndTime || '17:00');
  } else {
    const daySchedule = availability.weeklySchedule?.find((item) => {
      const storedDay = Number(item.dayOfWeek);
      return !Number.isNaN(storedDay) && compatibleDayOfWeeks.has(storedDay);
    });
    if (!daySchedule || daySchedule.isOff) {
      return { isEligible: false, scheduleScore: 0, matchType: 'DAY_OFF' };
    }
    workStart = toMinutes(daySchedule.startTime);
    workEnd = toMinutes(daySchedule.endTime);
    breaks = daySchedule.breaks || [];
  }

  if (workStart === null || workEnd === null || reqStartMin < workStart || reqEndMin > workEnd) {
    return { isEligible: false, scheduleScore: 0, matchType: 'OUTSIDE_HOURS' };
  }

  for (const rest of breaks) {
    const restStart = toMinutes(rest.startTime);
    const restEnd = toMinutes(rest.endTime);
    if (restStart === null || restEnd === null || (reqStartMin < restEnd && reqEndMin > restStart)) {
      return { isEligible: false, scheduleScore: 0, matchType: 'BREAK_CONFLICT' };
    }
  }

  return { isEligible: true, scheduleScore: 100, matchType: 'FULL_MATCH' };
}

/**
 * Evaluates budget compatibility score (0 - 100).
 *
 * @param {number|null} historicalPrice
 * @param {number|null} budgetMin
 * @param {number|null} budgetMax
 * @param {number|null} fallbackBasePrice
 * @returns {number}
 */
function calculateBudgetScore(historicalPrice, budgetMin, budgetMax, fallbackBasePrice = 0) {
  const benchmark = historicalPrice != null && historicalPrice > 0
    ? historicalPrice
    : (fallbackBasePrice || 0);

  // If customer didn't set a budget, return standard favorable neutral score
  if (budgetMin == null && budgetMax == null) {
    return 80;
  }

  const bMin = budgetMin != null ? Number(budgetMin) : 0;
  const bMax = budgetMax != null ? Number(budgetMax) : Infinity;

  if (benchmark === 0) {
    return 80;
  }

  // Exactly within expected budget range
  if (benchmark >= bMin && benchmark <= bMax) {
    return 100;
  }

  // Below budget min: very good economic value
  if (benchmark < bMin) {
    return 95;
  }

  // Exceeds maximum budget
  if (benchmark > bMax && Number.isFinite(bMax) && bMax > 0) {
    const overPercentage = (benchmark - bMax) / bMax;
    const score = Math.max(0, 100 - overPercentage * 100);
    return Math.round(score * 10) / 10;
  }

  return 80;
}

/**
 * Generates compelling, human-readable recommendation reasons in Vietnamese.
 *
 * @param {object} params
 * @returns {Array<string>}
 */
function generateRecommendationReasons({
  distanceKm,
  averageRating = 0,
  reviewCount = 0,
  completedJobCount = 0,
  yearsOfExperience = 0,
  scheduleMatchType = 'FULL_MATCH',
  budgetScore = 80,
  city,
}) {
  const reasons = [];

  // Distance reason
  if (distanceKm != null && !Number.isNaN(distanceKm)) {
    reasons.push(`Cách ${distanceKm.toFixed(1)} km`);
  } else if (city) {
    reasons.push(`Phục vụ tại khu vực ${city}`);
  }

  // Rating reason
  if (reviewCount >= 5 && averageRating >= 4.5) {
    reasons.push(`Đánh giá xuất sắc ${averageRating.toFixed(1)}/5 từ ${reviewCount} lượt`);
  } else if (reviewCount > 0) {
    reasons.push(`Đánh giá ${averageRating.toFixed(1)}/5 từ ${reviewCount} lượt`);
  } else if (yearsOfExperience >= 2) {
    reasons.push('Thợ uy tín được xác minh');
  }

  // Schedule reason
  if (scheduleMatchType === 'FULL_MATCH') {
    reasons.push('Rảnh đúng khung giờ bạn chọn');
  } else if (scheduleMatchType === 'PARTIAL_MATCH') {
    reasons.push('Có thể sắp xếp trong ngày yêu cầu');
  }

  // Experience & jobs
  if (completedJobCount >= 20) {
    reasons.push(`Đã hoàn thành ${completedJobCount} công việc`);
  } else if (yearsOfExperience >= 3) {
    reasons.push(`${yearsOfExperience} năm kinh nghiệm trong nghề`);
  }

  // Budget
  if (budgetScore >= 90) {
    reasons.push('Mức giá phù hợp ngân sách dự kiến');
  }

  return reasons.slice(0, 4);
}

/**
 * Calculates overall match score (0 - 100) and detailed breakdown for a provider.
 *
 * @param {object} providerProfile
 * @param {object} request
 * @param {object} options
 * @returns {object}
 */
function scoreProvider(providerProfile, request, options = {}) {
  const { radiusKm = 15, distanceKm = null, historicalPrice = null } = options;

  // 1. Rating score (35%)
  const { ratingScore } = calculateBayesianRating(
    providerProfile.averageRating,
    providerProfile.reviewCount
  );

  // 2. Distance score (25%)
  const distanceScore = calculateDistanceScore(distanceKm, radiusKm);

  // 3. Experience and jobs score (15%)
  const experienceScore = calculateExperienceScore(
    providerProfile.yearsOfExperience,
    providerProfile.completedJobCount
  );

  // 4. Schedule score (15%)
  const scheduleScore = options.scheduleScore != null ? options.scheduleScore : 80;

  // 5. Budget score (10%)
  const budgetScore = calculateBudgetScore(
    historicalPrice,
    request.budgetMin,
    request.budgetMax,
    options.serviceBasePrice
  );

  const totalScore =
    ratingScore * MATCHING_WEIGHTS.RATING +
    distanceScore * MATCHING_WEIGHTS.DISTANCE +
    experienceScore * MATCHING_WEIGHTS.EXPERIENCE_AND_JOBS +
    scheduleScore * MATCHING_WEIGHTS.SCHEDULE +
    budgetScore * MATCHING_WEIGHTS.BUDGET;

  const boundedScore = Math.min(100, Math.max(0, Math.round(totalScore * 10) / 10));

  const reasons = generateRecommendationReasons({
    distanceKm,
    averageRating: providerProfile.averageRating,
    reviewCount: providerProfile.reviewCount,
    completedJobCount: providerProfile.completedJobCount,
    yearsOfExperience: providerProfile.yearsOfExperience,
    scheduleMatchType: options.scheduleMatchType || 'FULL_MATCH',
    budgetScore,
    city: providerProfile.city || (providerProfile.serviceAreas && providerProfile.serviceAreas[0]),
  });

  return {
    score: boundedScore,
    scoreBreakdown: {
      ratingScore,
      distanceScore,
      experienceScore,
      scheduleScore,
      budgetScore,
    },
    reasons,
  };
}

/**
 * Checks if a geographic or administrative area matches the provider's service areas or city.
 *
 * @param {object} profile Provider profile document
 * @param {string|null} district
 * @param {string|null} city
 * @returns {boolean}
 */
function matchesServiceArea(profile, district, city) {
  const areas = (profile?.serviceAreas || []).map((a) => String(a).trim().toLowerCase());
  const profileCity = profile?.city ? String(profile.city).trim().toLowerCase() : null;

  const targetCity = city ? String(city).trim().toLowerCase() : null;
  const targetDistrict = district ? String(district).trim().toLowerCase() : null;

  const cleanPrefix = (str) =>
    str ? str.replace(/^(thành phố|tp\.?|tỉnh|quận|huyện|thị xã|phường)\s+/i, '').trim() : '';

  const cleanTargetCity = cleanPrefix(targetCity);
  const cleanProfileCity = cleanPrefix(profileCity);
  const cleanTargetDistrict = cleanPrefix(targetDistrict);

  if (
    targetCity &&
    profileCity &&
    (profileCity.includes(targetCity) ||
      targetCity.includes(profileCity) ||
      (cleanTargetCity && cleanProfileCity && cleanProfileCity.includes(cleanTargetCity)))
  ) {
    return true;
  }

  for (const area of areas) {
    const cleanArea = cleanPrefix(area);
    if (
      targetDistrict &&
      (area.includes(targetDistrict) ||
        targetDistrict.includes(area) ||
        (cleanTargetDistrict && cleanArea && cleanArea.includes(cleanTargetDistrict)))
    ) {
      return true;
    }
    if (
      targetCity &&
      (area.includes(targetCity) ||
        targetCity.includes(area) ||
        (cleanTargetCity && cleanArea && cleanArea.includes(cleanTargetCity)))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a provider is eligible to view / receive a service request.
 * Pure deterministic matching based on:
 * 1. Account status: ACTIVE provider
 * 2. Profile status: VERIFIED, not deleted
 * 3. Matching skill / service category
 * 4. Location match (distance within radius or matching service areas)
 * 5. Not previously declined
 *
 * @param {object} user User object (role, status, _id)
 * @param {object} profile ProviderProfile object (verificationStatus, skills, serviceAreas, location, ...)
 * @param {object} request ServiceRequest object (category, service, address, declinedProviders, ...)
 * @param {object} options Optional overrides (radiusKm)
 * @returns {boolean}
 */
function isProviderEligibleForRequest(user, profile, request, options = {}) {
  const { radiusKm = 15 } = options;

  // 1. Account status: role PROVIDER, status ACTIVE
  if (!user || user.role !== 'PROVIDER' || user.status !== 'ACTIVE') {
    return false;
  }

  // 2. Profile status: VERIFIED, not deleted
  if (!profile || profile.verificationStatus !== 'VERIFIED' || profile.isDeleted) {
    return false;
  }

  // 3. Not in declinedProviders
  const providerUserId = (user._id || user).toString();
  const declinedIds = (request.declinedProviders || []).map((id) => (id?._id || id).toString());
  if (declinedIds.includes(providerUserId)) {
    return false;
  }

  // 4. Category / skill matching
  let targetCategoryId = null;
  if (request.category?._id) {
    targetCategoryId = request.category._id.toString();
  } else if (request.category && typeof request.category === 'object' && request.category.id) {
    targetCategoryId = request.category.id.toString();
  } else if (request.category && typeof request.category === 'string') {
    targetCategoryId = request.category;
  } else if (request.category && request.category.toString && (request.category._bsontype === 'ObjectID' || mongoose.isValidObjectId(request.category))) {
    targetCategoryId = request.category.toString();
  } else if (request.service?.category?._id) {
    targetCategoryId = request.service.category._id.toString();
  } else if (request.service?.category && typeof request.service.category === 'object' && request.service.category.id) {
    targetCategoryId = request.service.category.id.toString();
  } else if (request.service?.category) {
    targetCategoryId = request.service.category.toString();
  } else if (options.targetCategoryId) {
    targetCategoryId = options.targetCategoryId.toString();
  }

  if (!targetCategoryId) {
    return false;
  }

  const providerSkills = [
    ...(profile.skills || []),
    ...(profile.serviceCategories || []),
  ].map((s) => (s?._id || s).toString());

  if (!providerSkills.includes(targetCategoryId)) {
    return false;
  }

  // 5. Location / service area matching
  const reqAddress = request.address;
  const reqCoords = reqAddress?.location?.coordinates;
  const reqCity = reqAddress?.city;
  const reqDistrict = reqAddress?.district;
  const provCoords = profile.location?.coordinates;

  if (
    Array.isArray(reqCoords) && reqCoords.length === 2 &&
    Array.isArray(provCoords) && provCoords.length === 2
  ) {
    const dist = haversineKm(reqCoords[1], reqCoords[0], provCoords[1], provCoords[0]);
    if (!Number.isNaN(dist) && dist <= radiusKm) {
      return true;
    }
  }

  if (matchesServiceArea(profile, reqDistrict, reqCity)) {
    return true;
  }

  return false;
}

module.exports = {
  MATCHING_WEIGHTS,
  BAYESIAN_PARAMS,
  EXPERIENCE_CAPS,
  haversineKm,
  calculateBayesianRating,
  calculateDistanceScore,
  calculateExperienceScore,
  evaluateScheduleMatch,
  calculateBudgetScore,
  generateRecommendationReasons,
  scoreProvider,
  matchesServiceArea,
  isProviderEligibleForRequest,
};
