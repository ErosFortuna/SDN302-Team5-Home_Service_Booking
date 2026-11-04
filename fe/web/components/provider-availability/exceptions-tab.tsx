'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarOff,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExceptionItem } from '@/lib/api/availability'
import { VIETNAMESE_DAYS } from '@/hooks/use-availability'

interface ExceptionsTabProps {
  exceptions: ExceptionItem[]
  onAddException: (data: {
    date: string
    isFullDayOff: boolean
    customStartTime?: string
    customEndTime?: string
    reason?: string
  }) => Promise<void>
  onRemoveException: (identifier: string) => Promise<void>
  saving: boolean
}

const COMMON_REASONS = [
  'Bận việc gia đình',
  'Nghỉ phép',
  'Bảo dưỡng đồ nghề, thiết bị',
  'Đi học / Tập huấn kỹ năng',
  'Khám sức khỏe định kỳ',
  'Lễ / Tết',
]

export function ExceptionsTab({
  exceptions,
  onAddException,
  onRemoveException,
  saving,
}: ExceptionsTabProps) {
  // Form states
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [isFullDayOff, setIsFullDayOff] = useState(true)
  const [customStartTime, setCustomStartTime] = useState('08:00')
  const [customEndTime, setCustomEndTime] = useState('12:00')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!date) {
      setFormError('Vui lòng chọn ngày')
      return
    }

    if (!isFullDayOff) {
      if (customStartTime >= customEndTime) {
        setFormError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc')
        return
      }
    }

    setSubmitting(true)
    try {
      await onAddException({
        date,
        isFullDayOff,
        customStartTime: isFullDayOff ? undefined : customStartTime,
        customEndTime: isFullDayOff ? undefined : customEndTime,
        reason: reason.trim() || (isFullDayOff ? 'Nghỉ cả ngày' : 'Đổi giờ làm việc'),
      })
      // Reset form
      setReason('')
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Không thể thêm ngày ngoại lệ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (identifier: string) => {
    setDeletingId(identifier)
    try {
      await onRemoveException(identifier)
    } finally {
      setDeletingId(null)
    }
  }

  // Format date helper
  const formatExceptionDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dayOfWeek = dt.getDay()
    const dayLabel = VIETNAMESE_DAYS[dayOfWeek] || ''
    return {
      dayLabel,
      formatted: `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`,
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Add Exception Form */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <CalendarOff className="size-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Thêm ngày nghỉ / Giờ đặc biệt
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Đăng ký ngày nghỉ phép đột xuất hoặc các ngày chỉ có thể làm việc vào khung giờ riêng.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Chọn ngày:
              </label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Full day off toggle */}
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFullDayOff}
                  onChange={(e) => setIsFullDayOff(e.target.checked)}
                  className="size-4.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Nghỉ nguyên ngày (Full Day Off)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFullDayOff
                      ? 'Khách hàng sẽ không thể đặt bất kỳ khung giờ nào trong ngày này'
                      : 'Bạn vẫn làm việc nhưng với khung giờ tùy chỉnh'}
                  </p>
                </div>
              </label>
            </div>

            {/* Custom hours if not full day off */}
            {!isFullDayOff && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20">
                <div>
                  <label className="block text-xs font-bold text-teal-900 dark:text-teal-300 mb-1">
                    Giờ bắt đầu:
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-teal-900 dark:text-teal-300 mb-1">
                    Giờ kết thúc:
                  </label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Reason input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lý do nghỉ / ghi chú:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Bận việc gia đình, đám cưới..."
                maxLength={300}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {/* Suggestions */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span>{submitting ? 'Đang thêm...' : 'Thêm ngày ngoại lệ'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right: List of Exceptions */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-slate-700 dark:text-slate-300" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Danh sách ngoại lệ đã lên lịch ({exceptions.length})
            </h3>
          </div>
        </div>

        {exceptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <Calendar className="size-7" />
            </div>
            <h4 className="mt-4 font-bold text-slate-800 dark:text-slate-200">
              Chưa có ngày nghỉ đột xuất nào
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Khi bạn bận việc riêng hoặc cần bảo trì dụng cụ, hãy thêm ngày nghỉ ở biểu mẫu bên trái để hệ thống tự động khóa lịch.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((item) => {
              const { dayLabel, formatted } = formatExceptionDate(item.date)
              const itemId = item._id || item.date
              const isDeleting = deletingId === itemId

              return (
                <div
                  key={itemId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-xs',
                        item.isFullDayOff
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      )}
                    >
                      <CalendarOff className="size-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {formatted}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          ({dayLabel})
                        </span>
                        {item.isFullDayOff ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            Nghỉ nguyên ngày
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="size-3" /> {item.customStartTime} - {item.customEndTime}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-400">Lý do:</span> {item.reason || 'Bận việc riêng'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(itemId)}
                    disabled={isDeleting || saving}
                    className="self-end sm:self-center p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-40"
                    title="Xóa ngoại lệ này"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

