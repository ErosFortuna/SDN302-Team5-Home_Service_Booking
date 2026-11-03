const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { validateCreateRequest } = require('./request.validation.js');
const { createServiceRequest } = require('./request.controller.js');

const router = Router();

router.post(
  '/',
  protect,
  authorize('CUSTOMER'),
  validateCreateRequest,
  createServiceRequest
);

module.exports = router;
