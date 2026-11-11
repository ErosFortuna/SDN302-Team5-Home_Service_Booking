const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { validatePerformanceQuery } = require('./provider-report.validation.js');
const { getPerformanceReport } = require('./provider-report.controller.js');

const router = Router();
router.use(protect, authorize('PROVIDER'));
router.get('/performance', validatePerformanceQuery, getPerformanceReport);
router.use(handleAppError);

module.exports = router;
