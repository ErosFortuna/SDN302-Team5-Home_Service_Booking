'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, ChevronRight, Check } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { CategoryIcon, StatusBadge } from '../shared'
import type { Booking, BookingStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

type TabKey = (typeof TABS)[number]['key']

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'quoted', 'in_progress']

const TRACKER: { key: BookingStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
]

export function BookingsScreen() {
  const { bookings, openQuoteCompare } = useApp()
  const [tab, setTab] = useState<TabKey>('active')

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
              onViewQuotes={() => openQuoteCompare(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking,
  onViewQuotes,
}: {
  booking: Booking
  onViewQuotes: () => void
}) {
  const showTracker =
    booking.status !== 'cancelled' && booking.status !== 'completed'
  const currentIdx = TRACKER.findIndex((s) => s.key === booking.status)

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <CategoryIcon category={booking.category} className="size-11 shrink-0" />
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

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="text-xs">
          <span className="text-muted-foreground">Budget </span>
          <span className="font-bold">{formatVND(booking.budget)}</span>
        </div>
        {booking.status === 'quoted' && (
          <button
            onClick={onViewQuotes}
            className="inline-flex items-center gap-1 rounded-xl bg-cta px-3 py-2 text-xs font-bold text-cta-foreground transition-transform active:scale-95"
          >
            View {booking.quotes.length} quote
            {booking.quotes.length > 1 ? 's' : ''}
            <ChevronRight className="size-3.5" />
          </button>
        )}
        {booking.status === 'in_progress' && (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
            Pro is on the way
          </span>
        )}
        {booking.status === 'completed' && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <Check className="size-3.5" /> Done
          </span>
        )}
        {booking.status === 'pending' && (
          <span className="text-xs font-medium text-muted-foreground">
            Waiting for quotes...
          </span>
        )}
      </div>
    </div>
  )
}
