'use client'

import { MapPin, Clock, Wallet, ImageIcon, Check, Send } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/utils'
import { CategoryIcon } from '../shared'

export function JobBoardScreen() {
  const { jobRequests, updateJobStatus } = useApp()

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
                    {r.distanceKm != null && (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                        {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)} km`}
                      </span>
                    )}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => updateJobStatus(r.id, 'in_progress')}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground"
                  >
                    <Check className="size-3.5" />
                    Chấp nhận
                  </button>
                  <button
                    onClick={() => updateJobStatus(r.id, 'cancelled')}
                    className="inline-flex items-center rounded-xl border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground"
                  >
                    Từ chối
                  </button>
                </div>
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
