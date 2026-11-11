const { AppError } = require('../../shared/app-error.js');
const Availability = require('./availability.model.js');
const Booking = require('../bookings/booking.model.js');
const { timeToMinutes } = require('./availability.validation.js');
const { DAY_NAMES, getDefaultWeeklySchedule } = Availability;
const {
  endOfVietnamDay,
  formatVietnamHHmm,
  getVietnamParts,
  startOfVietnamDay,
  vietnamDateKey,
  vietnamDayOfWeek,
} = require('../../shared/timezone.js');

/**
 * Chuyển số phút từ 00:00 thành chuỗi "HH:mm"
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Trả về cấu hình Availability mặc định trong bộ nhớ (không lưu vào DB)
 */
function getDefaultAvailability(providerId) {
  return {
    provider: providerId,
    weeklySchedule: getDefaultWeeklySchedule(),
    daysOff: [],
    settings: {
      slotDurationMinutes: 60,
      travelBufferMinutes: 30,
      isAcceptingBookings: true,
    },
  };
}

/**
 * Lấy cấu hình Availability ở chế độ chỉ đọc.
 * Nếu chưa tồn tại trong DB, trả về giá trị mặc định trong bộ nhớ và KHÔNG tạo document mới.
 */
async function getAvailabilityReadOnly(providerId) {
  const availability = await Availability.findOne({ provider: providerId }).lean();
  if (!availability) {
    return getDefaultAvailability(providerId);
  }
  return {
    ...availability,
    weeklySchedule: availability.weeklySchedule || getDefaultWeeklySchedule(),
    daysOff: availability.daysOff || [],
    settings: {
      slotDurationMinutes: availability.settings?.slotDurationMinutes ?? 60,
      travelBufferMinutes: availability.settings?.travelBufferMinutes ?? 30,
      isAcceptingBookings: availability.settings?.isAcceptingBookings ?? true,
    },
  };
}

/**
 * Lấy hoặc khởi tạo cấu hình Availability mặc định cho một Provider (chỉ dùng cho endpoint có auth của chính Provider)
 */
async function getOrCreateAvailability(providerId) {
  let availability = await Availability.findOne({ provider: providerId });
  if (!availability) {
    availability = await Availability.create({
      provider: providerId,
      weeklySchedule: getDefaultWeeklySchedule(),
      daysOff: [],
      settings: {
        slotDurationMinutes: 60,
        travelBufferMinutes: 30,
        isAcceptingBookings: true,
      },
    });
  }
  return availability;
}

/**
 * Cập nhật toàn bộ Availability của Provider
 */
async function updateAvailability(providerId, { weeklySchedule, settings, daysOff }) {
  const availability = await getOrCreateAvailability(providerId);

  if (weeklySchedule) {
    availability.weeklySchedule = weeklySchedule;
  }

  if (settings) {
    if (settings.slotDurationMinutes !== undefined) {
      availability.settings.slotDurationMinutes = settings.slotDurationMinutes;
    }
    if (settings.travelBufferMinutes !== undefined) {
      availability.settings.travelBufferMinutes = settings.travelBufferMinutes;
    }
    if (settings.isAcceptingBookings !== undefined) {
      availability.settings.isAcceptingBookings = settings.isAcceptingBookings;
    }
  }

  if (daysOff) {
    availability.daysOff = daysOff;
  }

  await availability.save();
  return availability;
}

/**
 * Cập nhật chỉ lịch làm việc định kỳ (weeklySchedule)
 */
async function updateWeeklySchedule(providerId, weeklySchedule) {
  const availability = await getOrCreateAvailability(providerId);
  availability.weeklySchedule = weeklySchedule;
  await availability.save();
  return availability;
}

/**
 * Cập nhật cấu hình dịch vụ (settings)
 */
