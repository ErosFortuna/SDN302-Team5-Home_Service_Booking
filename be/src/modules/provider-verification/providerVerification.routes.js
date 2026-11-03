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
// 2. ADMIN & STAFF ROUTES (Xét duyệt hồ sơ thợ UC-08)
// ==========================================

// Danh sách hồ sơ kèm tìm kiếm và phân trang
router.get(
  '/',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateListProvidersQuery,
  listProviders
);

// Chi tiết một hồ sơ thợ (kèm giấy tờ và lịch sử xét duyệt)
router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateProviderIdParam,
  getProviderDetails
);

// Bắt đầu mở xem xét duyệt (PENDING -> UNDER_REVIEW)
router.patch(
  '/:id/start-review',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateProviderIdParam,
  startReview
);

// Phê duyệt hồ sơ (VERIFIED)
router.patch(
  '/:id/approve',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateProviderIdParam,
  validateApprovePayload,
  approveProvider
);

// Từ chối hồ sơ (REJECTED - bắt buộc lý do)
router.patch(
  '/:id/reject',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateProviderIdParam,
  validateRejectPayload,
  rejectProvider
);

// Yêu cầu bổ sung thông tin (bắt buộc nêu rõ nội dung cần bổ sung)
router.patch(
  '/:id/request-info',
  protect,
  authorize('ADMIN', 'STAFF'),
  validateProviderIdParam,
  validateRequestInfoPayload,
  requestAdditionalInfo
);

router.use(handleAppError);

module.exports = router;
