'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, Inbox, MapPin, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bookingApi, type BookingStatus, type ProviderBooking } from '@/lib/api/bookings'
import { getErrorMessage } from '@/lib/api/client'
import { formatAddress, formatDateTime, formatVND } from '@/lib/booking-status'
import { BookingStatusBadge } from './ui'

const FILTERS: { key: string; label: string; statuses?: BookingStatus[] }[] = [
  { key: 'active', label: 'Đang xử lý', statuses: ['CONFIRMED', 'PROVIDER_ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'AWAITING_APPROVAL'] },
  { key: 'completed', label: 'Hoàn thành', statuses: ['COMPLETED'] },
  { key: 'all', label: 'Tất cả' },
]

export function ProviderBookingList() {
  const [filter, setFilter] = useState(FILTERS[0])
  const [bookings, setBookings] = useState<ProviderBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    bookingApi
      .listMine(filter.statuses, controller.signal)
      .then((res) => setBookings(res.data))
      .catch((err) => (err as Error).name !== 'AbortError' && setError(getErrorMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [filter, reloadKey])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Công việc của tôi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cập nhật tiến độ để khách hàng an tâm theo dõi.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl border border-border bg-muted/60 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                id={`filter-${f.key}`}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  filter.key === f.key ? 'bg-card text-brand shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="Làm mới"
            className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && bookings.length === 0
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted" />)
          : bookings.map((b) => (
              <Link
                key={b.id}
                href={`/provider/bookings/${b.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold leading-tight">{b.service?.name ?? 'Dịch vụ tại nhà'}</h2>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{b.customer?.fullName}</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Calendar className="size-3.5 text-brand" /> {formatDateTime(b.scheduledStartAt)}</li>
                    <li className="flex items-center gap-1.5"><MapPin className="size-3.5 text-brand" /> <span className="truncate">{formatAddress(b.address)}</span></li>
                  </ul>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-black text-brand">{formatVND(b.totalAmount)}</span>
                  <span className="flex items-center gap-0.5 text-xs font-bold text-muted-foreground group-hover:text-brand">
                    Chi tiết <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
      </div>

      {!loading && !error && bookings.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border py-16 text-center">
          <Inbox className="size-10 text-muted-foreground/50" />
          <p className="font-semibold text-muted-foreground">Không có công việc nào</p>
        </div>
      )}
    </div>
  )
}