async function updateSettings(providerId, settingsData) {
  const availability = await getOrCreateAvailability(providerId);
  if (settingsData.slotDurationMinutes !== undefined) {
    availability.settings.slotDurationMinutes = settingsData.slotDurationMinutes;
  }
  if (settingsData.travelBufferMinutes !== undefined) {
    availability.settings.travelBufferMinutes = settingsData.travelBufferMinutes;
  }
  if (settingsData.isAcceptingBookings !== undefined) {
    availability.settings.isAcceptingBookings = settingsData.isAcceptingBookings;
  }
  await availability.save();
  return availability;
}

/**
 * Công tắc nhanh bật/tắt nhận việc (toggle isAcceptingBookings)
 */
async function toggleAcceptingBookings(providerId) {
  const availability = await getOrCreateAvailability(providerId);
  availability.settings.isAcceptingBookings = !availability.settings.isAcceptingBookings;
  await availability.save();
  return availability;
}

/**
 * Thêm hoặc cập nhật một ngoại lệ / ngày nghỉ đột xuất
 */
async function addOrUpdateException(providerId, exceptionData) {
  const availability = await getOrCreateAvailability(providerId);
  const existingIndex = availability.daysOff.findIndex((item) => item.date === exceptionData.date);

  if (existingIndex >= 0) {
    availability.daysOff[existingIndex] = {
      ...availability.daysOff[existingIndex].toObject(),
      ...exceptionData,
    };
  } else {
    availability.daysOff.push(exceptionData);
  }

  // Sắp xếp ngày nghỉ tăng dần
  availability.daysOff.sort((a, b) => a.date.localeCompare(b.date));
  await availability.save();
  return availability;
}

/**
 * Xóa một ngoại lệ / ngày nghỉ đột xuất bằng ID hoặc bằng chuỗi ngày YYYY-MM-DD
 */
async function removeException(providerId, identifier) {
  const availability = await getOrCreateAvailability(providerId);
  const initialLength = availability.daysOff.length;

  availability.daysOff = availability.daysOff.filter(
    (item) => String(item._id) !== String(identifier) && item.date !== String(identifier)
  );

  if (availability.daysOff.length === initialLength) {
    throw new AppError(404, 'Không tìm thấy ngày ngoại lệ để xóa');
  }

  await availability.save();
  return availability;
}

/**
 * Trích xuất giờ:phút theo múi giờ địa phương từ đối tượng Date
 */
function extractHHmmFromDate(dateObj) {
  return formatVietnamHHmm(dateObj);
}

/**
 * Lấy chuỗi YYYY-MM-DD theo múi giờ Việt Nam
 */
function toLocalDateString(dateObj) {
  return vietnamDateKey(dateObj);
}

/**
 * THUẬT TOÁN TÍNH TOÁN DANH SÁCH KHUNG GIỜ TRỐNG THỰC TẾ (AVAILABLE SLOTS)
 *
 * 1. Kiểm tra xem ngày đó Provider có bật `isAcceptingBookings` không.
 * 2. Kiểm tra có rơi vào `daysOff` hoặc ngày `isOff` trong tuần không.
 * 3. Lấy khung giờ làm việc của ngày đó, trừ đi các khoảng `breaks`.
 * 4. Truy vấn bảng `Booking` để lấy tất cả đơn hoạt động trong ngày
 *    (CONFIRMED, PROVIDER_ON_THE_WAY, ARRIVED, IN_PROGRESS).
 * 5. Loại bỏ các khung giờ bị trùng với (Booking.scheduledStart -> Booking.scheduledEnd + travelBufferMinutes).
 * 6. Trả về danh sách các slot hợp lệ không bị xung đột.
 */
