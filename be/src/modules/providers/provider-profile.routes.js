const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  getMyProviderProfile,
  createMyProviderProfile,
  updateMyProviderProfile,
  deleteMyProviderProfile,
  getPublicProviderProfile,
} = require('./provider-profile.controller.js');

const providerProfileRouter = Router();
providerProfileRouter.use(protect, authorize('PROVIDER'));
providerProfileRouter.get('/', getMyProviderProfile);
providerProfileRouter.post('/', createMyProviderProfile);
providerProfileRouter.patch('/', updateMyProviderProfile);
providerProfileRouter.delete('/', deleteMyProviderProfile);
providerProfileRouter.use(handleAppError);

const publicProviderProfileRouter = Router({ mergeParams: true });
// Public endpoint: open to all (guest, customer, provider) to view verified provider profile
publicProviderProfileRouter.get('/', getPublicProviderProfile);
publicProviderProfileRouter.use(handleAppError);

module.exports = { providerProfileRouter, publicProviderProfileRouter };
