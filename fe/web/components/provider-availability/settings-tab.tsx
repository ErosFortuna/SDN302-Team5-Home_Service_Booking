'use client'

import { Check, Clock, Compass, Info, MapPin, Power, ShieldCheck, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AvailabilitySettings } from '@/lib/api/availability'

interface SettingsTabProps {
  settings: AvailabilitySettings | null
  onUpdateSettings: (patch: Partial<AvailabilitySettings>) => void
}

const SLOT_DURATION_OPTIONS = [
  { value: 30, label: '30 phút', desc: 'Thích hợp cho việc sửa chữa nhanh, kiểm tra thiết bị' },
  { value: 45, label: '45 phút', desc: 'Dịch vụ ngắn gọn' },
  { value: 60, label: '60 phút (Khuyên dùng)', desc: 'Phù hợp với đa số dịch vụ gia đình phổ thông' },
  { value: 90, label: '90 phút', desc: 'Dịch vụ vệ sinh điều hòa, sửa chữa điện nước kỹ' },
  { value: 120, label: '120 phút (2 tiếng)', desc: 'Dọn dẹp tổng thể hoặc lắp đặt trọn gói' },
]

const BUFFER_OPTIONS = [
  { value: 0, label: '0 phút', desc: 'Không dự phòng (các ca sát giờ nhau)' },
  { value: 15, label: '15 phút', desc: 'Di chuyển gần trong cùng phường / quận' },
  { value: 30, label: '30 phút (Khuyên dùng)', desc: 'Khoảng cách trung bình giữa các địa điểm nội thành' },
  { value: 45, label: '45 phút', desc: 'Di chuyển xa hơn hoặc giờ cao điểm kẹt xe' },
  { value: 60, label: '60 phút (1 tiếng)', desc: 'Dự phòng tối đa giữa các quận xa' },
]

export function SettingsTab({ settings, onUpdateSettings }: SettingsTabProps) {
  if (!settings) return null

  const slotDuration = settings.slotDurationMinutes || 60
  const travelBuffer = settings.travelBufferMinutes ?? 30
  const isAccepting = settings.isAcceptingBookings

  return (
    <div className="space-y-8">
      {/* 1. Quick Booking Switch */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                isAccepting
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              )}
            >
              <Power className="size-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Chế độ nhận đơn (isAcceptingBookings)
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Bật tính năng này để khách hàng có thể tìm thấy và đặt dịch vụ theo các khung giờ trống của bạn. Khi tắt, toàn bộ các slot trong tuần sẽ tạm thời bị khóa.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAccepting}
              onChange={(e) => onUpdateSettings({ isAcceptingBookings: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* 2. Slot Duration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-2">
          <Timer className="size-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Độ chia mỗi ca làm việc (slotDurationMinutes)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Quyết định thời lượng mặc định của mỗi khung giờ hiển thị cho khách hàng chọn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SLOT_DURATION_OPTIONS.map((opt) => {
            const isSelected = slotDuration === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdateSettings({ slotDurationMinutes: opt.value })}
                className={cn(
                  'flex flex-col text-left p-4 rounded-xl border transition-all',
                  isSelected
                    ? 'border-teal-600 bg-teal-50/50 dark:border-teal-500 dark:bg-teal-950/30 ring-1 ring-teal-500'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-teal-600 text-white">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Travel Buffer Minutes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Thời gian dự phòng di chuyển (travelBufferMinutes)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Khoảng thời gian nghỉ và di chuyển từ nhà khách hàng này sang nhà khách hàng tiếp theo. Hệ thống sẽ tự động khóa thời gian này sau mỗi đơn hoàn thành để bạn không bị trễ hẹn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {BUFFER_OPTIONS.map((opt) => {
            const isSelected = travelBuffer === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdateSettings({ travelBufferMinutes: opt.value })}
                className={cn(
                  'flex flex-col text-left p-4 rounded-xl border transition-all',
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40'
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Visual Timeline Diagram */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
            <Info className="size-3.5 text-teal-600" />
            Minh họa cách hoạt động của thuật toán chống trùng lịch:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
            {/* Booking 1 */}
            <div className="flex-1 rounded-xl bg-blue-100 border border-blue-300 p-3 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 font-semibold text-center">
              <span className="block font-black text-sm">Đơn đặt #1</span>
              <span>08:00 — 09:30</span>
            </div>

            {/* Travel Buffer Arrow */}
            <div className="flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 font-bold text-[11px] text-center whitespace-nowrap">
              <span>+ {travelBuffer}p Di chuyển</span>
            </div>

            {/* Blocked window */}
            <div className="flex-1 rounded-xl bg-amber-100 border border-amber-300 p-3 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 font-medium text-center">
              <span className="block font-bold">Khóa slot tự động</span>
              <span>đến {9 * 60 + 30 + travelBuffer >= 600 ? '10:00' : '09:45'}</span>
            </div>

            {/* Next Available */}
            <div className="flex-1 rounded-xl bg-teal-600 p-3 text-white font-bold text-center shadow-md">
              <span className="block text-sm">Slot kế tiếp nhận khách</span>
              <span>10:00 trở đi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

