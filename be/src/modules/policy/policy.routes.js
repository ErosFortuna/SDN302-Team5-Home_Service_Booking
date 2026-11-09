const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateCreatePolicy,
  validateUpdatePolicy,
  validateSubmitConsent,
  validatePolicyQuery,
} = require('./policy.validation.js');
const {
  listActivePolicies,
  getActivePolicyByType,
  getPolicyById,
  getPendingConsents,
  submitConsent,
  getMyConsents,
  adminListPolicies,
  adminGetPolicyStats,
  adminGetPolicy,
  adminCreatePolicy,
  adminUpdatePolicy,
  adminGetPolicyConsents,
} = require('./policy.controller.js');

/**
 * Public & User-facing policy routes (Mounted at /api/policies)
 */
const policyRouter = Router();

// Publicly accessible active policies
policyRouter.get('/active', listActivePolicies);
policyRouter.get('/active/:type', getActivePolicyByType);

// Authenticated user consent actions
policyRouter.get('/pending-consent', protect, getPendingConsents);
policyRouter.post('/consent', protect, validateSubmitConsent, submitConsent);
policyRouter.get('/my-consents', protect, getMyConsents);

// Detail of a specific policy version
policyRouter.get('/:id', getPolicyById);

policyRouter.use(handleAppError);

/**
 * Admin policy management routes (Mounted at /api/admin/policies)
 */
const adminPolicyRouter = Router();

adminPolicyRouter.use(protect, authorize('ADMIN'));

adminPolicyRouter.get('/stats', adminGetPolicyStats);
adminPolicyRouter.get('/', validatePolicyQuery, adminListPolicies);
adminPolicyRouter.post('/', validateCreatePolicy, adminCreatePolicy);
adminPolicyRouter.get('/:id', adminGetPolicy);
adminPolicyRouter.patch('/:id', validateUpdatePolicy, adminUpdatePolicy);
adminPolicyRouter.get('/:id/consents', adminGetPolicyConsents);

adminPolicyRouter.use(handleAppError);

module.exports = {
  policyRouter,
  adminPolicyRouter,
};
