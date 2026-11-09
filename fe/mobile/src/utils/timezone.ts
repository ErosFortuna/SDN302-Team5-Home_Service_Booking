const OFFSET_MS = 7 * 60 * 60 * 1000;
export const APP_OFFSET = '+07:00';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function getVietnamParts(input: Date | string | number = Date.now()) {
  const date = input instanceof Date ? input : new Date(input);
  const shifted = new Date(date.getTime() + OFFSET_MS);
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

export function vietnamWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - OFFSET_MS);
}

export function vietnamWallClockToIso(dateStr: string, timeStr: string) {
  const [hour = '00', minute = '00', second = '00'] = timeStr.split(':');
  return `${dateStr}T${pad(Number(hour))}:${pad(Number(minute))}:${pad(Number(second || 0))}.000${APP_OFFSET}`;
}

export function toOffsetIso(input: Date | string | number) {
  const parts = getVietnamParts(input);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${String(parts.millisecond).padStart(3, '0')}${APP_OFFSET}`;
}
