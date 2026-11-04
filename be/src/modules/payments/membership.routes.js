const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  listActiveMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
} = require('./membership-plan.controller.js');
const {
  getMySubscription,
  createCheckout,
  listMyMembershipPayments,
} = require('./provider-subscription.controller.js');

const plansRouter = Router();
plansRouter.get('/', listActiveMembershipPlans);
plansRouter.post('/', protect, authorize('ADMIN'), createMembershipPlan);
plansRouter.patch('/:planId', protect, authorize('ADMIN'), updateMembershipPlan);
plansRouter.use(handleAppError);

const providerSubscriptionRouter = Router();
providerSubscriptionRouter.use(protect, authorize('PROVIDER'));
providerSubscriptionRouter.get('/me', getMySubscription);
providerSubscriptionRouter.post('/checkout', createCheckout);
providerSubscriptionRouter.get('/payments', listMyMembershipPayments);
providerSubscriptionRouter.use(handleAppError);

module.exports = { plansRouter, providerSubscriptionRouter };
