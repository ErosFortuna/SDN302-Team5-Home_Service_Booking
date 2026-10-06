import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../../middlewares/auth.middleware.js';
import ServiceRequest from './request.model.js';

const router = Router();
const REQUEST_STATUSES = new Set(['OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'EXPIRED']);
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
  return { id: _id.toString(), ...fields };
}

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

router.get('/:requestId', protect, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: 'requestId must be a valid id' });
    }

    const request = await populateRequest(ServiceRequest.findById(requestId)).lean();
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });

    const isPrivileged = ['STAFF', 'ADMIN'].includes(req.user.role);
    const isOwner = request.customer.toString() === req.user._id.toString();
    const isProviderViewingOpenRequest = req.user.role === 'PROVIDER' && request.status === 'OPEN';
    if (!isPrivileged && !isOwner && !isProviderViewingOpenRequest) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    res.json({ success: true, data: serializeRequest(request) });
  } catch (error) {
    next(error);
  }
});

export default router;