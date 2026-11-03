const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateUpdateAvailabilityPayload,
  validateWeeklyScheduleMiddleware,
  validateAddExceptionMiddleware,
  validateSettingsMiddleware,
  validateSlotCalculationQuery,
} = require('./availability.validation.js');
const {
  getMyAvailability,
  updateMyAvailability,
  updateMyWeeklySchedule,
  updateMySettings,
  toggleMyAccepting,
  addMyException,
  removeMyException,
  getMySlots,
  getProviderSlots,
  getPublicProviderAvailability,
} = require('./availability.controller.js');

const router = Router();

// ==========================================
// 1. PUBLIC / SHARED ENDPOINTS
// ==========================================

// Tính toán slot trống của một Provider cụ thể (dành cho Customer đặt lịch hoặc hệ thống)
router.get(
  '/providers/:providerId/slots',
  validateSlotCalculationQuery,
  getProviderSlots
);

// Xem thông tin lịch làm việc công khai của Provider
router.get('/providers/:providerId', getPublicProviderAvailability);

// ==========================================
// 2. PROVIDER PRIVATE ENDPOINTS (Yêu cầu đăng nhập PROVIDER)
// ==========================================

// Lấy lịch rảnh và cấu hình của chính Provider đang đăng nhập
router.get('/mine', protect, authorize('PROVIDER'), getMyAvailability);

// Cập nhật toàn diện Availability
router.put(
  '/mine',
  protect,
  authorize('PROVIDER'),
  validateUpdateAvailabilityPayload,
  updateMyAvailability
);

// Cập nhật riêng lịch làm việc định kỳ trong tuần
router.put(
  '/mine/weekly-schedule',
  protect,
  authorize('PROVIDER'),
  validateWeeklyScheduleMiddleware,
  updateMyWeeklySchedule
);

// Cập nhật riêng cấu hình thời gian (slotDuration, travelBuffer, isAcceptingBookings)
router.patch(
  '/mine/settings',
  protect,
  authorize('PROVIDER'),
  validateSettingsMiddleware,
  updateMySettings
);

// Bật / tắt nhanh trạng thái nhận việc
router.patch(
  '/mine/toggle-accepting',
  protect,
  authorize('PROVIDER'),
  toggleMyAccepting
);

// Thêm / cập nhật ngày nghỉ đột xuất (exception)
router.post(
  '/mine/exceptions',
  protect,
  authorize('PROVIDER'),
  validateAddExceptionMiddleware,
  addMyException
);

// Xóa ngày nghỉ đột xuất theo identifier (ID hoặc chuỗi YYYY-MM-DD)
router.delete(
  '/mine/exceptions/:identifier',
  protect,
  authorize('PROVIDER'),
  removeMyException
);

// Provider tự tính toán và xem trước các khung giờ trống của mình
router.get(
  '/mine/slots',
  protect,
  authorize('PROVIDER'),
  validateSlotCalculationQuery,
  getMySlots
);

// Bắt lỗi tầng router theo chuẩn hệ thống
router.use(handleAppError);

module.exports = router;

