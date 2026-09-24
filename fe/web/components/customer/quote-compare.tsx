'use client'

import { ChevronLeft, MapPin, Clock, Check, X, ShieldCheck } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND, getProvider } from '@/lib/data'
import { Avatar, Stars, CtaButton } from '../shared'

export function QuoteCompare() {
  const {
    quoteBookingId,
    closeQuoteCompare,
    bookings,
    acceptQuote,
    declineQuote,
  } = useApp()

  if (!quoteBookingId) return null
  const booking = bookings.find((b) => b.id === quoteBookingId)
  if (!booking) return null

  const sorted = [...booking.quotes].sort(
    (a, b) =>
      a.laborFee + a.materialFee - (b.laborFee + b.materialFee),
  )
  const cheapest = sorted[0]?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeQuoteCompare}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-3xl max-h-[88vh] flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">So sánh báo giá từ các Thợ</h2>
            <p className="truncate text-xs text-muted-foreground">
              {booking.title} · {booking.address}
            </p>
          </div>
          <button
            onClick={closeQuoteCompare}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 text-xs text-muted-foreground">
          {booking.quotes.length} pros responded · sorted by best price
        </p>
        <div className="flex flex-col gap-3">
          {sorted.map((q) => {
            const provider = getProvider(q.providerId)
            if (!provider) return null
            const total = q.laborFee + q.materialFee
            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {q.id === cheapest && (
                  <div className="bg-cta px-4 py-1.5 text-[11px] font-extrabold text-cta-foreground">
                    BEST VALUE
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      initials={provider.avatar}
                      className="size-11 shrink-0"
                      color="bg-secondary text-secondary-foreground"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-bold">
                          {provider.name}
                        </p>
                        {provider.verified && (
                          <ShieldCheck className="size-3.5 shrink-0 text-brand" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Stars rating={provider.rating} className="text-foreground" />
                        <span>({provider.reviews})</span>
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="size-3" />
                          {provider.distanceKm} km
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-brand">
                        {formatVND(total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Labor</p>
                      <p className="font-semibold">{formatVND(q.laborFee)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Materials</p>
                      <p className="font-semibold">{formatVND(q.materialFee)}</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 border-t border-border pt-2 text-muted-foreground">
                      <Clock className="size-3.5 text-brand" />
                      Can arrive: <span className="font-semibold text-foreground">{q.arrival}</span>
                    </div>
                  </div>

                  {q.note && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      &ldquo;{q.note}&rdquo;
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => declineQuote(booking.id, q.id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <X className="size-4" />
                      Decline
                    </button>
                    <CtaButton
                      onClick={() => acceptQuote(booking.id, q.id)}
                      className="flex-[1.6] py-2.5"
                    >
                      <Check className="size-4" />
                      Accept Quote
                    </CtaButton>
                  </div>
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No quotes yet. Check back soon.
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)
}