async function calculateAvailableSlots({
  providerId,
  dateStr,
  serviceDurationMinutes,
  isPrivileged = false,
}) {
  const availability = await getAvailabilityReadOnly(providerId);
  const { settings, weeklySchedule, daysOff } = availability;

  // 1. Kiểm tra Provider có đang bật nhận lịch không
  if (!settings.isAcceptingBookings) {
    return {
      providerId,
      date: dateStr,
      isAcceptingBookings: false,
      isAvailable: false,
      reason: 'Thợ hiện đang tạm ngừng nhận đơn mới',
      availableSlots: [],
      allSlots: [],
    };
  }

  // Parse ngày cần tính
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = vietnamDayOfWeek(year, month, day); // 0 = Chủ nhật, 1 = T2, ..., 6 = T7
  const dayName = DAY_NAMES[dayOfWeek];

  // 2. Kiểm tra ngoại lệ / ngày nghỉ đột xuất (daysOff)
  const exception = daysOff.find((e) => e.date === dateStr);

  let workingStartTime = '08:00';
  let workingEndTime = '17:00';
  let breaks = [];
  let isWorkDay = true;
  let dayOffReason = '';

  if (exception) {
    if (exception.isFullDayOff) {
      isWorkDay = false;
      dayOffReason = exception.reason || 'Thợ nghỉ nguyên ngày theo lịch đột xuất';
    } else {
      workingStartTime = exception.customStartTime || '08:00';
      workingEndTime = exception.customEndTime || '17:00';
      breaks = []; // Ngoại lệ tùy chỉnh giờ thường không có nghỉ trưa mặc định
    }
  } else {
    // Không có ngoại lệ: kiểm tra lịch định kỳ trong tuần (weeklySchedule)
    const daySched = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySched || daySched.isOff) {
      isWorkDay = false;
      dayOffReason = `Thợ không làm việc vào ${dayName === 'sunday' ? 'Chủ nhật' : 'ngày này trong tuần'}`;
    } else {
      workingStartTime = daySched.startTime;
      workingEndTime = daySched.endTime;
      breaks = daySched.breaks || [];
    }
  }

  if (!isWorkDay) {
    return {
      providerId,
      date: dateStr,
      dayOfWeek,
      dayName,
      isAcceptingBookings: true,
      isAvailable: false,
      reason: dayOffReason,
      availableSlots: [],
      allSlots: [],
    };
  }

  // 3. Quy đổi thời gian làm việc & thời gian nghỉ sang số phút
  const workStartMins = timeToMinutes(workingStartTime);
  const workEndMins = timeToMinutes(workingEndTime);
  const breakIntervals = breaks.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
    note: b.note || 'Nghỉ giải lao',
  }));

  // 4. Lấy danh sách booking đang hoạt động của Provider trong ngày đó
  const startOfDay = startOfVietnamDay(year, month, day);
  const endOfDay = endOfVietnamDay(year, month, day);

  const activeBookings = await Booking.find({
    provider: providerId,
    status: { $nin: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] },
    $or: [
      {
        scheduledStartAt: { $gte: startOfDay, $lte: endOfDay },
      },
      {
        scheduledEndAt: { $gte: startOfDay, $lte: endOfDay },
      },
      {
        scheduledStartAt: { $lte: startOfDay },
        scheduledEndAt: { $gte: endOfDay },
      },
    ],
  })
    .select('_id status scheduledStartAt scheduledEndAt price address')
    .lean();

  const travelBufferMinutes = settings.travelBufferMinutes ?? 30;
  const bookingBusyIntervals = activeBookings.map((b) => {
    const bStart = new Date(b.scheduledStartAt);
    const bEnd = new Date(b.scheduledEndAt);

    // Tính số phút trong ngày
    const startParts = getVietnamParts(bStart);
    const endParts = getVietnamParts(bEnd);
    let bStartMins = startParts.hour * 60 + startParts.minute;
    let bEndMins = endParts.hour * 60 + endParts.minute;

    // Nếu booking bắt đầu từ hôm trước
    if (bStart < startOfDay) bStartMins = 0;
    // Nếu booking kéo dài sang hôm sau
    if (bEnd > endOfDay) bEndMins = 24 * 60;

    return {
      bookingId: b._id,
      status: b.status,
      startMins: bStartMins,
      endMins: bEndMins,
      // Cộng thêm travel buffer sau khi kết thúc booking
      busyEndMins: bEndMins + travelBufferMinutes,
      startTimeStr: extractHHmmFromDate(bStart),
      endTimeStr: extractHHmmFromDate(bEnd),
    };
  });

  // 5. Cắt khung giờ (Slots)
  const slotDuration = Number(serviceDurationMinutes) || settings.slotDurationMinutes || 60;
  // Bước nhảy giữa các slot bắt đầu: 30 phút hoặc slotDuration (tối thiểu 30p để khách chọn linh hoạt)
  const stepMinutes = Math.min(30, slotDuration);

  const allSlots = [];
  const availableSlots = [];

  // Kiểm tra thời gian hiện tại nếu ngày tra cứu là hôm nay
  const now = new Date();
  const isToday = toLocalDateString(now) === dateStr;
  const nowParts = getVietnamParts(now);
  const currentMinutesToday = nowParts.hour * 60 + nowParts.minute;

  for (let sStart = workStartMins; sStart + slotDuration <= workEndMins; sStart += stepMinutes) {
    const sEnd = sStart + slotDuration;
    const startTimeStr = minutesToTime(sStart);
    const endTimeStr = minutesToTime(sEnd);

    let isConflict = false;
    let conflictReason = '';

    // Kiểm tra đã qua giờ hiện tại chưa (nếu là hôm nay, cần đặt trước ít nhất 15 phút)
    if (isToday && sStart <= currentMinutesToday + 15) {
      isConflict = true;
      conflictReason = 'Khung giờ này đã qua';
    }

    // Kiểm tra trùng với giờ nghỉ (breaks)
    if (!isConflict) {
      for (const brk of breakIntervals) {
        // Giao nhau nếu: slotStart < breakEnd && slotEnd > breakStart
        if (sStart < brk.end && sEnd > brk.start) {
          isConflict = true;
          conflictReason = `Trùng giờ nghỉ (${brk.note})`;
          break;
        }
      }
    }

    // Kiểm tra trùng với Booking đang hoạt động + travelBufferMinutes
    if (!isConflict) {
      for (const b of bookingBusyIntervals) {
        // Giao nhau nếu: slotStart < bookingBusyEnd && slotEnd > bookingStart
        if (sStart < b.busyEndMins && sEnd > b.startMins) {
          isConflict = true;
          conflictReason = `Trùng lịch làm việc (kèm ${travelBufferMinutes} phút di chuyển)`;
          break;
        }
      }
    }

    const slotItem = {
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes: slotDuration,
      isAvailable: !isConflict,
      reason: isConflict ? conflictReason : 'Sẵn sàng nhận việc',
    };

    allSlots.push(slotItem);
    if (!isConflict) {
      availableSlots.push(slotItem);
    }
  }

  const bookedSlots = isPrivileged
    ? bookingBusyIntervals.map((b) => ({
        bookingId: b.bookingId,
        startTime: b.startTimeStr,
        endTime: b.endTimeStr,
        status: b.status,
        bufferedEndTime: minutesToTime(Math.min(24 * 60, b.busyEndMins)),
      }))
    : bookingBusyIntervals.map((b) => ({
        startTime: b.startTimeStr,
        endTime: b.endTimeStr,
      }));

  const responseData = {
    providerId,
    date: dateStr,
    dayOfWeek,
    dayName,
    isAcceptingBookings: true,
    isAvailable: availableSlots.length > 0,
    workingHours: {
      startTime: workingStartTime,
      endTime: workingEndTime,
    },
    breaks,
    settings: {
      slotDurationMinutes: slotDuration,
      travelBufferMinutes,
      isAcceptingBookings: settings.isAcceptingBookings,
    },
    bookedSlots,
    availableSlots,
    allSlots,
  };

  if (isPrivileged) {
    responseData.bookingsCount = activeBookings.length;
  }

  return responseData;
}

module.exports = {
  getOrCreateAvailability,
  getAvailabilityReadOnly,
  getDefaultAvailability,
  updateAvailability,
  updateWeeklySchedule,
  updateSettings,
  toggleAcceptingBookings,
  addOrUpdateException,
  removeException,
  calculateAvailableSlots,
  minutesToTime,
};
