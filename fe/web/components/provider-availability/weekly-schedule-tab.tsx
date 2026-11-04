'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Clock,
  Coffee,
  Copy,
  Moon,
  Plus,
  Sun,
  Trash2,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BreakItem, DaySchedule } from '@/lib/api/availability'
import { VIETNAMESE_DAYS } from '@/hooks/use-availability'

interface WeeklyScheduleTabProps {
  schedule: DaySchedule[]
  validationErrors: Record<string, string>
  onUpdateDay: (dayOfWeek: number, patch: Partial<DaySchedule>) => void
  onAddBreak: (dayOfWeek: number) => void
  onRemoveBreak: (dayOfWeek: number, breakIndex: number) => void
  onUpdateBreak: (dayOfWeek: number, breakIndex: number, field: keyof BreakItem, value: string) => void
  onCopyDayToAll: (dayOfWeek: number) => void
  onApplyTemplate: (template: 'office' | 'fullDay' | 'morningOnly') => void
}

// Danh sách giờ chuẩn dạng 15 phút một nấc để lựa chọn dễ dàng
const TIME_OPTIONS: string[] = []
for (let h = 5; h <= 23; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export function WeeklyScheduleTab({
  schedule,
  validationErrors,
  onUpdateDay,
  onAddBreak,
  onRemoveBreak,
  onUpdateBreak,
  onCopyDayToAll,
  onApplyTemplate,
}: WeeklyScheduleTabProps) {
  const [copiedDay, setCopiedDay] = useState<number | null>(null)

  const handleCopy = (dayOfWeek: number) => {
    onCopyDayToAll(dayOfWeek)
    setCopiedDay(dayOfWeek)
    setTimeout(() => setCopiedDay(null), 2500)
  }

  // Sắp xếp hiển thị: Thứ 2 (1) -> Thứ 7 (6) -> Chủ nhật (0)
  const orderedSchedule = [...schedule].sort((a, b) => {
    const aOrder = a.dayOfWeek === 0 ? 7 : a.dayOfWeek
    const bOrder = b.dayOfWeek === 0 ? 7 : b.dayOfWeek
    return aOrder - bOrder
  })

  return (
    <div className="space-y-6">
      {/* Template Quick Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Wand2 className="size-5 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Mẫu lịch nhanh:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onApplyTemplate('office')}
            className="rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            🏢 Giờ hành chính (T2-T7, 8h-17h)
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate('fullDay')}
            className="rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            ⚡ Full tuần (7h-21h)
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate('morningOnly')}
            className="rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-3 py-1.5 text-xs font-bold text-slate-700 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            🌅 Chỉ làm buổi sáng (8h-12h)
          </button>
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {orderedSchedule.map((day) => {
          const dayNameVi = VIETNAMESE_DAYS[day.dayOfWeek]
          const isSunday = day.dayOfWeek === 0
          const dayError = validationErrors[`day_${day.dayOfWeek}`]
          const overlapError = validationErrors[`day_${day.dayOfWeek}_breaks_overlap`]

          return (
            <div
              key={day.dayOfWeek}
              className={cn(
                'rounded-2xl border p-5 transition-all shadow-sm',
                day.isOff
                  ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 opacity-80'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-700',
                (dayError || overlapError) && 'border-rose-400 bg-rose-50/20 dark:border-rose-800'
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Day Header & Off Toggle */}
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex size-11 items-center justify-center rounded-xl font-black text-sm',
                      day.isOff
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : isSunday
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                    )}
                  >
                    {isSunday ? 'CN' : `T${day.dayOfWeek + 1}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {dayNameVi}
                      </h3>
                      {day.isOff ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Moon className="size-3" /> Ngày nghỉ cố định
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Sun className="size-3" /> Đang nhận việc
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {day.isOff
                        ? 'Hệ thống sẽ không nhận đơn đặt cho ngày này'
                        : `Làm việc từ ${day.startTime} đến ${day.endTime} (${day.breaks?.length || 0} khoảng nghỉ)`}
                    </p>
                  </div>
                </div>

                {/* Day Switch and Copy Action */}
                <div className="flex items-center gap-3">
                  {!day.isOff && !isSunday && (
                    <button
                      type="button"
                      onClick={() => handleCopy(day.dayOfWeek)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="Sao chép khung giờ này sang các ngày T2 - T7"
                    >
                      <Copy className="size-3.5 text-slate-500" />
                      <span>{copiedDay === day.dayOfWeek ? 'Đã sao chép!' : 'Áp dụng cho T2 - T7'}</span>
                    </button>
                  )}

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!day.isOff}
                      onChange={(e) => onUpdateDay(day.dayOfWeek, { isOff: !e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {day.isOff ? 'Tắt' : 'Bật'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Working Hours & Breaks Editor */}
              {!day.isOff && (
                <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                  {/* Working Hours Pickers */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Giờ làm việc:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={day.startTime}
                        onChange={(e) => onUpdateDay(day.dayOfWeek, { startTime: e.target.value })}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      <span className="text-slate-400 font-bold">→</span>

                      <select
                        value={day.endTime}
                        onChange={(e) => onUpdateDay(day.dayOfWeek, { endTime: e.target.value })}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddBreak(day.dayOfWeek)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 px-3 py-1.5 text-xs font-bold transition dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900"
                    >
                      <Plus className="size-3.5" />
                      <span>Thêm khoảng nghỉ</span>
                    </button>
                  </div>

                  {/* Breaks List */}
                  {day.breaks && day.breaks.length > 0 && (
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Coffee className="size-3.5" />
                        <span>Khoảng nghỉ giữa giờ (Khách không thể đặt các slot này):</span>
                      </div>

                      <div className="space-y-2">
                        {day.breaks.map((brk, bIdx) => {
                          const breakError = validationErrors[`day_${day.dayOfWeek}_break_${bIdx}`]
                          return (
                            <div key={bIdx} className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  value={brk.startTime}
                                  onChange={(e) =>
                                    onUpdateBreak(day.dayOfWeek, bIdx, 'startTime', e.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>

                                <span className="text-slate-400 font-bold text-xs">đến</span>

                                <select
                                  value={brk.endTime}
                                  onChange={(e) =>
                                    onUpdateBreak(day.dayOfWeek, bIdx, 'endTime', e.target.value)
                                  }
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  value={brk.note ?? ''}
                                  placeholder="Ghi chú (VD: Nghỉ trưa)"
                                  onChange={(e) =>
                                    onUpdateBreak(day.dayOfWeek, bIdx, 'note', e.target.value)
                                  }
                                  className="flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />

                                <button
                                  type="button"
                                  onClick={() => onRemoveBreak(day.dayOfWeek, bIdx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Xóa khoảng nghỉ này"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>

                              {breakError && (
                                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                  {breakError}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Day Errors */}
                  {(dayError || overlapError) && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{dayError || overlapError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

