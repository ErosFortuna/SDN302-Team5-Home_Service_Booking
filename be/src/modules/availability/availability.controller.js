const availabilityService = require('./availability.service.js');
const { AppError } = require('../../shared/app-error.js');

/**
 * [GET] /api/availability/mine
 * Lấy cấu hình lịch rảnh của Provider đang đăng nhập
 */
async function getMyAvailability(req, res, next) {
  try {
    const providerId = req.user._id;
    const data = await availabilityService.getOrCreateAvailability(providerId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PUT] /api/availability/mine
 * Cập nhật toàn diện Availability (lịch định kỳ, ngoại lệ, cấu hình)
 */
async function updateMyAvailability(req, res, next) {
  try {
    const providerId = req.user._id;
    const { weeklySchedule, settings, daysOff } = req.body;
    const data = await availabilityService.updateAvailability(providerId, {
      weeklySchedule,
      settings,
      daysOff,
    });
    res.json({
      success: true,
      message: 'Cập nhật lịch làm việc thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PUT] /api/availability/mine/weekly-schedule
 * Cập nhật riêng lịch làm việc định kỳ trong tuần
 */
async function updateMyWeeklySchedule(req, res, next) {
  try {
    const providerId = req.user._id;
    const schedule = req.validatedSchedule || req.body.weeklySchedule;
    const data = await availabilityService.updateWeeklySchedule(providerId, schedule);
    res.json({
      success: true,
      message: 'Cập nhật lịch định kỳ trong tuần thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/availability/mine/settings
 * Cập nhật riêng cấu hình thời gian nhận việc
 */
async function updateMySettings(req, res, next) {
  try {
    const providerId = req.user._id;
    const settings = req.validatedSettings || req.body;
    const data = await availabilityService.updateSettings(providerId, settings);
    res.json({
      success: true,
      message: 'Cập nhật cấu hình thời gian thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/availability/mine/toggle-accepting
 * Bật / tắt nhanh công tắc sẵn sàng nhận việc
 */
async function toggleMyAccepting(req, res, next) {
  try {
    const providerId = req.user._id;
    const data = await availabilityService.toggleAcceptingBookings(providerId);
    res.json({
      success: true,
      message: data.settings.isAcceptingBookings
        ? 'Đã bật chế độ sẵn sàng nhận việc'
        : 'Đã tạm ngưng nhận việc',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [POST] /api/availability/mine/exceptions
 * Thêm hoặc cập nhật ngày nghỉ đột xuất / ngoại lệ
 */
async function addMyException(req, res, next) {
  try {
    const providerId = req.user._id;
    const exceptionData = req.validatedException || req.body;
    const data = await availabilityService.addOrUpdateException(providerId, exceptionData);
    res.status(201).json({
      success: true,
      message: 'Thêm ngày nghỉ đột xuất thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [DELETE] /api/availability/mine/exceptions/:identifier
 * Xóa một ngày nghỉ đột xuất (theo _id hoặc chuỗi ngày YYYY-MM-DD)
 */
async function removeMyException(req, res, next) {
  try {
    const providerId = req.user._id;
    const { identifier } = req.params;
    if (!identifier) {
      throw new AppError(400, 'Thiếu định danh ngày nghỉ đột xuất');
    }
    const data = await availabilityService.removeException(providerId, identifier);
    res.json({
      success: true,
      message: 'Đã xóa ngày nghỉ đột xuất',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/availability/mine/slots?date=YYYY-MM-DD&duration=60
 * Provider tự xem trước danh sách slot trống của mình theo ngày
 */
async function getMySlots(req, res, next) {
  try {
    const providerId = req.user._id;
    const dateStr = req.parsedDate || req.query.date;
    const serviceDuration = req.parsedDuration || req.query.duration;

    const data = await availabilityService.calculateAvailableSlots({
      providerId,
      dateStr,
      serviceDurationMinutes: serviceDuration,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/availability/providers/:providerId/slots?date=YYYY-MM-DD&duration=60
 * Khách hàng hoặc hệ thống tính toán danh sách slot trống thực tế của Provider
 */
async function getProviderSlots(req, res, next) {
  try {
    const { providerId } = req.params;
    const dateStr = req.parsedDate || req.query.date;
    const serviceDuration = req.parsedDuration || req.query.duration;

    if (!providerId) {
      throw new AppError(400, 'providerId là bắt buộc');
    }

    const data = await availabilityService.calculateAvailableSlots({
      providerId,
      dateStr,
      serviceDurationMinutes: serviceDuration,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/availability/providers/:providerId
 * Lấy thông tin lịch làm việc công khai của Provider
 */
async function getPublicProviderAvailability(req, res, next) {
  try {
    const { providerId } = req.params;
    if (!providerId) {
      throw new AppError(400, 'providerId là bắt buộc');
    }

    const availability = await availabilityService.getOrCreateAvailability(providerId);

    res.json({
      success: true,
      data: {
        providerId,
        isAcceptingBookings: availability.settings.isAcceptingBookings,
        slotDurationMinutes: availability.settings.slotDurationMinutes,
        weeklySchedule: availability.weeklySchedule.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          dayName: d.dayName,
          isOff: d.isOff,
          startTime: d.startTime,
          endTime: d.endTime,
          breaks: d.breaks,
        })),
        daysOffDates: availability.daysOff.map((e) => ({
          date: e.date,
          isFullDayOff: e.isFullDayOff,
          reason: e.reason,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};

