const mongoose = require('mongoose');
const { AppError } = require('../../shared/app-error.js');
const {
  User,
  ProviderProfile,
  ServiceCategory,
  Service,
  Booking,
  Availability,
  Review,
} = require('../index.js');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Returns default weekly schedule if none is defined in Availability
 */
function getDefaultWeeklySchedule() {
  return DAY_NAMES.map((name, index) => ({
    dayOfWeek: index,
    dayName: name,
    isOff: index === 0, // Sunday off
    startTime: '08:00',
    endTime: '17:00',
    breaks: index === 0 ? [] : [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }],
  }));
}

/**
 * Verifies that a provider profile and associated user account meet public display criteria.
 * Business Rule: verificationStatus must be 'APPROVED' and user status must be 'ACTIVE'.
 *
 * @param {object} profile
 * @param {object} user
 */
function assertProviderPubliclyViewable(profile, user) {
  if (!profile || !user) {
    throw new AppError(
      404,
      'Hồ sơ thợ không tồn tại hoặc hiện không khả dụng để nhận dịch vụ.'
    );
  }

  // Verification status must be APPROVED
  if (profile.verificationStatus !== 'APPROVED') {
    throw new AppError(
      404,
      'Hồ sơ thợ chưa được xét duyệt hoặc đang tạm ngưng nhận dịch vụ.'
    );
  }

  // User account must be ACTIVE and role must be PROVIDER
  if (user.status && user.status !== 'ACTIVE') {
    throw new AppError(
      404,
      'Tài khoản thợ hiện đang bị tạm khóa hoặc không hoạt động.'
    );
  }

  if (user.role && user.role !== 'PROVIDER') {
    throw new AppError(
      404,
      'Người dùng này không phải là thợ dịch vụ.'
    );
  }

  return true;
}

/**
 * Compute rating statistics and star distribution breakdown from valid reviews
 * Single source of truth: Collection `Review` with `{ provider: userId, isVisible: true }`.
 *
 * @param {mongoose.Types.ObjectId} providerUserId
 * @returns {Promise<{ average: number, total: number, breakdown: object }>}
 */
async function computeRatingStats(providerUserId) {
  const matchFilter = {
    provider: providerUserId,
    isVisible: true,
  };

  const [stats] = await Review.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  const total = stats?.totalReviews || 0;
  const rawAvg = stats?.averageRating || 0;
  const average = total > 0 ? Math.round(rawAvg * 10) / 10 : 0;

  const star5 = stats?.star5 || 0;
  const star4 = stats?.star4 || 0;
  const star3 = stats?.star3 || 0;
  const star2 = stats?.star2 || 0;
  const star1 = stats?.star1 || 0;

  const calculatePct = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return {
    average,
    total,
    breakdown: {
      5: { count: star5, percentage: calculatePct(star5) },
      4: { count: star4, percentage: calculatePct(star4) },
      3: { count: star3, percentage: calculatePct(star3) },
      2: { count: star2, percentage: calculatePct(star2) },
      1: { count: star1, percentage: calculatePct(star1) },
    },
  };
}

/**
 * Resolves a ProviderProfile by either profile ObjectId or user ObjectId
 *
 * @param {string} providerId
 * @returns {Promise<object>} Populated profile lean document
 */
async function resolveProviderProfile(providerId) {
  const objectId = new mongoose.Types.ObjectId(providerId);

  const profile = await ProviderProfile.findOne({
    $or: [{ _id: objectId }, { user: objectId }],
  })
    .select('-documents -adminReviewNote -verificationLogs -payoutInfo')
    .populate('user', 'fullName email phone avatarUrl status role createdAt')
    .populate('skills', 'name slug pricingMode icon description isActive')
    .populate('serviceCategories', 'name slug pricingMode icon description isActive')
    .lean();

  if (!profile) {
    throw new AppError(
      404,
      'Hồ sơ thợ không tồn tại hoặc hiện không khả dụng để nhận dịch vụ.'
    );
  }

  assertProviderPubliclyViewable(profile, profile.user);

  return profile;
}

