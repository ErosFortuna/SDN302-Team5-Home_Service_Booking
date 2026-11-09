/** App wall-clock timezone. Vietnam has no DST, so UTC+7 is fixed. */
const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const APP_OFFSET = '+07:00';
const OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(input = new Date()) {
  return input instanceof Date ? input : new Date(input);
}

function getVietnamParts(input = new Date()) {
  const shifted = new Date(toDate(input).getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

function vietnamDateKey(input = new Date()) {
  const parts = getVietnamParts(input);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function vietnamDayOfWeek(input, month, day) {
  if (arguments.length === 3) {
    return new Date(Date.UTC(input, month - 1, day)).getUTCDay();
  }

  const date = toDate(input);
  const parts = getVietnamParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function vietnamWallClockToDate(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - OFFSET_MS);
}

function startOfVietnamDay(year, month, day) {
  return vietnamWallClockToDate(year, month, day, 0, 0, 0, 0);
}

function endOfVietnamDay(year, month, day) {
  return vietnamWallClockToDate(year, month, day, 23, 59, 59, 999);
}

function formatVietnamHHmm(input) {
  const parts = getVietnamParts(input);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

module.exports = {
  APP_OFFSET,
  APP_TIME_ZONE,
  OFFSET_MS,
  endOfVietnamDay,
  formatVietnamHHmm,
  getVietnamParts,
  startOfVietnamDay,
  vietnamDateKey,
  vietnamDayOfWeek,
  vietnamWallClockToDate,
};
