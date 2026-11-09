'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  History,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProviderBooking } from '@/hooks/use-provider-booking'
import {
  STATUS_META,
  formatAddress,
  formatDateTime,
  formatTime,
  formatVND,
} from '@/lib/booking-status'
import type { ProviderBooking } from '@/lib/api/bookings'
import { BookingStatusBadge, Card } from './ui'
import { JobProgressChecklist } from './job-progress-checklist'
import { parseRequestTitleAndDesc } from '@/lib/api/service-requests'

export function ProviderBookingDetailView({ bookingId }: { bookingId: string }) {
  const { booking, loading, error, pendingAction, reload, updateStatus, confirm, decline } =
    useProviderBooking(bookingId)

  if (loading && !booking) return <DetailSkeleton />
  if (error && !booking) return <ErrorState message={error} onRetry={reload} />
  if (!booking) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-brand transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Danh sách công việc
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const parsed = parseRequestTitleAndDesc(
                (booking as any).request?.description,
                booking.service?.name ?? 'Dịch vụ tại nhà'
              );
              return (
                <>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    {parsed.title}
                  </h1>
                  <BookingStatusBadge status={booking.status} />
                  {booking.service?.name && booking.service.name !== parsed.title && (
                    <div className="w-full">
                      <span className="text-xs font-semibold text-brand">
                        Dịch vụ: {booking.service.name}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">#{booking.id}</p>
        </div>
        <button
          id="refresh-booking-button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground sm:self-auto shadow-xs"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Làm mới
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Column: Step-by-Step Process Checklist */}
        <div className="space-y-6 lg:col-span-2">
          <JobProgressChecklist
            jobId={booking.id}
            rawStatus={booking.status}
            allowedTransitions={booking.allowedTransitions}
            scheduledStartAt={booking.scheduledStartAt}
            scheduledEndAt={booking.scheduledEndAt}
            address={booking.address}
            customerName={booking.customer?.fullName}
            customerPhone={booking.customer?.phone}
            serviceName={booking.service?.name}
            price={booking.price}
            finalPrice={booking.finalPrice}
            completionNote={booking.completionNote}
            proofPhotos={booking.proofPhotos || booking.progressPhotos || []}
            onConfirm={confirm}
            onDecline={decline}
            onUpdateStatus={updateStatus}
            isBusy={pendingAction !== null}
            pendingAction={pendingAction}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <CustomerCard booking={booking} />
            <ScheduleCard booking={booking} />
          </div>
        </div>

        {/* Right column: Info & Timeline */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <CostSummary booking={booking} />
          <HistoryTimeline booking={booking} />
        </aside>
      </div>
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

function CustomerCard({ booking }: { booking: ProviderBooking }) {
  const c = booking.customer
  const initials = (c?.fullName ?? '?').split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()

  return (
    <Card title="Khách hàng" icon={<User className="size-4" />}>
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-sm font-black text-secondary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">{c?.fullName ?? 'Không rõ'}</p>
          {c?.email && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="size-3" /> {c.email}
            </p>
          )}
        </div>
      </div>
      {c?.phone && (
        <a
          href={`tel:${c.phone}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-bold text-brand transition-colors hover:bg-secondary"
        >
          <Phone className="size-3.5" /> Gọi {c.phone}
        </a>
      )}
    </Card>
  )
}

function ScheduleCard({ booking }: { booking: ProviderBooking }) {
  return (
    <Card title="Lịch hẹn & địa chỉ" icon={<Calendar className="size-4" />}>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2.5">
          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{formatDateTime(booking.scheduledStartAt)}</span>
        </li>
        <li className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Dự kiến đến <b>{formatTime(booking.scheduledEndAt)}</b>
            {booking.startedAt && <span className="block text-xs text-muted-foreground">Bắt đầu lúc {formatTime(booking.startedAt)}</span>}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{formatAddress(booking.address)}</span>
        </li>
      </ul>
    </Card>
  )
}

function CostSummary({ booking }: { booking: ProviderBooking }) {
  return (
    <Card title="Chi phí" icon={<ReceiptText className="size-4" />}>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Giá dịch vụ niêm yết (tham khảo)</dt>
          <dd className="font-semibold tabular-nums">{formatVND(booking.price)}</dd>
        </div>
        {booking.finalPrice != null && (
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-bold">Giá cuối đã thỏa thuận</dt>
            <dd className="text-xl font-black tabular-nums text-brand">{formatVND(booking.finalPrice)}</dd>
          </div>
        )}
      </dl>
    </Card>
  )
}

function HistoryTimeline({ booking }: { booking: ProviderBooking }) {
  const items = [...booking.statusHistory].reverse()
  if (items.length === 0) return null

  return (
    <Card title="Lịch sử trạng thái" icon={<History className="size-4" />}>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {items.map((h, i) => (
          <li key={`${h.changedAt}-${i}`} className="relative">
            <span className={cn('absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card', STATUS_META[h.to]?.dot || 'bg-brand')} />
            <p className="text-sm font-bold">{STATUS_META[h.to]?.label || h.to}</p>
            <p className="text-[11px] text-muted-foreground">{formatDateTime(h.changedAt)}</p>
            {h.note && <p className="mt-0.5 text-xs italic text-muted-foreground">{h.note}</p>}
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ─── States ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <div className="h-8 w-72 rounded-xl bg-muted" />
      <div className="mt-6 h-20 rounded-3xl bg-muted" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-40 rounded-3xl bg-muted" />
            <div className="h-40 rounded-3xl bg-muted" />
          </div>
          <div className="h-56 rounded-3xl bg-muted" />
        </div>
        <div className="h-72 rounded-3xl bg-muted" />
      </div>
      <span className="sr-only">
        <LoaderCircle /> Đang tải...
      </span>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="mt-4 text-lg font-black">Không thể tải booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 flex gap-2">
        <Link href="/" className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
          Quay lại
        </Link>
        <button onClick={onRetry} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground hover:brightness-110">
          Thử lại
        </button>
      </div>
    </div>
  )
}
