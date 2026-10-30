const { Router } = require('express');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateProviderId,
  validateReviewQuery,
} = require('./providerProfile.validation.js');
const providerProfileController = require('./providerProfile.controller.js');

const router = Router();

/**
 * Public Customer Endpoints (UC-14 & UC-15)
 * Mounted at /api/providers and /api/provider-profile
 */

// UC-14: View Provider Profile
router.get(
  '/:id',
  validateProviderId,
  providerProfileController.getPublicProfile
);

// UC-15: View Provider Reviews
router.get(
  '/:id/reviews',
  validateProviderId,
  validateReviewQuery,
  providerProfileController.getProviderReviews
);

// Availability summary
router.get(
  '/:id/availability',
  validateProviderId,
  providerProfileController.getProviderAvailability
);

router.use(handleAppError);

module.exports = router;

