'use client'

import { useState } from 'react'
import {
  MapPin,
  Calendar,
  Clock,
  Wallet,
  Phone,
  MessageCircle,
  X,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/utils'
import { Avatar, CategoryIcon, StatusBadge } from '../shared'
import { JobProgressChecklist } from '../provider-booking/job-progress-checklist'
import type { BookingStatus as BackendBookingStatus } from '@/lib/api/bookings'

export function JobDetail() {
  const {
    jobDetailId,
    closeJobDetail,
    providerJobs,
    jobRequests,
    updateJobStatus,
    openChatBubble,
  } = useApp()

  const [isUpdating, setIsUpdating] = useState(false)

  // Find job in active providerJobs or pending jobRequests
  const job =
    providerJobs.find((j) => j.id === jobDetailId) ||
    jobRequests.find((r) => r.id === jobDetailId)

  if (!jobDetailId || !job) return null

  const handleUpdateStatus = async (payload: {
    status: BackendBookingStatus
    note?: string
    confirmCompletion?: boolean
    photos?: string[]
    finalPrice?: number
  }) => {
    setIsUpdating(true)
    try {
      await updateJobStatus(
        job.id,
        payload.status,
        payload.note,
        payload.photos,
        payload.finalPrice
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirm = async () => {
    setIsUpdating(true)
    try {
      await updateJobStatus(job.id, 'CONFIRMED')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDecline = async (reasonCode: string, note?: string) => {
    setIsUpdating(true)
    try {
      await updateJobStatus(job.id, 'CANCELLED', note || reasonCode)
      closeJobDetail()
    } finally {
      setIsUpdating(false)
    }
  }

  const effectiveRawStatus =
    job.rawStatus ||
    (String(job.status || '').toUpperCase() === 'COMPLETED'
      ? 'COMPLETED'
      : String(job.status || '').toUpperCase() === 'CANCELLED'
      ? 'CANCELLED'
      : String(job.status || '').toUpperCase() === 'PENDING'
      ? 'PENDING_CONFIRMATION'
      : 'IN_PROGRESS')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeJobDetail}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-black">Chi tiết công việc</h2>
            <StatusBadge status={effectiveRawStatus} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={closeJobDetail}
              className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Service Header Card */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4">
            <CategoryIcon category={job.category} className="size-12 shrink-0 rounded-xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black leading-tight text-foreground">
                {job.title}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Chuyên mục: <span className="font-semibold text-foreground">{job.category}</span>
              </p>
              {job.description && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-xl p-2.5 leading-relaxed">
                  {job.description}
                </p>
              )}
            </div>
          </div>

          {/* Customer Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <Avatar
              initials={job.customerName ? job.customerName.slice(0, 2).toUpperCase() : 'KH'}
              className="size-11"
              color="bg-secondary text-secondary-foreground font-black"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{job.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {job.customerPhone ? `SĐT: ${job.customerPhone}` : 'Khách hàng đặt lịch'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                closeJobDetail()
                openChatBubble('customer')
              }}
              title="Nhắn tin với khách hàng"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-brand hover:bg-muted shadow-xs transition-colors"
            >
              <MessageCircle className="size-4" />
            </button>
            <a
              href={job.customerPhone ? `tel:${job.customerPhone}` : '#'}
              title="Gọi điện cho khách hàng"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-brand hover:bg-muted shadow-xs transition-colors"
            >
              <Phone className="size-4" />
            </a>
          </div>

          {/* Meta Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <MetaRow icon={Calendar}>{job.date || 'Hôm nay'}</MetaRow>
            <MetaRow icon={Clock}>{job.time || 'Linh hoạt'}</MetaRow>
            <MetaRow icon={MapPin}>{job.address || 'TP. Hồ Chí Minh'}</MetaRow>
            <MetaRow icon={Wallet}>
              Chi phí:{' '}
              <span className="font-bold text-brand">
                {job.finalPrice != null
                  ? formatVND(job.finalPrice)
                  : job.budget > 0
                  ? formatVND(job.budget)
                  : 'Thỏa thuận trực tiếp'}
              </span>
            </MetaRow>
          </div>

          {/* THE CORE: Step-by-Step Process Checklist */}
          <JobProgressChecklist
            jobId={job.id}
            rawStatus={effectiveRawStatus}
            allowedTransitions={job.allowedTransitions}
            customerName={job.customerName}
            customerPhone={job.customerPhone}
            serviceName={job.title}
            price={job.budget}
            finalPrice={job.finalPrice}
            completionNote={job.completionNote}
            proofPhotos={job.proofPhotos || job.progressPhotos || []}
            onConfirm={handleConfirm}
            onDecline={handleDecline}
            onUpdateStatus={handleUpdateStatus}
            isBusy={isUpdating}
          />
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
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs">
      <Icon className="size-3.5 shrink-0 text-brand" />
      <span className="font-medium truncate">{children}</span>
    </div>
  )
}
