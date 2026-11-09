const { Router } = require('express');
const { handleAppError } = require('../../shared/app-error.js');
const { validateEstimateRequest } = require('./ai-assistant.validation.js');
const { estimatePrice } = require('./ai-assistant.controller.js');
const { optionalProtect } = require('../../middlewares/auth.middleware.js');

const aiAssistantRouter = Router();

// POST /api/ai/estimate-price (Optional authentication: accessible for both guests & logged-in users)
aiAssistantRouter.post(
  '/estimate-price',
  optionalProtect,
  validateEstimateRequest,
  estimatePrice
);

aiAssistantRouter.use(handleAppError);

module.exports = {
  aiAssistantRouter,
};
