const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateListProvidersQuery,
  validateProviderIdParam,
  validateApprovePayload,
  validateRejectPayload,
  validateRequestInfoPayload,
  validateResubmitPayload,
} = require('./providerVerification.validation.js');
const {
  listProviders,
  getProviderDetails,
  startReview,
  approveProvider,
  rejectProvider,
  requestAdditionalInfo,
  getMyVerificationStatus,
  resubmitMyInfo,
} = require('./providerVerification.controller.js');

const router = Router();

// ==========================================
// 1. PROVIDER ROUTES (Xem trạng thái & Gửi bổ sung UC-31)
// ==========================================
router.get(
  '/my/status',
  protect,
  authorize('PROVIDER'),
  getMyVerificationStatus
);

router.post(
  '/my/resubmit',
  protect,
  authorize('PROVIDER'),
  validateResubmitPayload,
  resubmitMyInfo
);

// ==========================================
// 2. ADMIN ROUTES (Xét duyệt hồ sơ thợ UC-56)
// ==========================================

// Danh sách hồ sơ kèm tìm kiếm và phân trang
router.get(
  '/',
  protect,
  authorize('ADMIN'),
  validateListProvidersQuery,
  listProviders
);

// Chi tiết một hồ sơ thợ (kèm giấy tờ và lịch sử xét duyệt)
router.get(
  '/:id',
  protect,
  authorize('ADMIN'),
  validateProviderIdParam,
  getProviderDetails
);

// Admin bắt đầu mở xem xét duyệt (PENDING -> UNDER_REVIEW)
router.patch(
  '/:id/start-review',
  protect,
  authorize('ADMIN'),
  validateProviderIdParam,
  startReview
);

// Admin phê duyệt hồ sơ (APPROVED)
router.patch(
  '/:id/approve',
  protect,
  authorize('ADMIN'),
  validateProviderIdParam,
  validateApprovePayload,
  approveProvider
);

// Admin từ chối hồ sơ (REJECTED - bắt buộc lý do)
router.patch(
  '/:id/reject',
  protect,
  authorize('ADMIN'),
  validateProviderIdParam,
  validateRejectPayload,
  rejectProvider
);

// Admin yêu cầu bổ sung thông tin (bắt buộc nêu rõ nội dung cần bổ sung)
router.patch(
  '/:id/request-info',
  protect,
  authorize('ADMIN'),
  validateProviderIdParam,
  validateRequestInfoPayload,
  requestAdditionalInfo
);

router.use(handleAppError);

module.exports = router;

