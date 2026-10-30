const { AppError } = require('../../shared/app-error.js');
const { DAY_NAMES } = require('./availability.model.js');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chuyển đổi định dạng "HH:mm" thành số phút tính từ 00:00
 * @param {string} timeStr - "08:30"
 * @returns {number} 510
 */
function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string' || !TIME_REGEX.test(timeStr)) {
    throw new AppError(400, `Thời gian "${timeStr}" không đúng định dạng HH:mm`);
  }
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Kiểm tra định dạng giờ HH:mm
 */
function isValidTime(timeStr) {
  return typeof timeStr === 'string' && TIME_REGEX.test(timeStr);
}

/**
 * Kiểm tra định dạng ngày YYYY-MM-DD
 */
function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Validate một cấu hình ngày làm việc
 */
function validateDaySchedule(day, index) {
  if (!day || typeof day !== 'object') {
    throw new AppError(400, `Cấu hình ngày ở vị trí ${index} không hợp lệ`);
  }

  const dayOfWeek = Number(day.dayOfWeek);
  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new AppError(400, `dayOfWeek phải từ 0 đến 6 (nhận được: ${day.dayOfWeek})`);
  }

  const dayName = DAY_NAMES[dayOfWeek];

  if (day.isOff) {
    return {
      dayOfWeek,
      dayName,
      isOff: true,
      startTime: day.startTime && isValidTime(day.startTime) ? day.startTime : '08:00',
      endTime: day.endTime && isValidTime(day.endTime) ? day.endTime : '17:00',
      breaks: [],
    };
  }

  // Ngày làm việc: phải có startTime, endTime hợp lệ
  if (!isValidTime(day.startTime)) {
    throw new AppError(400, `Giờ bắt đầu làm việc của ngày ${dayName} không hợp lệ (cần định dạng HH:mm)`);
  }
  if (!isValidTime(day.endTime)) {
    throw new AppError(400, `Giờ kết thúc làm việc của ngày ${dayName} không hợp lệ (cần định dạng HH:mm)`);
  }

  const startMins = timeToMinutes(day.startTime);
  const endMins = timeToMinutes(day.endTime);

  if (startMins >= endMins) {
    throw new AppError(400, `Giờ bắt đầu (${day.startTime}) phải nhỏ hơn giờ kết thúc (${day.endTime}) cho ngày ${dayName}`);
  }

  // Validate các khoảng nghỉ (breaks)
  const breaks = Array.isArray(day.breaks) ? day.breaks : [];
  const validatedBreaks = [];

  for (let i = 0; i < breaks.length; i++) {
    const brk = breaks[i];
    if (!isValidTime(brk.startTime) || !isValidTime(brk.endTime)) {
      throw new AppError(400, `Khoảng nghỉ thứ ${i + 1} của ngày ${dayName} có giờ không hợp lệ`);
    }

    const bStartMins = timeToMinutes(brk.startTime);
    const bEndMins = timeToMinutes(brk.endTime);

    if (bStartMins >= bEndMins) {
      throw new AppError(400, `Giờ bắt đầu nghỉ (${brk.startTime}) phải nhỏ hơn giờ kết thúc nghỉ (${brk.endTime}) ở ngày ${dayName}`);
    }

    if (bStartMins < startMins || bEndMins > endMins) {
      throw new AppError(
        400,
        `Khoảng nghỉ (${brk.startTime} - ${brk.endTime}) phải nằm lọt trong khung giờ làm việc (${day.startTime} - ${day.endTime}) của ngày ${dayName}`
      );
    }

    validatedBreaks.push({
      startTime: brk.startTime,
      endTime: brk.endTime,
      note: typeof brk.note === 'string' ? brk.note.trim() : 'Nghỉ giải lao',
    });
  }

  // Kiểm tra không chồng chéo giữa các khoảng nghỉ
  validatedBreaks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  for (let i = 0; i < validatedBreaks.length - 1; i++) {
    const curEnd = timeToMinutes(validatedBreaks[i].endTime);
    const nextStart = timeToMinutes(validatedBreaks[i + 1].startTime);
    if (curEnd > nextStart) {
      throw new AppError(
        400,
        `Các khoảng nghỉ không được chồng chéo nhau trong ngày ${dayName} (${validatedBreaks[i].startTime}-${validatedBreaks[i].endTime} trùng với ${validatedBreaks[i + 1].startTime}-${validatedBreaks[i + 1].endTime})`
      );
    }
  }

  return {
    dayOfWeek,
    dayName,
    isOff: false,
    startTime: day.startTime,
    endTime: day.endTime,
    breaks: validatedBreaks,
  };
}

/**
 * Validate một ngoại lệ / ngày nghỉ đột xuất
 */
