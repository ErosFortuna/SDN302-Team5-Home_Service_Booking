const mongoose = require('mongoose');
const { baseOptions } = require('../../shared/schema-options');

const breakSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Nghỉ giải lao',
    },
  },
  { _id: true, versionKey: false }
);

const dayScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0 = Chủ nhật, 1 = Thứ hai, ..., 6 = Thứ bảy
    },
    dayName: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      required: true,
    },
    isOff: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      default: '08:00',
    },
    endTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      default: '17:00',
    },
    breaks: {
      type: [breakSchema],
      default: () => [
        { startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' },
      ],
    },
  },
  { _id: false, versionKey: false }
);

const exceptionSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Định dạng chuẩn YYYY-MM-DD
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    isFullDayOff: {
      type: Boolean,
      default: true,
    },
    customStartTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    customEndTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: 'Bận việc riêng',
    },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const settingsSchema = new mongoose.Schema(
  {
    slotDurationMinutes: {
      type: Number,
      min: 15,
      max: 480,
      default: 60,
    },
    travelBufferMinutes: {
      type: Number,
      min: 0,
      max: 180,
      default: 30,
    },
    isAcceptingBookings: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false, versionKey: false }
);

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDefaultWeeklySchedule() {
  return DAY_NAMES.map((name, index) => ({
    dayOfWeek: index,
    dayName: name,
    isOff: index === 0, // Chủ nhật mặc định nghỉ, thứ 2 - thứ 7 làm việc
    startTime: '08:00',
    endTime: '17:00',
    breaks: index === 0 ? [] : [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }],
  }));
}

const availabilitySchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    weeklySchedule: {
      type: [dayScheduleSchema],
      default: getDefaultWeeklySchedule,
    },
    daysOff: {
      type: [exceptionSchema],
      default: [],
    },
    settings: {
      type: settingsSchema,
      default: () => ({
        slotDurationMinutes: 60,
        travelBufferMinutes: 30,
        isAcceptingBookings: true,
      }),
    },
  },
  baseOptions
);

availabilitySchema.index({ 'daysOff.date': 1 });

const AvailabilityModel = mongoose.model('Availability', availabilitySchema);
AvailabilityModel.Availability = AvailabilityModel;
AvailabilityModel.getDefaultWeeklySchedule = getDefaultWeeklySchedule;
AvailabilityModel.DAY_NAMES = DAY_NAMES;

module.exports = AvailabilityModel;