/**
 * UC-14: Get Public Provider Profile for Customer
 *
 * @param {string} providerId (can be ProviderProfile._id or User._id)
 * @returns {Promise<object>} Clean public profile payload
 */
async function getPublicProfile(providerId) {
  const profile = await resolveProviderProfile(providerId);
  const userId = profile.user._id;

  // 1. Gather completed bookings count
  const completedBookings = await Booking.countDocuments({
    provider: userId,
    status: 'COMPLETED',
  });
  const completedJobs = Math.max(completedBookings, profile.completedJobCount || 0);

  // 2. Gather active skills and categories
  const rawSkills = [...(profile.skills || []), ...(profile.serviceCategories || [])];
  const uniqueCategoryMap = new Map();

  rawSkills.forEach((cat) => {
    if (cat && cat._id && cat.isActive !== false) {
      uniqueCategoryMap.set(cat._id.toString(), {
        id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || 'wrench',
        pricingMode: cat.pricingMode || 'REQUEST_QUOTE',
        description: cat.description || '',
      });
    }
  });

  const activeSkills = Array.from(uniqueCategoryMap.values());
  const categoryIds = Array.from(uniqueCategoryMap.keys()).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  // 3. Gather active services under provider's skills
  let activeServices = [];
  if (categoryIds.length > 0) {
    const services = await Service.find({
      category: { $in: categoryIds },
      isActive: true,
    })
      .select('name slug description basePrice estimatedDurationMinutes pricingType requirements category')
      .populate('category', 'name slug pricingMode icon')
      .sort({ basePrice: 1 })
      .lean();

    activeServices = services.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      description: s.description || '',
      basePrice: s.basePrice || 0,
      estimatedDurationMinutes: s.estimatedDurationMinutes || 60,
      pricingType: s.pricingType || 'QUOTE_REQUIRED',
      requirements: s.requirements || [],
      category: s.category
        ? {
            id: s.category._id.toString(),
            name: s.category.name,
            slug: s.category.slug,
            icon: s.category.icon || 'wrench',
            pricingMode: s.category.pricingMode || 'REQUEST_QUOTE',
          }
        : null,
    }));
  }

  // 4. Gather Availability summary
  const availability = await Availability.findOne({ provider: userId }).lean();
  const isAcceptingBookings = availability?.settings?.isAcceptingBookings ?? true;
  const slotDurationMinutes = availability?.settings?.slotDurationMinutes ?? 60;
  const travelBufferMinutes = availability?.settings?.travelBufferMinutes ?? 30;
  const weeklySchedule = availability?.weeklySchedule || getDefaultWeeklySchedule();

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingDaysOff = (availability?.daysOff || [])
    .filter((d) => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((d) => ({
      id: d._id ? d._id.toString() : d.date,
      date: d.date,
      isFullDayOff: Boolean(d.isFullDayOff),
      customStartTime: d.customStartTime || null,
      customEndTime: d.customEndTime || null,
      reason: d.reason || 'Nghỉ theo lịch',
    }));

  // 5. Gather Rating & Review Breakdown (UC-15)
  const ratingStats = await computeRatingStats(userId);

  // Synchronize profile cache if changed
  if (
    profile.averageRating !== ratingStats.average ||
    profile.reviewCount !== ratingStats.total
  ) {
    ProviderProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          averageRating: ratingStats.average,
          reviewCount: ratingStats.total,
          completedJobCount: completedJobs,
        },
      }
    ).exec().catch(() => {});
  }

  return {
    id: profile._id.toString(),
    userId: userId.toString(),
    fullName: profile.user.fullName,
    avatarUrl: profile.user.avatarUrl || '',
    email: profile.user.email,
    phone: profile.user.phone || '',
    memberSince: profile.user.createdAt,
    businessName: profile.businessName || '',
    description: profile.description || profile.bio || '',
    bio: profile.bio || '',
    yearsOfExperience: profile.yearsOfExperience || 0,
    serviceAreas: profile.serviceAreas || [],
    verificationStatus: profile.verificationStatus,
    isVerified: true,
    stats: {
      averageRating: ratingStats.average,
      totalReviews: ratingStats.total,
      completedJobs,
      yearsOfExperience: profile.yearsOfExperience || 0,
    },
    skills: activeSkills,
    services: activeServices,
    availability: {
      isAcceptingBookings,
      slotDurationMinutes,
      travelBufferMinutes,
      weeklySchedule,
      upcomingDaysOff,
    },
    ratings: ratingStats,
  };
}