function validateExceptionData(data) {
  if (!data || typeof data !== 'object') {
    throw new AppError(400, 'Dữ liệu ngoại lệ không hợp lệ');
  }

  const { date, isFullDayOff = true, customStartTime, customEndTime, reason } = data;

  if (!isValidDate(date)) {
    throw new AppError(400, 'Ngày ngoại lệ phải đúng định dạng YYYY-MM-DD');
  }

  const result = {
    date,
    isFullDayOff: Boolean(isFullDayOff),
    reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 300) : 'Bận việc riêng',
  };

  if (!result.isFullDayOff) {
    if (!isValidTime(customStartTime) || !isValidTime(customEndTime)) {
      throw new AppError(400, 'Nếu không nghỉ nguyên ngày, phải cung cấp customStartTime và customEndTime hợp lệ (HH:mm)');
    }
    if (timeToMinutes(customStartTime) >= timeToMinutes(customEndTime)) {
      throw new AppError(400, `customStartTime (${customStartTime}) phải nhỏ hơn customEndTime (${customEndTime})`);
    }
    result.customStartTime = customStartTime;
    result.customEndTime = customEndTime;
  }

  return result;
}

/**
 * Validate cấu hình thời gian làm việc
 */
function validateSettingsData(data) {
  if (!data || typeof data !== 'object') {
    throw new AppError(400, 'Dữ liệu cấu hình không hợp lệ');
  }

  const clean = {};

  if (data.slotDurationMinutes !== undefined) {
    const slotDuration = Number(data.slotDurationMinutes);
    if (isNaN(slotDuration) || slotDuration < 15 || slotDuration > 480) {
      throw new AppError(400, 'slotDurationMinutes phải là số phút từ 15 đến 480 (8 tiếng)');
    }
    clean.slotDurationMinutes = slotDuration;
  }

  if (data.travelBufferMinutes !== undefined) {
    const travelBuffer = Number(data.travelBufferMinutes);
    if (isNaN(travelBuffer) || travelBuffer < 0 || travelBuffer > 180) {
      throw new AppError(400, 'travelBufferMinutes phải là số phút từ 0 đến 180 (3 tiếng)');
    }
    clean.travelBufferMinutes = travelBuffer;
  }

  if (data.isAcceptingBookings !== undefined) {
    clean.isAcceptingBookings = Boolean(data.isAcceptingBookings);
  }

  return clean;
}

// --- Middlewares cho Router ---

function validateUpdateAvailabilityPayload(req, res, next) {
  try {
    const { weeklySchedule, settings, daysOff } = req.body;

    if (weeklySchedule !== undefined) {
      if (!Array.isArray(weeklySchedule) || weeklySchedule.length !== 7) {
        throw new AppError(400, 'weeklySchedule phải là mảng đủ 7 ngày (từ Chủ nhật đến Thứ bảy)');
      }
      req.body.weeklySchedule = weeklySchedule.map(validateDaySchedule);
    }

    if (settings !== undefined) {
      req.body.settings = validateSettingsData(settings);
    }

    if (daysOff !== undefined) {
      if (!Array.isArray(daysOff)) {
        throw new AppError(400, 'daysOff phải là danh sách các ngày ngoại lệ');
      }
      req.body.daysOff = daysOff.map(validateExceptionData);
    }

    next();
  } catch (error) {
    next(error);
  }
}

function validateWeeklyScheduleMiddleware(req, res, next) {
  try {
    const schedule = req.body.weeklySchedule || req.body;
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      throw new AppError(400, 'weeklySchedule phải là mảng đủ 7 ngày trong tuần');
    }
    req.validatedSchedule = schedule.map(validateDaySchedule);
    next();
  } catch (error) {
    next(error);
  }
}

function validateAddExceptionMiddleware(req, res, next) {
  try {
    req.validatedException = validateExceptionData(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

function validateSettingsMiddleware(req, res, next) {
  try {
    req.validatedSettings = validateSettingsData(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

function validateSlotCalculationQuery(req, res, next) {
  try {
    const { date, duration } = req.query;
    if (!date || !isValidDate(date)) {
      throw new AppError(400, 'Tham số "date" là bắt buộc và phải có định dạng YYYY-MM-DD');
    }
    if (duration !== undefined) {
      const dur = Number(duration);
      if (isNaN(dur) || dur < 15 || dur > 480) {
        throw new AppError(400, 'Tham số "duration" phải là số phút từ 15 đến 480');
      }
      req.parsedDuration = dur;
    }
    req.parsedDate = date;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  timeToMinutes,
  isValidTime,
  isValidDate,
  validateDaySchedule,
  validateExceptionData,
  validateSettingsData,
  validateUpdateAvailabilityPayload,
  validateWeeklyScheduleMiddleware,
  validateAddExceptionMiddleware,
  validateSettingsMiddleware,
  validateSlotCalculationQuery,
};

