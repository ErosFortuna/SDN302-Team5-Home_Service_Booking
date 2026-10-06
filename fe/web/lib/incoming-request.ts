import type { IncomingRequest, Urgency } from '@/lib/api/requests'
import { formatVND } from '@/lib/booking-status'

export const URGENCY_META: Record<Urgency, { label: string; badge: string; dot: string; rank: number }> = {
  EMERGENCY: {
    label: 'Khẩn cấp',
    badge: 'bg-red-500/10 text-red-600 ring-red-500/30 dark:text-red-400',
    dot: 'bg-red-500',
    rank: 3,
  },
  HIGH: {
    label: 'Gấp',
    badge: 'bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400',
    dot: 'bg-orange-500',
    rank: 2,
  },
  MEDIUM: {
    label: 'Trung bình',
    badge: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-400',
    dot: 'bg-amber-500',
    rank: 1,
  },
  LOW: {
    label: 'Không gấp',
    badge: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    rank: 0,
  },
}

export const REQUEST_STATUS_META = {
  REQUESTED: { label: 'Mới', badge: 'bg-brand/10 text-brand ring-brand/30' },
  MATCHING: { label: 'Đang tìm thợ', badge: 'bg-sky-500/10 text-sky-600 ring-sky-500/30 dark:text-sky-400' },
} as const

const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
const dayLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const hourLabel = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })

/** "5 phút trước", "2 giờ trước", "hôm qua"… */
export function formatRelative(iso: string, now = Date.now()) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return 'vừa xong'
  if (abs < 3600) return relative.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(diffSec / 3600), 'hour')
  return relative.format(Math.round(diffSec / 86400), 'day')
}

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** "Hôm nay, 14:00 – 16:00" / "T5, 09/10, 08:00 – 10:00" */
export function formatTimeWindow(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)
  const day = isSameDay(start, today) ? 'Hôm nay' : isSameDay(start, tomorrow) ? 'Ngày mai' : dayLabel.format(start)
  return `${day}, ${hourLabel.format(start)} – ${hourLabel.format(end)}`
}

/** Hours until the customer's preferred start time (negative = already passed). */
export const hoursUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3600000

export function formatBudget(min?: number, max?: number) {
  if (min && max) return `${formatVND(min)} – ${formatVND(max)}`
  if (max) return `Tối đa ${formatVND(max)}`
  if (min) return `Từ ${formatVND(min)}`
  return 'Thương lượng'
}

export const shortAddress = (a: IncomingRequest['address']) => [a.district, a.city].filter(Boolean).join(', ')
export const fullAddress = (a: IncomingRequest['address']) => [a.addressLine, a.ward, a.district, a.city].filter(Boolean).join(', ')
