'use client'

import { Calendar, CheckCircle2, Clock, Loader2, Power, RotateCcw, Save, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AvailabilitySettings, DaySchedule, ExceptionItem } from '@/lib/api/availability'

interface AvailabilityHeaderProps {
  settings: AvailabilitySettings | null
  weeklySchedule: DaySchedule[]
  daysOff: ExceptionItem[]
  isDirty: boolean
  saving: boolean
  hasErrors: boolean
  onSave: () => void
  onReset: () => void
  onToggleAccepting: () => void
}

export function AvailabilityHeader({
  settings,
  weeklySchedule,
  daysOff,
  isDirty,
  saving,
  hasErrors,
  onSave,
  onReset,
  onToggleAccepting,
}: AvailabilityHeaderProps) {
  const isAccepting = settings?.isAcceptingBookings ?? true
  const workDaysCount = weeklySchedule.filter((d) => !d.isOff).length
  const futureExceptionsCount = daysOff.length

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-300 ring-1 ring-white/15">
              <Calendar className="size-3.5" /> UC-34 • Manage Availability
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors',
                isAccepting
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
              )}
            >
              <span className={cn('size-2 rounded-full', isAccepting ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
              {isAccepting ? 'Đang nhận lịch đặt' : 'Tạm ngưng nhận việc'}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
            Quản lý Lịch làm việc & Giờ rảnh
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
            Thiết lập lịch định kỳ hàng tuần, giờ nghỉ giải lao, ngày nghỉ phép đột xuất và thời gian dự phòng di chuyển để khách hàng đặt hẹn chính xác.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick toggle accepting bookings */}
          <button
            type="button"
            onClick={onToggleAccepting}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all shadow-md',
              isAccepting
                ? 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                : 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
            )}
            title="Bật/Tắt nhanh trạng thái nhận việc"
          >
            <Power className="size-4" />
            <span>{isAccepting ? 'Bật nhận việc' : 'Tắt nhận việc'}</span>
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 ring-1 ring-white/15 transition-all"
            >
              <RotateCcw className="size-4" />
              <span>Hoàn tác</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving || !isDirty || hasErrors}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all shadow-lg',
              isDirty && !hasErrors
                ? 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-teal-500/30 cursor-pointer animate-pulse'
                : 'bg-white/15 text-white/50 cursor-not-allowed ring-1 ring-white/10'
            )}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isDirty ? (
              <Save className="size-4" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-400" />
            )}
            <span>{saving ? 'Đang lưu...' : isDirty ? 'Lưu thay đổi' : 'Đã đồng bộ'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-white/10 pt-6">
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-medium text-slate-400">Số ngày làm việc/tuần</p>
          <p className="mt-1 text-2xl font-black text-white">
            {workDaysCount} <span className="text-sm font-semibold text-slate-400">/ 7 ngày</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-medium text-slate-400">Ngoại lệ & Ngày nghỉ</p>
          <p className="mt-1 text-2xl font-black text-white">
            {futureExceptionsCount} <span className="text-sm font-semibold text-slate-400">ngày</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-medium text-slate-400">Độ chia mỗi ca</p>
          <p className="mt-1 text-2xl font-black text-teal-300">
            {settings?.slotDurationMinutes ?? 60} <span className="text-sm font-semibold text-slate-400">phút</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-medium text-slate-400">Đệm di chuyển (Buffer)</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">
            {settings?.travelBufferMinutes ?? 30} <span className="text-sm font-semibold text-slate-400">phút</span>
          </p>
        </div>
      </div>
    </div>
  )
}

