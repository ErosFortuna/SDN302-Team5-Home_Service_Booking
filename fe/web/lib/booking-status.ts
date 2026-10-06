import type { BookingStatus, MaterialApproval, ProviderBooking } from './api/bookings'

interface StatusMeta {
  label: string
  /** Tailwind classes for the badge */
  badge: string
  dot: string
}

export const STATUS_META: Record<BookingStatus, StatusMeta> = {
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20', dot: 'bg-slate-500' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20', dot: 'bg-sky-500' },
  PROVIDER_ON_THE_WAY: { label: 'Đang di chuyển', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20', dot: 'bg-indigo-500' },
  ARRIVED: { label: 'Đã đến nơi', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20', dot: 'bg-violet-500' },
  IN_PROGRESS: { label: 'Đang thực hiện', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20', dot: 'bg-amber-500' },
  AWAITING_APPROVAL: { label: 'Chờ khách duyệt chi phí', badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/20', dot: 'bg-orange-500' },
  COMPLETED: { label: 'Hoàn thành', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20', dot: 'bg-rose-500' },
  NO_SHOW: { label: 'Vắng mặt', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-zinc-500/20', dot: 'bg-zinc-500' },
}

export const MATERIAL_APPROVAL_META: Record<MaterialApproval, { label: string; badge: string }> = {
  PENDING: { label: 'Chờ duyệt', badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  APPROVED: { label: 'Đã duyệt', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  REJECTED: { label: 'Bị từ chối', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through' },
}

/** Main progress steps shown in the stepper. */
export const PROGRESS_STEPS: BookingStatus[] = ['CONFIRMED', 'PROVIDER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']

export function getStepIndex(status: BookingStatus) {
  if (status === 'AWAITING_APPROVAL') return PROGRESS_STEPS.indexOf('IN_PROGRESS')
  return PROGRESS_STEPS.indexOf(status)
}

export const ACTIVE_STATUSES: BookingStatus[] = ['CONFIRMED', 'PROVIDER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'AWAITING_APPROVAL']

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
export const formatVND = (n: number) => vnd.format(n || 0)

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
const time = new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short' })
export const formatDateTime = (iso?: string) => (iso ? dateTime.format(new Date(iso)) : '—')
export const formatTime = (iso?: string) => (iso ? time.format(new Date(iso)) : '—')

export function formatAddress(address: ProviderBooking['address']) {
  if (!address) return '—'
  if (typeof address === 'string') return address
  return Object.values(address).filter(Boolean).join(', ')
}
