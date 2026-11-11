'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, ChevronRight, Check, Star, X, LoaderCircle, Sparkles, UserCheck } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/utils'
import { CategoryIcon, StatusBadge } from '../shared'
import type { Booking, BookingStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { bookingApi } from '@/lib/api/bookings'
import { SelectProviderModal } from './select-provider-modal'

const TABS = [
  { key: 'active', label: 'Đang diễn ra' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
] as const

type TabKey = (typeof TABS)[number]['key']

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'in_progress']

const TRACKER: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'in_progress', label: 'Đang thực hiện' },
  { key: 'completed', label: 'Hoàn thành' },
]

export function BookingsScreen() {
  const { bookings, loadUserBookings, currentUser } = useApp()
  const [tab, setTab] = useState<TabKey>('active')
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null)
  const [selectingProviderFor, setSelectingProviderFor] = useState<Booking | null>(null)

  const filtered = bookings.filter((b) => {
    if (tab === 'active') return ACTIVE_STATUSES.includes(b.status)
    if (tab === 'completed') return b.status === 'completed'
    return b.status === 'cancelled'
  })

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      <h1 className="text-xl font-extrabold tracking-tight">My Bookings</h1>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted p-1">
        {TABS.map((t) => {
          const count = bookings.filter((b) =>
            t.key === 'active'
              ? ACTIVE_STATUSES.includes(b.status)
              : t.key === 'completed'
                ? b.status === 'completed'
                : b.status === 'cancelled',
          ).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-bold transition-all',
                tab === t.key
                  ? 'bg-card text-brand shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              {t.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Calendar className="size-6" />
          </div>
          <p className="text-sm font-semibold">No {tab} bookings</p>
          <p className="text-xs">Your {tab} requests will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onReview={() => setReviewingBooking(b)}
              onSelectProvider={() => setSelectingProviderFor(b)}
            />
          ))}
        </div>
      )}

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
        />
      )}

      {selectingProviderFor && (
        <SelectProviderModal
          isOpen={true}
          requestId={selectingProviderFor.requestId || selectingProviderFor.id}
          requestTitle={selectingProviderFor.title}
          onClose={() => setSelectingProviderFor(null)}
          onSuccess={() => {
            if (currentUser?.role) {
              void loadUserBookings(currentUser.role)
            }
          }}
        />
      )}
    </div>
  )
}

function BookingCard({
  booking,
  onReview,
  onSelectProvider,
}: {
  booking: Booking
  onReview?: () => void
  onSelectProvider?: () => void
}) {
  const showTracker =
    booking.status !== 'cancelled' && booking.status !== 'completed'
  const currentIdx = TRACKER.findIndex((s) => s.key === booking.status)

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <CategoryIcon category={booking.category} icon={booking.categoryIcon} slug={booking.categorySlug} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-tight">{booking.title}</p>
            <StatusBadge status={booking.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {booking.date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {booking.time}
            </span>
          </div>
          <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {booking.address}
          </span>
          {booking.providerName && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <UserCheck className="size-3 text-brand" />
              <span className="text-muted-foreground">Thợ:</span>
              <span className="font-semibold text-foreground">{booking.providerName}</span>
            </div>
          )}
        </div>
      </div>

      {showTracker && (
        <div className="mt-4 flex items-center">
          {TRACKER.map((s, i) => {
            const done = i <= currentIdx
            const isLast = i === TRACKER.length - 1
            return (
              <div
                key={s.key}
                className={cn('flex items-center', !isLast && 'flex-1')}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                      done
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[8px] font-semibold',
                      done ? 'text-brand' : 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      '-mt-4 h-0.5 flex-1 rounded-full transition-colors',
                      i < currentIdx ? 'bg-brand' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="text-xs">
          <span className="text-muted-foreground">Chi phí: </span>
          <span className="font-bold text-foreground">
            {booking.budget > 0 ? formatVND(booking.budget) : 'Thỏa thuận trực tiếp'}
          </span>
        </div>
        
        {booking.status === 'in_progress' && (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
            Thợ đang thực hiện dịch vụ
          </span>
        )}
        {booking.status === 'completed' && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
              <Check className="size-3.5" /> Done
            </span>
            <button
              onClick={onReview}
              className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition-colors"
            >
              <Star className="size-3 fill-amber-500 text-amber-500" /> Đánh giá
            </button>
          </div>
        )}
        {booking.status === 'pending' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {booking.providerName
                ? `Chờ thợ ${booking.providerName} xác nhận`
                : 'Chưa chọn thợ'}
            </span>
            {(!booking.providerName || booking.isOpenRequest) && (
              <button
                type="button"
                onClick={onSelectProvider}
                className="flex items-center gap-1 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand px-2.5 py-1 text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles className="size-3 text-amber-500 fill-amber-500" />
                Chọn thợ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewModal({
  booking,
  onClose,
}: {
  booking: Booking
  onClose: () => void
}) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await bookingApi.review(booking.id, rating, comment.trim() || undefined)
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi đánh giá, vui lòng thử lại sau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight">Đánh giá dịch vụ</h3>
          <button onClick={onClose} className="rounded-xl p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{booking.title}</p>

        {success ? (
          <div className="mt-6 rounded-2xl bg-emerald-500/10 p-4 text-center">
            <Check className="mx-auto size-8 text-emerald-600" />
            <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">Đã gửi đánh giá thành công!</p>
            <p className="mt-0.5 text-xs text-emerald-600/80">Cảm ơn bạn đã chia sẻ trải nghiệm.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Mức độ hài lòng</label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        'size-7',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted-foreground/40',
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400">{rating} / 5 sao</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Nhận xét chi tiết</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Thợ làm việc cẩn thận, đúng giờ..."
                className="mt-1.5 w-full rounded-2xl border border-border bg-muted/30 p-3 text-sm focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 disabled:opacity-50"
              >
                {submitting && <LoaderCircle className="size-3.5 animate-spin" />}
                Gửi đánh giá
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