/**
 * UC-15: Get Paginated Reviews for Provider
 *
 * @param {string} providerId
 * @param {{ page: number, limit: number, rating?: number, sortBy: string }} options
 * @returns {Promise<{ reviews: Array, pagination: object, summary: object }>}
 */
async function getProviderReviews(providerId, options = {}) {
  const profile = await resolveProviderProfile(providerId);
  const userId = profile.user._id;

  const page = options.page || 1;
  const limit = options.limit || 10;
  const ratingFilter = options.rating;
  const sortBy = options.sortBy || 'newest';

  const filter = {
    provider: userId,
    isVisible: true,
  };

  if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
    filter.rating = ratingFilter;
  }

  let sort = { createdAt: -1 };
  if (sortBy === 'highest') {
    sort = { rating: -1, createdAt: -1 };
  } else if (sortBy === 'lowest') {
    sort = { rating: 1, createdAt: -1 };
  }

  const skip = (page - 1) * limit;

  const [reviews, totalMatching, ratingStats] = await Promise.all([
    Review.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'fullName avatarUrl')
      .populate({
        path: 'booking',
        select: 'service scheduledStartAt',
        populate: { path: 'service', select: 'name' },
      })
      .lean(),
    Review.countDocuments(filter),
    computeRatingStats(userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

  const formattedReviews = reviews.map((r) => ({
    id: r._id.toString(),
    rating: r.rating,
    comment: r.comment || '',
    response: r.response || null,
    createdAt: r.createdAt,
    customer: {
      id: r.customer ? r.customer._id.toString() : '',
      fullName: r.customer ? r.customer.fullName : 'Khách hàng',
      avatarUrl: r.customer ? r.customer.avatarUrl || '' : '',
    },
    serviceName: r.booking?.service?.name || null,
  }));

  return {
    reviews: formattedReviews,
    pagination: {
      page,
      limit,
      total: totalMatching,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    summary: ratingStats,
  };
}

/**
 * Get Provider Availability Schedule directly
 *
 * @param {string} providerId
 * @returns {Promise<object>}
 */
async function getProviderAvailability(providerId) {
  const profile = await resolveProviderProfile(providerId);
  const userId = profile.user._id;

  const availability = await Availability.findOne({ provider: userId }).lean();
  const isAcceptingBookings = availability?.settings?.isAcceptingBookings ?? true;
  const slotDurationMinutes = availability?.settings?.slotDurationMinutes ?? 60;
  const travelBufferMinutes = availability?.settings?.travelBufferMinutes ?? 30;
  const weeklySchedule = availability?.weeklySchedule || getDefaultWeeklySchedule();

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingDaysOff = (availability?.daysOff || [])
    .filter((d) => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(d.date))
    .map((d) => ({
      id: d._id ? d._id.toString() : d.date,
      date: d.date,
      isFullDayOff: Boolean(d.isFullDayOff),
      customStartTime: d.customStartTime || null,
      customEndTime: d.customEndTime || null,
      reason: d.reason || 'Nghỉ theo lịch',
    }));

  return {
    providerId: profile._id.toString(),
    userId: userId.toString(),
    isAcceptingBookings,
    slotDurationMinutes,
    travelBufferMinutes,
    weeklySchedule,
    upcomingDaysOff,
  };
}

module.exports = {
  assertProviderPubliclyViewable,
  computeRatingStats,
  resolveProviderProfile,
  getPublicProfile,
  getProviderReviews,
  getProviderAvailability,
  getDefaultWeeklySchedule,
};

