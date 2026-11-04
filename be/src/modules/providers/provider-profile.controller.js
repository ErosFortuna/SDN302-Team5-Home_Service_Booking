const mongoose = require('mongoose');
const ProviderProfile = require('./provider.model.js');
const Booking = require('../bookings/booking.model.js');
const MembershipPayment = require('../payments/membership-payment.model.js');
const { BOOKING_STATUS } = require('../bookings/booking.status.js');
const { AppError } = require('../../shared/app-error.js');
const { env } = require('../../config/env.js');

const PROFILE_FIELDS = Object.freeze([
  'businessName',
  'bio',
  'yearsOfExperience',
  'serviceAreas',
  'city',
  'location',
  'documents',
]);
const TERMINAL_BOOKING_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.NO_SHOW,
];

function isOwnedProviderDocument(url, userId) {
  if (typeof userId !== 'string') return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === 'res.cloudinary.com' &&
      parsedUrl.pathname.includes('/image/upload/') &&
      parsedUrl.pathname.includes(`/home-service-booking/provider-documents/${userId}/`);
  } catch {
    return false;
  }
}

function validateProfileInput(body, { userId } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Profile data must be an object');
  }

  const updates = {};
  for (const field of PROFILE_FIELDS) {
    if (Object.hasOwn(body, field)) updates[field] = body[field];
  }

  if (Object.keys(updates).length !== Object.keys(body).length) {
    throw new AppError(400, 'Request contains unsupported profile fields');
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'At least one profile field is required');
  }

  if (updates.businessName !== undefined && (
    typeof updates.businessName !== 'string' ||
    updates.businessName.trim().length < 2 ||
    updates.businessName.trim().length > 160
  )) {
    throw new AppError(400, 'businessName must contain 2 to 160 characters');
  }
  if (updates.bio !== undefined && (
    typeof updates.bio !== 'string' ||
    updates.bio.trim().length > 2000
  )) {
    throw new AppError(400, 'bio must be a string with at most 2,000 characters');
  }
  if (updates.yearsOfExperience !== undefined && (
    !Number.isInteger(updates.yearsOfExperience) ||
    updates.yearsOfExperience < 0 ||
    updates.yearsOfExperience > 80
  )) {
    throw new AppError(400, 'yearsOfExperience must be an integer between 0 and 80');
  }
  if (updates.serviceAreas !== undefined && (
    !Array.isArray(updates.serviceAreas) ||
    updates.serviceAreas.length > 20 ||
    !updates.serviceAreas.every((area) =>
      typeof area === 'string' && area.trim().length > 0 && area.trim().length <= 100
    )
  )) {
    throw new AppError(400, 'serviceAreas must contain up to 20 non-empty strings of at most 100 characters');
  }
  if (updates.city !== undefined && (
    typeof updates.city !== 'string' ||
    updates.city.trim().length > 100
  )) {
    throw new AppError(400, 'city must be a string with at most 100 characters');
  }
  if (updates.location !== undefined && updates.location !== null) {
    const { type, coordinates } = updates.location;
    if (
      typeof updates.location !== 'object' ||
      Array.isArray(updates.location) ||
      type !== 'Point' ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1]) ||
      coordinates[0] < -180 ||
      coordinates[0] > 180 ||
      coordinates[1] < -90 ||
      coordinates[1] > 90 ||
      Object.keys(updates.location).some((field) => !['type', 'coordinates'].includes(field))
    ) {
      throw new AppError(400, 'location must be a valid GeoJSON Point with [longitude, latitude] coordinates');
    }
  }
  if (updates.documents !== undefined && (
    !Array.isArray(updates.documents) ||
    updates.documents.length > 10 ||
    !updates.documents.every((url) =>
      typeof url === 'string' &&
      url.length <= 2048 &&
      (isOwnedProviderDocument(url, userId) || (
        env.nodeEnv !== 'production' &&
        /^data:image\/(?:jpeg|png|webp|gif|heic);base64,/i.test(url)
      ))
    )
  )) {
    throw new AppError(400, 'documents must contain up to 10 images uploaded for this provider profile');
  }

  for (const field of ['businessName', 'bio', 'city']) {
    if (typeof updates[field] === 'string') updates[field] = updates[field].trim();
  }
  if (updates.serviceAreas) {
    updates.serviceAreas = [...new Set(updates.serviceAreas.map((area) => area.trim()))];
  }
  if (updates.documents) {
    updates.documents = [...new Set(updates.documents)];
  }
  return updates;
}

