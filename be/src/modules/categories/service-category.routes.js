const { Router } = require('express');
const ServiceCategory = require('./service-category.model.js');

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await ServiceCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name slug description isActive sortOrder')
      .lean();

    res.json({
      success: true,
      data: categories.map(({ _id, ...category }) => ({
        id: _id.toString(),
        ...category,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;