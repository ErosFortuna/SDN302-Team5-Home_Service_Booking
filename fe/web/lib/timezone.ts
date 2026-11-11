/** App wall-clock timezone. Vietnam has no DST, so UTC+7 is fixed. */
export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const APP_OFFSET = '+07:00'
const OFFSET_MS = 7 * 60 * 60 * 1000

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDate(input: Date | string | number = Date.now()) {
  return input instanceof Date ? input : new Date(input)
}

export function getVietnamParts(input: Date | string | number = Date.now()) {
  const shifted = new Date(toDate(input).getTime() + OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  }
}

export function vietnamDateKey(input: Date | string | number = Date.now()) {
  const parts = getVietnamParts(input)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function vietnamDayOfWeek(input: Date | string | number = Date.now()) {
  const parts = getVietnamParts(input)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

export function vietnamWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - OFFSET_MS)
}

export function vietnamWallClockToIso(dateStr: string, timeStr: string) {
  const [hour = '00', minute = '00', second = '00'] = timeStr.split(':')
  return `${dateStr}T${pad(Number(hour))}:${pad(Number(minute))}:${pad(Number(second || 0))}.000${APP_OFFSET}`
}

export function toOffsetIso(input: Date | string | number) {
  const parts = getVietnamParts(input)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${String(parts.millisecond).padStart(3, '0')}${APP_OFFSET}`
}

export function toDateTimeLocalValue(input: Date | string | number) {
  const parts = getVietnamParts(input)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

export function dateTimeLocalToIso(value: string) {
  const [date, time = '00:00'] = value.split('T')
  if (!date) {
    throw new Error('Vui lòng chọn ngày và giờ hợp lệ.')
  }
  return vietnamWallClockToIso(date, time)
}

export function formatVietnamDateTime(input: Date | string | number) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(toDate(input))
}

export function formatVietnamTime(input: Date | string | number) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(input))
}

export function formatVietnamDate(input: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(toDate(input))
}