function toOwnProfileDto(profile) {
  if (!profile) return null;
  return {
    id: profile._id.toString(),
    businessName: profile.businessName || '',
    bio: profile.bio || '',
    yearsOfExperience: profile.yearsOfExperience ?? 0,
    verificationStatus: profile.verificationStatus,
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
    completedJobCount: profile.completedJobCount,
    skills: (profile.skills || []).map((skill) => skill?._id?.toString?.() || skill.toString()),
    serviceAreas: profile.serviceAreas || [],
    city: profile.city || '',
    location: profile.location || null,
    documents: profile.documents || [],
    isDeleted: Boolean(profile.isDeleted),
    deletedAt: profile.deletedAt || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function toPublicProfileDto(profile) {
  return {
    id: profile.user._id.toString(),
    fullName: profile.user.fullName,
    avatarUrl: profile.user.avatarUrl || null,
    businessName: profile.businessName || profile.user.fullName,
    bio: profile.bio || '',
    yearsOfExperience: profile.yearsOfExperience ?? 0,
    verificationStatus: profile.verificationStatus,
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
    completedJobCount: profile.completedJobCount,
    skills: (profile.skills || []).filter(Boolean).map((skill) => ({
      id: skill._id.toString(),
      name: skill.name,
      slug: skill.slug,
    })),
    serviceAreas: profile.serviceAreas || [],
    city: profile.city || '',
  };
}

async function getMyProviderProfile(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).lean();
  return res.json({ success: true, data: toOwnProfileDto(profile) });
}

async function createMyProviderProfile(req, res) {
  const updates = validateProfileInput(req.body, { userId: req.user._id.toString() });
  const existing = await ProviderProfile.findOne({ user: req.user._id }).select('_id isDeleted').lean();
  if (existing) {
    throw new AppError(409, existing.isDeleted
      ? 'This provider profile was deleted and cannot be recreated'
      : 'Provider profile already exists');
  }
  try {
    const profile = await ProviderProfile.create({ ...updates, user: req.user._id });
    return res.status(201).json({
      success: true,
      message: 'Provider profile created',
      data: toOwnProfileDto(profile),
    });
  } catch (error) {
    if (error.code === 11000) throw new AppError(409, 'Provider profile already exists');
    throw error;
  }
}

async function updateMyProviderProfile(req, res) {
  const updates = validateProfileInput(req.body, { userId: req.user._id.toString() });
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw new AppError(404, 'Provider profile not found');
  if (profile.isDeleted) throw new AppError(410, 'Deleted provider profiles cannot be updated');

  Object.assign(profile, updates);
  await profile.save();
  return res.json({
    success: true,
    message: 'Provider profile updated',
    data: toOwnProfileDto(profile),
  });
}

async function deleteMyProviderProfile(req, res) {
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) throw new AppError(404, 'Provider profile not found');
  if (profile.isDeleted) {
    return res.json({ success: true, message: 'Provider profile already deleted', data: toOwnProfileDto(profile) });
  }

  const now = new Date();
  const [activeBooking, pendingPayment] = await Promise.all([
    Booking.exists({
      provider: req.user._id,
      status: { $nin: TERMINAL_BOOKING_STATUSES },
    }),
    MembershipPayment.exists({
      provider: req.user._id,
      status: 'PENDING',
      expiresAt: { $gt: now },
    }),
  ]);
  if (activeBooking || pendingPayment) {
    throw new AppError(409, 'Cannot delete a provider profile with active bookings or an unsettled membership checkout', {
      activeBooking: Boolean(activeBooking),
      pendingMembershipCheckout: Boolean(pendingPayment),
    });
  }

  profile.isDeleted = true;
  profile.deletedAt = now;
  await profile.save();
  return res.json({
    success: true,
    message: 'Provider profile deleted',
    data: toOwnProfileDto(profile),
  });
}

async function getPublicProviderProfile(req, res, next) {
  if (req.params.providerId === 'search') return next();
  if (!mongoose.isValidObjectId(req.params.providerId)) {
    throw new AppError(400, 'providerId must be a valid id');
  }

  const profile = await ProviderProfile.findOne({
    user: req.params.providerId,
    verificationStatus: 'VERIFIED',
    isDeleted: { $ne: true },
  })
    .populate({ path: 'user', match: { role: 'PROVIDER', status: 'ACTIVE' }, select: 'fullName avatarUrl role status' })
    .populate({ path: 'skills', match: { isActive: { $ne: false } }, select: 'name slug isActive' })
    .lean();
  if (!profile?.user) throw new AppError(404, 'Provider profile not found');

  return res.json({ success: true, data: toPublicProfileDto(profile) });
}

module.exports = {
  PROFILE_FIELDS,
  validateProfileInput,
  toOwnProfileDto,
  toPublicProfileDto,
  getMyProviderProfile,
  createMyProviderProfile,
  updateMyProviderProfile,
  deleteMyProviderProfile,
  getPublicProviderProfile,
};
