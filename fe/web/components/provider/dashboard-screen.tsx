'use client'

import {
  Wallet,
  Briefcase,
  Star,
  TrendingUp,
  ChevronRight,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { Avatar, CategoryIcon, StatusBadge } from '../shared'
import { cn } from '@/lib/utils'

export function DashboardScreen() {
  const { providerJobs, jobRequests, quotedRequestIds, setProviderTab, openJobDetail } =
    useApp()

  const newRequests = jobRequests.filter(
    (r) => !quotedRequestIds.includes(r.id),
  ).length

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      <div className="flex items-center gap-3 animate-fade-up">
        <Avatar initials="JD" className="size-11" />
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-lg font-extrabold tracking-tight">
            Jayden&apos;s Pro Services
          </h1>
        </div>
      </div>

      {/* Earnings hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-teal-500 to-teal-600 p-5 text-white shadow-lg animate-fade-up">
        <div className="absolute -right-6 -top-8 size-32 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-sm text-white/80">Today&apos;s Earnings</p>
          <p className="mt-1 text-3xl font-extrabold">{formatVND(1250000)}</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
            <TrendingUp className="size-3.5" />
            +18% vs yesterday
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2.5 animate-fade-up">
        <MetricCard icon={Briefcase} label="Active Jobs" value="3" tint="text-sky-500" />
        <MetricCard icon={Star} label="Rating" value="4.9" tint="text-cta" />
        <MetricCard
          icon={TrendingUp}
          label="Completion"
          value="98%"
          tint="text-brand"
        />
      </div>

      {/* New requests callout */}
      <button
        onClick={() => setProviderTab('jobs')}
        className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-secondary p-4 text-left animate-fade-up"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Wallet className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-secondary-foreground">
            {newRequests} new job requests
          </p>
          <p className="text-xs text-secondary-foreground/70">
            Send quotes to win more work
          </p>
        </div>
        <ChevronRight className="size-5 text-brand" />
      </button>

      {/* Active jobs */}
      <div className="animate-fade-up">
        <h2 className="mb-3 text-sm font-bold">Active Jobs</h2>
        <div className="flex flex-col gap-3">
          {providerJobs.map((j) => (
            <button
              key={j.id}
              onClick={() => openJobDetail(j.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <CategoryIcon category={j.category} className="size-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{j.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{j.customerName}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="size-3" />
                    {j.distanceKm} km
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={j.status} />
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon
  label: string
  value: string
  tint: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
      <Icon className={cn('size-5', tint)} />
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
