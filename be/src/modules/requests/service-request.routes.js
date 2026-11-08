const { Router } = require('express');
const mongoose = require('mongoose');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { validateCreateRequest } = require('./request.validation.js');
const { createServiceRequest } = require('./request.controller.js');
const ServiceRequest = require('./request.model.js');
const { validateUpdateRequest, validateCancelRequest } = require('./request.validation.js');
const { updateServiceRequest, cancelServiceRequest } = require('./request.controller.js');
const { selectProvider } = require('../bookings/booking.controller.js');
const Booking = require('../bookings/booking.model.js');
const ProviderProfile = require('../providers/provider.model.js');
const { isProviderEligibleForRequest } = require('../providers/provider.matching.js');
const { validateRecommendedProvidersQuery } = require('../providers/provider.validation.js');
const { getRecommendedProviders } = require('../providers/provider.controller.js');

const router = Router();

router.post(
  '/',
  protect,
  authorize('CUSTOMER'),
  validateCreateRequest,
  createServiceRequest
);

const REQUEST_STATUSES = new Set(['OPEN', 'BOOKED', 'CANCELLED', 'EXPIRED']);
const SORT_FIELDS = new Set(['createdAt', 'preferredStartAt', 'status']);

function populateRequest(query) {
  return query.populate({
    path: 'service',
    select: 'name slug description basePrice estimatedDurationMinutes pricingType requirements',
    populate: { path: 'category', select: 'name slug' },
  });
}

function serializeRequest(request) {
  const { _id, __v, ...fields } = request;
  if (fields.service?._id) {
    const { _id: serviceId, category, ...serviceFields } = fields.service;
    fields.service = {
      id: serviceId.toString(),
      ...serviceFields,
      category: category?._id ? {
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
      } : null,
    };
  }
  if (fields.customer && typeof fields.customer === 'object' && fields.customer._id) {
    const { _id: customerId, ...custFields } = fields.customer;
    fields.customer = {
      id: customerId.toString(),
      ...custFields,
    };
  }
  return { id: _id.toString(), ...fields };
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length < 6) return '***';
  const keepStart = 3;
  const keepEnd = 3;
  const maskedLength = Math.max(0, trimmed.length - keepStart - keepEnd);
  return trimmed.slice(0, keepStart) + '*'.repeat(maskedLength) + trimmed.slice(trimmed.length - keepEnd);
}

function serializeRedactedRequest(request) {
  const serialized = serializeRequest(request);

  if (serialized.customer && typeof serialized.customer === 'object') {
    const { email, phone, ...custRest } = serialized.customer;
    serialized.customer = {
      ...custRest,
      phone: maskPhone(phone),
    };
  }

  if (serialized.address && typeof serialized.address === 'object') {
    const { addressLine, location, phone, ...addrRest } = serialized.address;
    serialized.address = {
      ...addrRest,
      ...(phone ? { phone: maskPhone(phone) } : {}),
    };
  }

  return serialized;
}

// GET /api/requests (STAFF / ADMIN: View service requests for dispatch)
router.get('/', protect, authorize('STAFF', 'ADMIN'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status;

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }
    if (status !== undefined && (typeof status !== 'string' || !REQUEST_STATUSES.has(status))) {
      return res.status(400).json({ success: false, message: 'status is invalid' });
    }

    const sortBy = typeof req.query.sortBy === 'string' && SORT_FIELDS.has(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = {};
    if (status) filter.status = status;

    const [requests, totalItems] = await Promise.all([
      populateRequest(ServiceRequest.find(filter))
        .populate('customer', 'fullName phone email avatarUrl')
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ServiceRequest.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: requests.map(serializeRequest),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', protect, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status;

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }
    if (status !== undefined && (typeof status !== 'string' || !REQUEST_STATUSES.has(status))) {
      return res.status(400).json({ success: false, message: 'status is invalid' });
    }

    const sortBy = typeof req.query.sortBy === 'string' && SORT_FIELDS.has(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = { customer: req.user._id };
    if (status) filter.status = status;

    const [requests, totalItems] = await Promise.all([
      populateRequest(ServiceRequest.find(filter))
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ServiceRequest.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: requests.map(serializeRequest),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/requests/:requestId/recommended-providers (CUSTOMER / STAFF / ADMIN: Dispatch & self-select recommendations)
router.get(
  '/:requestId/recommended-providers',
  protect,
  authorize('CUSTOMER', 'STAFF', 'ADMIN'),
  validateRecommendedProvidersQuery,
  getRecommendedProviders
);

router.patch('/:requestId', protect, authorize('CUSTOMER'), validateUpdateRequest, updateServiceRequest);
router.post('/:requestId/cancel', protect, authorize('CUSTOMER'), validateCancelRequest, cancelServiceRequest);

// POST /api/requests/:requestId/select-provider & /assign-provider (CUSTOMER self-select & STAFF / ADMIN dispatch)
router.post('/:requestId/select-provider', protect, authorize('CUSTOMER', 'STAFF', 'ADMIN'), selectProvider);
router.post('/:requestId/assign-provider', protect, authorize('STAFF', 'ADMIN'), selectProvider);

router.get('/:requestId', protect, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: 'requestId must be a valid id' });
    }

    const request = await populateRequest(ServiceRequest.findById(requestId))
      .populate('customer', 'fullName phone email avatarUrl')
      .lean();
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });

    const isPrivileged = ['STAFF', 'ADMIN'].includes(req.user.role);
    const isOwner = request.customer && (request.customer._id || request.customer).toString() === req.user._id.toString();

    // Owner (Customer), STAFF, and ADMIN receive full data
    if (isPrivileged || isOwner) {
      return res.json({ success: true, data: serializeRequest(request) });
    }

    // Provider access control
    if (req.user.role === 'PROVIDER') {
      // 1. If provider was selected for this request (has an active booking), grant full view
      const selectedBooking = await Booking.findOne({
        request: requestId,
        provider: req.user._id,
        status: { $ne: 'CANCELLED' },
      }).lean();

      if (selectedBooking) {
        return res.json({ success: true, data: serializeRequest(request) });
      }

      // 2. Unselected provider can only view if request is OPEN and provider meets eligibility
      if (request.status === 'OPEN') {
        const profile = await ProviderProfile.findOne({
          user: req.user._id,
          isDeleted: { $ne: true },
        }).lean();

        if (profile && isProviderEligibleForRequest(req.user, profile, request)) {
          return res.json({ success: true, data: serializeRedactedRequest(request) });
        }
      }
    }

    return res.status(404).json({ success: false, message: 'Service request not found' });
  } catch (error) {
    next(error);
  }
});

router.use(handleAppError);

module.exports = router;
