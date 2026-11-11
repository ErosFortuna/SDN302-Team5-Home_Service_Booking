const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  listActiveMembershipPlans,
  listMembershipPlansForAdmin,
  createMembershipPlan,
  updateMembershipPlan,
  deactivateMembershipPlan,
} = require('./membership-plan.controller.js');
const {
  getMySubscription,
  createCheckout,
  syncPayment,
  cancelPending,
  listMyMembershipPayments,
} = require('./provider-subscription.controller.js');

const plansRouter = Router();
plansRouter.get('/admin', protect, authorize('ADMIN'), listMembershipPlansForAdmin);
plansRouter.get('/', listActiveMembershipPlans);
plansRouter.post('/', protect, authorize('ADMIN'), createMembershipPlan);
plansRouter.patch('/:planId', protect, authorize('ADMIN'), updateMembershipPlan);
plansRouter.delete('/:planId', protect, authorize('ADMIN'), deactivateMembershipPlan);
plansRouter.use(handleAppError);

const providerSubscriptionRouter = Router();
providerSubscriptionRouter.use(protect, authorize('PROVIDER'));
providerSubscriptionRouter.get('/me', getMySubscription);
providerSubscriptionRouter.post('/checkout', createCheckout);
providerSubscriptionRouter.post('/sync', syncPayment);
providerSubscriptionRouter.post('/cancel-pending', cancelPending);
providerSubscriptionRouter.get('/payments', listMyMembershipPayments);
providerSubscriptionRouter.use(handleAppError);

module.exports = { plansRouter, providerSubscriptionRouter };
