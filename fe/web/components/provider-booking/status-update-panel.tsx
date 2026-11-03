'use client'

import { useState } from 'react'
import { Navigation, MapPin, Play, Send, CircleCheck, LoaderCircle, Hourglass, PartyPopper, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatVND } from '@/lib/booking-status'
import type { BookingStatus, ProviderBooking, StatusUpdatePayload } from '@/lib/api/bookings'
import { Card } from './ui'

type Variant = 'primary' | 'secondary' | 'cta'

const ACTIONS: Partial<Record<BookingStatus, { label: string; hint: string; icon: typeof Play; variant: Variant }>> = {
  PROVIDER_ON_THE_WAY: { label: 'Bắt đầu di chuyển', hint: 'Thông báo cho khách bạn đang trên đường', icon: Navigation, variant: 'secondary' },
  ARRIVED: { label: 'Đã đến nơi', hint: 'Xác nhận bạn đã có mặt tại địa chỉ', icon: MapPin, variant: 'secondary' },
  IN_PROGRESS: { label: 'Bắt đầu thực hiện', hint: 'Start Service — bắt đầu tính thời gian thi công', icon: Play, variant: 'primary' },
  AWAITING_APPROVAL: { label: 'Gửi chi phí phát sinh để duyệt', hint: 'Khách cần duyệt trước khi bạn hoàn thành', icon: Send, variant: 'secondary' },
  COMPLETED: { label: 'Đánh dấu hoàn thành', hint: 'Mark as Completed — kết thúc dịch vụ', icon: CircleCheck, variant: 'cta' },
}

/** Show primary action first, completion last. */
const ORDER: BookingStatus[] = ['IN_PROGRESS', 'PROVIDER_ON_THE_WAY', 'ARRIVED', 'AWAITING_APPROVAL', 'COMPLETED']

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-brand text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110',
  cta: 'bg-cta text-cta-foreground shadow-md shadow-cta/20 hover:brightness-105',
  secondary: 'border border-border bg-background text-foreground hover:border-brand hover:text-brand',
}

interface Props {
  booking: ProviderBooking
  pendingAction: string | null
  onUpdateStatus: (payload: StatusUpdatePayload) => Promise<boolean>
}

