const { Router } = require('express');
const mongoose = require('mongoose');
const Service = require('./service.model.js');

const router = Router();
const SORT_FIELDS = new Set(['name', 'basePrice', 'createdAt', 'estimatedDurationMinutes']);
const PRICING_TYPES = new Set(['FIXED', 'FROM', 'QUOTE_REQUIRED']);

router.get('/', async (req, res, next) => {
  try {
    const { categoryId, keyword, pricingType, minPrice, maxPrice } = req.query;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }

    if (categoryId && (typeof categoryId !== 'string' || !mongoose.isValidObjectId(categoryId))) {
      return res.status(400).json({ success: false, message: 'categoryId must be a valid id' });
    }

    if (keyword !== undefined && (typeof keyword !== 'string' || keyword.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'keyword must be at most 100 characters' });
    }

    if (pricingType && (typeof pricingType !== 'string' || !PRICING_TYPES.has(pricingType))) {
      return res.status(400).json({ success: false, message: 'pricingType is invalid' });
    }

    const priceMin = minPrice === undefined ? undefined : Number(minPrice);
    const priceMax = maxPrice === undefined ? undefined : Number(maxPrice);
    if (
      (priceMin !== undefined && (!Number.isFinite(priceMin) || priceMin < 0)) ||
      (priceMax !== undefined && (!Number.isFinite(priceMax) || priceMax < 0)) ||
      (priceMin !== undefined && priceMax !== undefined && priceMax < priceMin)
    ) {
      return res.status(400).json({ success: false, message: 'Price range is invalid' });
    }

    const sortBy = typeof req.query.sortBy === 'string' && SORT_FIELDS.has(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = { isActive: true };

    if (categoryId) filter.category = categoryId;
    if (pricingType) filter.pricingType = pricingType;
    if (priceMin !== undefined || priceMax !== undefined) {
      filter.basePrice = {};
      if (priceMin !== undefined) filter.basePrice.$gte = priceMin;
      if (priceMax !== undefined) filter.basePrice.$lte = priceMax;
    }
    if (typeof keyword === 'string' && keyword.trim()) {
      filter.$text = { $search: keyword.trim() };
    }

    const [services, totalItems] = await Promise.all([
      Service.find(filter)
        .populate('category', 'name slug')
        .select('category name slug description basePrice estimatedDurationMinutes pricingType isActive')
        .sort({ [sortBy]: sortOrder, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Service.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: services.map(({ _id, category, ...service }) => ({
        id: _id.toString(),
        ...service,
        category: category ? {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
        } : null,
      })),
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

router.get('/:serviceId', async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    if (!mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({ success: false, message: 'serviceId must be a valid id' });
    }

    const service = await Service.findOne({ _id: serviceId, isActive: true })
      .populate('category', 'name slug')
      .select('category name slug description basePrice estimatedDurationMinutes pricingType requirements isActive')
      .lean();
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const { _id, category, ...fields } = service;
    res.json({
      success: true,
      data: {
        id: _id.toString(),
        ...fields,
        category: category ? {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;