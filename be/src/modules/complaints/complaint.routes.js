const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const {
  validateCreateComplaint,
  validateResolveComplaint,
  validateReplyComplaint,
} = require('./complaint.validation.js');
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  resolveComplaint,
  replyComplaint,
} = require('./complaint.controller.js');

const router = Router();

// KAN-13: Create complain
router.post(
  '/',
  protect,
  validateCreateComplaint,
  createComplaint
);

// KAN-19: View complain (List)
router.get(
  '/',
  protect,
  getComplaints
);

// KAN-19: View complain (Detail)
router.get(
  '/:id',
  protect,
  getComplaintById
);

// KAN-26: Replied complain (Staff / Admin resolve & official reply)
router.patch(
  '/:id/resolve',
  protect,
  authorize('STAFF', 'ADMIN'),
  validateResolveComplaint,
  resolveComplaint
);

// KAN-26: Replied complain (Discussion reply from Customer, Provider, or Staff)
router.post(
  '/:id/reply',
  protect,
  validateReplyComplaint,
  replyComplaint
);

module.exports = router;
