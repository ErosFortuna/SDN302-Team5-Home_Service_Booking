'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  Loader2,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  availabilityApi,
  type SlotCalculationResult,
} from '@/lib/api/availability'
import { getErrorMessage } from '@/lib/api/client'
import { VIETNAMESE_DAYS } from '@/hooks/use-availability'

interface SlotPreviewTabProps {
  defaultDuration?: number
}

export function SlotPreviewTab({ defaultDuration = 60 }: SlotPreviewTabProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [duration, setDuration] = useState(defaultDuration)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SlotCalculationResult | null>(null)

  const fetchSlots = async () => {
    if (!selectedDate) return
    setLoading(true)
    setError(null)
    try {
      const res = await availabilityApi.getMySlots(selectedDate, duration)
      setResult(res.data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, duration])

  const [y, m, d] = selectedDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dayNameVi = VIETNAMESE_DAYS[dt.getDay()]

  return (
    <div className="space-y-6">
      {/* Search & Control Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="size-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Kiểm tra & Xem trước Slot trống thực tế
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mô phỏng góc nhìn của khách hàng: hệ thống kết hợp lịch tuần, giờ nghỉ, ngày đột xuất, đơn đang chạy và thời gian đệm di chuyển.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Ngày kiểm tra:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Thời lượng ca:
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút (1h)</option>
                <option value={90}>90 phút (1.5h)</option>
                <option value={120}>120 phút (2h)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchSlots}
              disabled={loading}
              className="self-end inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {loading && !result && (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-200">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Đang tính toán các khung giờ trống theo thuật toán Backend...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Day Status Banner */}
          <div
            className={cn(
              'rounded-2xl border p-5 transition-all shadow-sm',
              result.isAvailable
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-2xl font-black',
                    result.isAvailable
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {result.isAvailable ? <Sun className="size-6" /> : <Moon className="size-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-slate-900 dark:text-white">
                      {selectedDate} ({dayNameVi})
                    </h4>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                        result.isAvailable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {result.isAvailable ? 'Sẵn sàng phục vụ' : 'Không có slot trống'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {result.reason ||
                      (result.workingHours
                        ? `Giờ làm việc: ${result.workingHours.startTime} - ${result.workingHours.endTime}`
                        : '')}
                  </p>
                </div>
              </div>

              {/* Stats pill */}
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <p className="font-semibold text-slate-500 dark:text-slate-400">Số slot nhận việc</p>
                  <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                    {result.availableSlots.length} <span className="text-xs font-normal text-slate-400">/ {result.allSlots.length} slot</span>
                  </p>
                </div>

                <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-4">
                  <p className="font-semibold text-slate-500 dark:text-slate-400">Đơn trong ngày</p>
                  <p className="font-black text-lg text-teal-600 dark:text-teal-400">
                    {result.bookingsCount || 0} <span className="text-xs font-normal text-slate-400">đơn</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Bookings found on date */}
          {result.bookedSlots && result.bookedSlots.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Briefcase className="size-4 text-teal-600" />
                <span>Các đơn đặt đang hoạt động trong ngày (Hệ thống đã tự động khóa giờ):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.bookedSlots.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 text-xs"
                  >
                    <div>
                      <span className="font-black text-slate-900 dark:text-white">
                        {b.startTime} — {b.endTime}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Đệm di chuyển đến: <span className="font-bold text-rose-700 dark:text-rose-400">{b.bufferedEndTime}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slots Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-4">
              Khung giờ tính toán theo thuật toán Backend ({duration} phút/slot):
            </h4>

            {result.allSlots.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Không có khung giờ nào trong ngày này.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {result.allSlots.map((slot, sIdx) => {
                  return (
                    <div
                      key={sIdx}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all',
                        slot.isAvailable
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                          : 'border-slate-200 bg-slate-100/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 opacity-75'
                      )}
                    >
                      <div className="flex items-center gap-1 font-black text-sm">
                        <Clock className="size-3.5" />
                        <span>{slot.startTime}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        đến {slot.endTime}
                      </span>

                      <div className="mt-2">
                        {slot.isAvailable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            <CheckCircle2 className="size-2.5" /> Trống
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300 truncate max-w-[110px]"
                            title={slot.reason}
                          >
                            <XCircle className="size-2.5" /> {slot.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

