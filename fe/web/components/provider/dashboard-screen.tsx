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
import { Avatar, CategoryIcon, StatusBadge } from '../shared'
import { cn } from '@/lib/utils'

export function DashboardScreen() {
  const { providerJobs, jobRequests, serviceCategories, setProviderTab, openJobDetail, currentUser, openProfileModal } =
    useApp()

  const newRequests = jobRequests.length
  const proName = currentUser?.name || 'Thợ đối tác'
  const initials = proName.slice(0, 2).toUpperCase()
  const activeJobs = providerJobs.filter((j) => j.status === 'in_progress')
  const completedJobs = providerJobs.filter((j) => j.status === 'completed')
  const completionRate = providerJobs.length > 0
    ? `${Math.round((completedJobs.length / providerJobs.length) * 100)}%`
    : '100%'

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      <div className="flex items-center gap-3 animate-fade-up">
        <div
          onClick={() => openProfileModal()}
          className="cursor-pointer hover:scale-105 transition-all"
          title="Xem hồ sơ thợ"
        >
          <Avatar initials={initials} className="size-11" />
        </div>
        <div
          onClick={() => openProfileModal()}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          title="Xem hồ sơ thợ"
        >
          <p className="text-sm text-muted-foreground">Xin chào,</p>
          <h1 className="text-lg font-extrabold tracking-tight">
            {proName}
          </h1>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2.5 animate-fade-up">
        <MetricCard
          icon={Briefcase}
          label="Việc đang làm"
          value={String(activeJobs.length)}
          tint="text-sky-500"
        />
        <MetricCard icon={Star} label="Điểm uy tín" value="5.0" tint="text-cta" />
        <MetricCard
          icon={TrendingUp}
          label="Tỷ lệ nhận việc"
          value={completionRate}
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
            {newRequests} yêu cầu công việc mới
          </p>
          <p className="text-xs text-secondary-foreground/70">
            Xem và xác nhận đặt lịch
          </p>
        </div>
        <ChevronRight className="size-5 text-brand" />
      </button>

      {/* Active jobs */}
      <div className="animate-fade-up">
        <h2 className="mb-3 text-sm font-bold">Việc đang thực hiện</h2>
        <div className="flex flex-col gap-3">
          {providerJobs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
              Chưa có công việc nào đang nhận.
            </div>
          ) : (
            providerJobs.map((j) => (
              <button
                key={j.id}
                onClick={() => openJobDetail(j.id)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <CategoryIcon category={j.category} icon={j.categoryIcon} slug={j.categorySlug} tintIndex={serviceCategories.findIndex((c) => c.slug === j.categorySlug)} className="size-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{j.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{j.customerName}</span>
                    {j.distanceKm != null ? (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="size-3" />
                        {j.distanceKm < 1 ? `${Math.round(j.distanceKm * 1000)}m` : `${j.distanceKm.toFixed(1)} km`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                        <MapPin className="size-3" />
                        {j.address || 'Đà Nẵng'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={j.status} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))
          )}
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
