'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  MapPin,
  Send,
  Sparkles,
  Tag,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiAnalysis, IncomingRequest } from '@/lib/api/requests'
import { formatVND } from '@/lib/booking-status'
import {
  REQUEST_STATUS_META,
  URGENCY_META,
  formatBudget,
  formatRelative,
  formatTimeWindow,
  fullAddress,
} from '@/lib/incoming-request'

interface RequestDetailDrawerProps {
  request: IncomingRequest | null
  onClose: () => void
  onAccept: (request: IncomingRequest) => void
  onSubmitQuote: (request: IncomingRequest) => void
}

/** Slide-over panel with every detail of an incoming request (UC-35). */
export function RequestDetailDrawer({ request, onClose, onAccept, onSubmitQuote }: RequestDetailDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const open = Boolean(request)

  // ESC to close, lock page scroll, move focus into the dialog.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    closeBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!request) return null

  const status = REQUEST_STATUS_META[request.status]

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="request-detail-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} aria-hidden />

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <header className="border-b border-border bg-gradient-to-br from-brand/10 via-background to-background px-6 pb-5 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {request.category && (
                <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold text-brand-foreground">
                  {request.category.name}
                </span>
              )}
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', status.badge)}>{status.label}</span>
            </div>
            <button
              ref={closeBtnRef}
              id="close-request-detail"
              onClick={onClose}
              aria-label="Đóng"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          <h2 id="request-detail-title" className="mt-3 text-2xl font-black leading-tight tracking-tight">
            {request.service?.name ?? 'Yêu cầu dịch vụ'}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="size-3.5" /> {request.customer?.fullName ?? 'Ẩn danh'}</span>
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> Đăng {formatRelative(request.createdAt)}</span>
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {request.photos.length > 0 && <PhotoGallery photos={request.photos} />}

          <section>
            <SectionTitle>Mô tả sự cố</SectionTitle>
            <p className="whitespace-pre-line rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed">{request.description}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoTile icon={<CalendarClock className="size-4" />} label="Thời gian mong muốn">
              {formatTimeWindow(request.preferredStartAt, request.preferredEndAt)}
            </InfoTile>
            <InfoTile icon={<Wallet className="size-4" />} label="Ngân sách khách">
              {formatBudget(request.budgetMin, request.budgetMax)}
            </InfoTile>
            <InfoTile icon={<MapPin className="size-4" />} label="Địa chỉ" className="sm:col-span-2">
              {fullAddress(request.address)}
            </InfoTile>
            {request.service?.basePrice != null && (
              <InfoTile icon={<Tag className="size-4" />} label="Giá tham khảo dịch vụ" className="sm:col-span-2">
                Từ {formatVND(request.service.basePrice)}
              </InfoTile>
            )}
          </section>

          {request.aiAnalysis && <AiInsightPanel ai={request.aiAnalysis} />}

          <p className="rounded-2xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
            Số điện thoại của khách sẽ hiển thị sau khi bạn được chọn nhận việc.
          </p>
        </div>

        {/* Actions */}
        <footer className="grid grid-cols-2 gap-3 border-t border-border bg-card/80 px-6 py-4 backdrop-blur">
          <button
            id="submit-quote-button"
            onClick={() => onSubmitQuote(request)}
            disabled={request.hasQuoted}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-brand py-3 text-sm font-extrabold text-brand transition-all hover:bg-brand/10 active:scale-95 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            <Send className="size-4" /> {request.hasQuoted ? 'Đã gửi báo giá' : 'Gửi báo giá'}
          </button>
          <button
            id="accept-request-button"
            onClick={() => onAccept(request)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:brightness-110 active:scale-95"
          >
            <Check className="size-4" /> Nhận việc
          </button>
        </footer>
      </aside>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{children}</h3>
}

function InfoTile({ icon, label, children, className }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl border border-border bg-card p-3.5', className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold">{children}</p>
      </div>
    </div>
  )
}

function PhotoGallery({ photos }: { photos: string[] }) {
  const [active, setActive] = useState(0)
  const go = (delta: number) => setActive((i) => (i + delta + photos.length) % photos.length)

  return (
    <section>
      <SectionTitle>Hình ảnh đính kèm ({photos.length})</SectionTitle>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={photos[active]} src={photos[active]} alt={`Ảnh ${active + 1}`} className="size-full object-cover animate-in fade-in duration-300" />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Ảnh sau"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
              {active + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2">
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              className={cn(
                'size-16 overflow-hidden rounded-xl ring-2 transition-all',
                i === active ? 'ring-brand' : 'ring-transparent opacity-60 hover:opacity-100',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function AiInsightPanel({ ai }: { ai: AiAnalysis }) {
  const urgency = ai.urgency ? URGENCY_META[ai.urgency] : null
  const confidence = ai.confidence != null ? Math.round(ai.confidence * 100) : null

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-600 p-[1.5px] shadow-lg shadow-violet-500/20">
      <div className="rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 dark:from-violet-950/80 dark:to-fuchsia-950/60">
        <header className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-violet-700 dark:text-violet-300">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <Sparkles className="size-4" />
            </span>
            Phân tích AI
          </h3>
          {urgency && (
            <span className={cn('inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset dark:bg-black/20', urgency.badge)}>
              <span className={cn('size-1.5 rounded-full', urgency.dot)} /> {urgency.label}
            </span>
          )}
        </header>

        {ai.suspectedIssue && <p className="mt-4 text-base font-extrabold leading-snug text-violet-950 dark:text-violet-50">{ai.suspectedIssue}</p>}
        {ai.summary && <p className="mt-1.5 text-sm leading-relaxed text-violet-900/80 dark:text-violet-100/80">{ai.summary}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(ai.estimatedPriceMin != null || ai.estimatedPriceMax != null) && (
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-black/20">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700/70 dark:text-violet-300/70">Chi phí ước tính</p>
              <p className="mt-0.5 text-sm font-black text-violet-950 dark:text-violet-50">{formatBudget(ai.estimatedPriceMin, ai.estimatedPriceMax)}</p>
            </div>
          )}
          {confidence != null && (
            <div className="rounded-2xl bg-white/70 p-3 dark:bg-black/20">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700/70 dark:text-violet-300/70">Độ tin cậy</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-200 dark:bg-violet-900">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${confidence}%` }} />
                </div>
                <span className="text-sm font-black text-violet-950 dark:text-violet-50">{confidence}%</span>
              </div>
            </div>
          )}
        </div>

        {!!ai.suggestedTools?.length && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-violet-800 dark:text-violet-200">
              <Wrench className="size-3.5" /> Dụng cụ / vật tư nên mang
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ai.suggestedTools.map((tool) => (
                <span key={tool} className="rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200 dark:bg-black/20 dark:text-violet-200 dark:ring-violet-800">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {!!ai.recommendations?.length && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-violet-800 dark:text-violet-200">
              <Lightbulb className="size-3.5" /> Gợi ý cho thợ
            </p>
            <ul className="mt-2 space-y-1.5">
              {ai.recommendations.map((rec) => (
                <li key={rec} className="flex gap-2 text-sm text-violet-900 dark:text-violet-100">
                  <Check className="mt-0.5 size-4 shrink-0 text-fuchsia-600 dark:text-fuchsia-400" /> {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-[10px] italic text-violet-700/60 dark:text-violet-300/60">
          Kết quả AI chỉ mang tính tham khảo — vui lòng kiểm tra thực tế trước khi báo giá.
        </p>
      </div>
    </section>
  )
}
