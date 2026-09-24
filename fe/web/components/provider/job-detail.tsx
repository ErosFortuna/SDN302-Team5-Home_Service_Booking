'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  Wallet,
  Play,
  Camera,
  CheckCircle2,
  Phone,
  MessageCircle,
  X,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { Avatar, CategoryIcon, StatusBadge, CtaButton, BrandButton } from '../shared'

export function JobDetail() {
  const {
    jobDetailId,
    closeJobDetail,
    providerJobs,
    updateJobStatus,
    setProviderTab,
  } = useApp()

  const [uploaded, setUploaded] = useState(0)

  const job = providerJobs.find((j) => j.id === jobDetailId)
  if (!jobDetailId || !job) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeJobDetail}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-xl max-h-[88vh] flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold">Chi tiết công việc</h2>
            <StatusBadge status={job.status} />
          </div>
          <button
            onClick={closeJobDetail}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-start gap-3">
          <CategoryIcon category={job.category} className="size-12 shrink-0" />
          <div>
            <h1 className="text-base font-extrabold leading-tight">
              {job.title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {job.category}
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          {job.description}
        </p>

        {/* Customer */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
          <Avatar
            initials={job.customerName.slice(0, 2).toUpperCase()}
            className="size-11"
            color="bg-secondary text-secondary-foreground"
          />
          <div className="flex-1">
            <p className="text-sm font-bold">{job.customerName}</p>
            <p className="text-xs text-muted-foreground">Customer</p>
          </div>
          <button
            onClick={() => {
              closeJobDetail()
              setProviderTab('chat')
            }}
            className="flex size-9 items-center justify-center rounded-xl border border-border text-brand hover:bg-muted"
          >
            <MessageCircle className="size-4" />
          </button>
          <button className="flex size-9 items-center justify-center rounded-xl border border-border text-brand hover:bg-muted">
            <Phone className="size-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-col gap-2">
          <MetaRow icon={Calendar}>{job.date}</MetaRow>
          <MetaRow icon={Clock}>{job.time}</MetaRow>
          <MetaRow icon={MapPin}>{job.address}</MetaRow>
          <MetaRow icon={Wallet}>
            Agreed price{' '}
            <span className="font-bold text-brand">
              {formatVND(job.budget)}
            </span>
          </MetaRow>
        </div>

        {/* Completion photos */}
        {(job.status === 'in_progress' || job.status === 'completed') && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold">Completion photos</p>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: uploaded }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gradient-to-br from-teal-400/40 to-sky-400/40"
                />
              ))}
              {job.status === 'in_progress' && uploaded < 4 && (
                <button
                  onClick={() => setUploaded((u) => u + 1)}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  <Camera className="size-5" />
                  <span className="text-[10px] font-semibold">Upload</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="border-t border-border p-4">
        {job.status === 'quoted' || job.status === 'pending' ? (
          <BrandButton
            onClick={() => updateJobStatus(job.id, 'in_progress')}
            className="w-full py-3"
          >
            <Play className="size-4" />
            Start Job
          </BrandButton>
        ) : job.status === 'in_progress' ? (
          <CtaButton
            onClick={() => updateJobStatus(job.id, 'completed')}
            className="w-full py-3"
            disabled={uploaded === 0}
          >
            <CheckCircle2 className="size-4" />
            {uploaded === 0 ? 'Upload a photo to complete' : 'Complete Job'}
          </CtaButton>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-brand/15 py-3 text-sm font-bold text-brand">
            <CheckCircle2 className="size-4" />
            Job Completed
          </div>
        )}
      </div>
    </div>
  </div>
)
}

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs">
      <Icon className="size-4 shrink-0 text-brand" />
      <span className="font-medium">{children}</span>
    </div>
  )
}
