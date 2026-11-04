const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { isVerifiedProvider } = require('./provider.middleware.js');
const { validateIncomingQuery, validateSearchProvidersQuery } = require('./provider.validation.js');
const { getIncomingRequests } = require('./provider.request.controller.js');
const { searchRateLimiter, searchProviders } = require('./provider.controller.js');

/** Mounted at /api/provider and /api/providers */
const router = Router();

// GET /api/providers/search — Authenticated search for providers (NFR-03, NFR-04, NFR-06)
router.get('/search', protect, searchRateLimiter, validateSearchProvidersQuery, searchProviders);

// Provider-only routes below
router.use(protect, authorize('PROVIDER'));

// UC-35 View Incoming Requests
router.get('/requests/incoming', isVerifiedProvider, validateIncomingQuery, getIncomingRequests);

router.use(handleAppError);

module.exports = router;
