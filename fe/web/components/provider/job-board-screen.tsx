'use client'

import { MapPin, Clock, Wallet, ImageIcon, Check, Send } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { CategoryIcon } from '../shared'

export function JobBoardScreen() {
  const { jobRequests, quotedRequestIds, openQuoteSubmit } = useApp()

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Job Requests</h1>
        <p className="text-xs text-muted-foreground">
          Incoming requests near you · Plumbing
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {jobRequests.map((r) => {
          const sent = quotedRequestIds.includes(r.id)
          return (
            <div
              key={r.id}
              className="animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <CategoryIcon category={r.category} className="size-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-tight">{r.title}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                      {r.distanceKm} km
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2.5 text-xs">
                <Info icon={Wallet} label="Budget">
                  {formatVND(r.budget)}
                </Info>
                <Info icon={Clock} label="Timing">
                  {r.time}
                </Info>
                <Info icon={ImageIcon} label="Photos">
                  {r.photos}
                </Info>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" />
                  {r.address} · {r.createdAt}
                </span>
                {sent ? (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand">
                    <Check className="size-4" />
                    Quote Sent
                  </span>
                ) : (
                  <button
                    onClick={() => openQuoteSubmit(r.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cta px-3.5 py-2 text-xs font-bold text-cta-foreground transition-transform active:scale-95"
                  >
                    <Send className="size-3.5" />
                    Send Quote
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Wallet
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </span>
      <span className="font-semibold">{children}</span>
    </div>
  )
}
