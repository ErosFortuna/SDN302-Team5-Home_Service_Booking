const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { isVerifiedProvider } = require('./provider.middleware.js');
const { validateIncomingQuery } = require('./provider.validation.js');
const { getIncomingRequests } = require('./provider.request.controller.js');

/** Mounted at /api/provider */
const router = Router();

router.use(protect, authorize('PROVIDER'));

// UC-35 View Incoming Requests
router.get('/requests/incoming', isVerifiedProvider, validateIncomingQuery, getIncomingRequests);

router.use(handleAppError);

module.exports = router;
