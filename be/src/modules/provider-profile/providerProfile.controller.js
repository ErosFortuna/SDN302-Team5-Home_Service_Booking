const providerProfileService = require('./providerProfile.service.js');

/**
 * GET /api/providers/:id
 * UC-14: View Provider Profile (Customer facing)
 */
async function getPublicProfile(req, res, next) {
  try {
    const providerId = req.validatedProviderId || req.params.id;
    const profile = await providerProfileService.getPublicProfile(providerId);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/providers/:id/reviews
 * UC-15: View Provider Reviews with filters, sorting, and pagination
 */
async function getProviderReviews(req, res, next) {
  try {
    const providerId = req.validatedProviderId || req.params.id;
    const options = req.validatedReviewQuery || req.query;

    const result = await providerProfileService.getProviderReviews(providerId, options);

    return res.status(200).json({
      success: true,
      data: result.reviews,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/providers/:id/availability
 * View provider weekly schedule and availability
 */
async function getProviderAvailability(req, res, next) {
  try {
    const providerId = req.validatedProviderId || req.params.id;
    const availability = await providerProfileService.getProviderAvailability(providerId);

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPublicProfile,
  getProviderReviews,
  getProviderAvailability,
};

