'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Check,
  PlusCircle,
  MessageCircle,
  Wallet,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { CategoryIcon, StatusBadge } from '../shared'
import type { Booking, BookingStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const TABS = [
  { key: 'all', label: 'Tất cả đơn' },
  { key: 'active', label: 'Đang xử lý' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
] as const

type TabKey = (typeof TABS)[number]['key']

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'quoted', 'in_progress']

const TRACKER: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'quoted', label: 'Có báo giá' },
  { key: 'in_progress', label: 'Đang làm' },
  { key: 'completed', label: 'Hoàn tất' },
]

export function CustomerBookingsView() {
  const { bookings, openQuoteCompare, openBookingFlow, setCustomerTab } = useApp()
  const [tab, setTab] = useState<TabKey>('all')

  const filtered = bookings.filter((b) => {
    if (tab === 'all') return true
    if (tab === 'active') return ACTIVE_STATUSES.includes(b.status)
    if (tab === 'completed') return b.status === 'completed'
    return b.status === 'cancelled'
  })

  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const quotedCount = bookings.filter((b) => b.status === 'quoted').length
  const inProgressCount = bookings.filter((b) => b.status === 'in_progress').length
  const completedCount = bookings.filter((b) => b.status === 'completed').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Quản lý đơn đặt dịch vụ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tiến độ, nhận báo giá từ thợ và quản lý lịch sửa chữa tại nhà.
          </p>
        </div>
        <Button
          onClick={() => openBookingFlow()}
          className="rounded-xl bg-cta font-bold text-cta-foreground shadow-sm hover:brightness-105"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo yêu cầu mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Chờ báo giá</p>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {pendingCount + quotedCount}
          </p>
          <span className="text-[10px] text-muted-foreground">đang chờ thợ phản hồi</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Đang thực hiện</p>
          <p className="mt-1 text-2xl font-black text-sky-600 dark:text-sky-400">
            {inProgressCount}
          </p>
          <span className="text-[10px] text-muted-foreground">thợ đang thi công</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Đã hoàn thành</p>
          <p className="mt-1 text-2xl font-black text-brand">
            {completedCount}
          </p>
          <span className="text-[10px] text-muted-foreground">công việc hoàn tất</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Tổng số đơn</p>
          <p className="mt-1 text-2xl font-black text-foreground">{bookings.length}</p>
          <span className="text-[10px] text-muted-foreground">lịch sử sử dụng</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex rounded-2xl border border-border/80 bg-muted/50 p-1.5 sm:w-fit">
        {TABS.map((t) => {
          const count = bookings.filter((b) => {
            if (t.key === 'all') return true
            if (t.key === 'active') return ACTIVE_STATUSES.includes(b.status)
            if (t.key === 'completed') return b.status === 'completed'
            return b.status === 'cancelled'
          }).length

          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all',
                tab === t.key
                  ? 'bg-card text-brand shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bookings List */}
      <div className="mt-6 flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold">Chưa có đơn đặt nào</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Bạn chưa có yêu cầu dịch vụ nào trong mục này. Bấm vào nút bên dưới để đặt thợ nhanh chóng.
            </p>
            <Button
              onClick={() => openBookingFlow()}
              className="mt-5 rounded-xl bg-brand text-brand-foreground hover:brightness-110 font-bold"
            >
              Đặt lịch ngay
            </Button>
          </div>
        ) : (
          filtered.map((b) => (
            <WebBookingItem
              key={b.id}
              booking={b}
              onViewQuotes={() => openQuoteCompare(b.id)}
              onOpenChat={() => setCustomerTab('chat')}
            />
          ))
        )}
      </div>
    </div>
  )
}

function WebBookingItem({
  booking,
  onViewQuotes,
  onOpenChat,
}: {
  booking: Booking
  onViewQuotes: () => void
  onOpenChat: () => void
}) {
  const showTracker = booking.status !== 'cancelled'
  const currentIdx = TRACKER.findIndex((s) => s.key === booking.status)

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Info */}
        <div className="flex items-start gap-4">
          <CategoryIcon category={booking.category} className="size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {booking.title}
              </h2>
              <StatusBadge status={booking.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {booking.description || 'Không có mô tả chi tiết'}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <Calendar className="size-3.5 text-brand" />
                {booking.date}
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock className="size-3.5 text-brand" />
                {booking.time}
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="size-3.5 text-brand" />
                {booking.address}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-foreground">
                <Wallet className="size-3.5 text-brand" />
                Ngân sách: {formatVND(booking.budget)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t border-border lg:border-t-0">
          {booking.status === 'quoted' && (
            <Button
              onClick={onViewQuotes}
              className="rounded-xl bg-cta font-bold text-cta-foreground hover:brightness-105"
            >
              So sánh {booking.quotes.length} báo giá
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}

          {booking.status === 'in_progress' && (
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                Thợ đang xử lý
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenChat}
                className="rounded-xl font-bold"
              >
                <MessageCircle className="mr-1.5 size-4" />
                Nhắn tin với Thợ
              </Button>
            </div>
          )}

          {booking.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand/10 px-3.5 py-2 text-xs font-bold text-brand">
              <Check className="size-4" /> Hoàn tất và nghiệm thu
            </span>
          )}

          {booking.status === 'pending' && (
            <span className="rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Đang chờ thợ quanh khu vực gửi báo giá...
            </span>
          )}
        </div>
      </div>

      {/* Progress tracker */}
      {showTracker && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between max-w-xl">
            {TRACKER.map((s, i) => {
              const isDone = i <= currentIdx
              const isLast = i === TRACKER.length - 1
              return (
                <div key={s.key} className={cn('flex items-center', !isLast && 'flex-1')}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isDone
                          ? 'bg-brand text-brand-foreground shadow-xs'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isDone ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-bold hidden sm:inline',
                        isDone ? 'text-brand' : 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'mx-3 h-0.5 flex-1 rounded-full transition-colors',
                        i < currentIdx ? 'bg-brand' : 'bg-muted',
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