export function StatusUpdatePanel({ booking, pendingAction, onUpdateStatus }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pendingCount = booking.materials.filter((m) => m.approvalStatus === 'PENDING').length
  const transitions = ORDER.filter((s) => booking.allowedTransitions.includes(s))
  const busy = pendingAction !== null

  const disabledReason = (target: BookingStatus): string | null => {
    if (target === 'AWAITING_APPROVAL' && pendingCount === 0) return 'Chưa có vật tư/chi phí nào chờ duyệt'
    if (target === 'COMPLETED' && pendingCount > 0) return `Còn ${pendingCount} hạng mục chưa được khách duyệt`
    return null
  }

  const handleClick = (target: BookingStatus) => {
    if (target === 'COMPLETED') setConfirmOpen(true)
    else onUpdateStatus({ status: target })
  }

  return (
    <Card title="Cập nhật tiến độ" icon={<Play className="size-4" />}>
      {booking.status === 'AWAITING_APPROVAL' && (
        <StateNotice tone="orange" icon={Hourglass} title="Đang chờ khách hàng duyệt">
          Khách đang xem xét {formatVND(booking.pendingFees)} chi phí phát sinh. Trạng thái sẽ tự quay về
          &ldquo;Đang thực hiện&rdquo; khi khách phản hồi.
        </StateNotice>
      )}

      {booking.status === 'COMPLETED' && (
        <StateNotice tone="emerald" icon={PartyPopper} title="Dịch vụ đã hoàn thành">
          Hoàn thành lúc {formatDateTime(booking.completedAt)}.
          {booking.completionNote && <span className="mt-1 block italic">&ldquo;{booking.completionNote}&rdquo;</span>}
        </StateNotice>
      )}

      {transitions.length === 0 && !['AWAITING_APPROVAL', 'COMPLETED'].includes(booking.status) && (
        <p className="text-sm text-muted-foreground">Không có thao tác nào khả dụng ở trạng thái hiện tại.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {transitions.map((target) => {
          const action = ACTIONS[target]!
          const reason = disabledReason(target)
          const loading = pendingAction === `status:${target}`
          const Icon = loading ? LoaderCircle : action.icon

          return (
            <div key={target}>
              <button
                id={`status-action-${target.toLowerCase()}`}
                onClick={() => handleClick(target)}
                disabled={busy || reason !== null}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                  VARIANT_STYLES[action.variant],
                )}
              >
                <Icon className={cn('size-5 shrink-0', loading && 'animate-spin')} />
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{action.label}</span>
                  <span className="block text-[11px] font-medium opacity-80">{reason ?? action.hint}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {confirmOpen && (
        <CompleteConfirmDialog
          booking={booking}
          loading={pendingAction === 'status:COMPLETED'}
          onClose={() => setConfirmOpen(false)}
          onConfirm={async (note) => {
            const ok = await onUpdateStatus({ status: 'COMPLETED', confirmCompletion: true, note })
            if (ok) setConfirmOpen(false)
          }}
        />
      )}
    </Card>
  )
}

function StateNotice({ tone, icon: Icon, title, children }: {
  tone: 'orange' | 'emerald'
  icon: typeof Play
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-3 flex gap-3 rounded-2xl p-3.5 text-xs',
        tone === 'orange' ? 'bg-orange-500/10 text-orange-800 dark:text-orange-200' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  )
}

function CompleteConfirmDialog({ booking, loading, onClose, onConfirm }: {
  booking: ProviderBooking
  loading: boolean
  onClose: () => void
  onConfirm: (note?: string) => void
}) {
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={loading ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-dialog-title"
        className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <button onClick={onClose} disabled={loading} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Đóng">
          <X className="size-5" />
        </button>

        <div className="flex size-12 items-center justify-center rounded-2xl bg-cta/20 text-cta-foreground dark:text-cta">
          <TriangleAlert className="size-6" />
        </div>
        <h3 id="complete-dialog-title" className="mt-4 text-lg font-black tracking-tight">Xác nhận hoàn thành dịch vụ?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sau khi xác nhận, bạn sẽ không thể thay đổi trạng thái hay thêm chi phí cho booking này.
        </p>

        <dl className="mt-4 space-y-1.5 rounded-2xl bg-muted/50 p-3.5 text-sm">
          <Row label="Giá thỏa thuận" value={formatVND(booking.price)} />
          <Row label="Chi phí phát sinh (đã duyệt)" value={formatVND(booking.additionalFees)} />
          <div className="border-t border-border pt-1.5">
            <Row label="Tổng thanh toán" value={formatVND(booking.totalAmount)} strong />
          </div>
        </dl>

        <label htmlFor="completion-note" className="mt-4 block text-xs font-bold">Ghi chú nghiệm thu (tùy chọn)</label>
        <textarea
          id="completion-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="vd: Đã thay ống và kiểm tra rò rỉ, khách đã kiểm tra."
          className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
        />

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs font-medium">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
          Tôi xác nhận đã hoàn thành toàn bộ công việc và khách hàng đã kiểm tra.
        </label>

        <div className="mt-5 flex gap-2.5">
          <button onClick={onClose} disabled={loading} className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold hover:bg-muted disabled:opacity-50">
            Hủy
          </button>
          <button
            id="confirm-complete-button"
            onClick={() => onConfirm(note.trim() || undefined)}
            disabled={!checked || loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cta py-3 text-sm font-extrabold text-cta-foreground shadow-md shadow-cta/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <CircleCheck className="size-4" />}
            Xác nhận hoàn thành
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-semibold', strong && 'text-base font-black text-brand')}>{value}</dd>
    </div>
  )
}
