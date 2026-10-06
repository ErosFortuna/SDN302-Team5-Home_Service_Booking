'use client'

import { memo } from 'react'
import { CalendarClock, ChevronRight, Clock, ImageIcon, MapPin, Send, Sparkles, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IncomingRequest } from '@/lib/api/requests'
import {
  REQUEST_STATUS_META,
  URGENCY_META,
  formatBudget,
  formatRelative,
  formatTimeWindow,
  hoursUntil,
  shortAddress,
} from '@/lib/incoming-request'

interface RequestCardProps {
  request: IncomingRequest
  onViewDetails: (request: IncomingRequest) => void
  index?: number
}

function RequestCardBase({ request, onViewDetails, index = 0 }: RequestCardProps) {
  const urgency = request.aiAnalysis?.urgency ? URGENCY_META[request.aiAnalysis.urgency] : null
  const status = REQUEST_STATUS_META[request.status]
  const hoursLeft = hoursUntil(request.preferredStartAt)
  const startsSoon = hoursLeft > 0 && hoursLeft <= 6

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xs transition-all duration-300',
        'hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 animate-fade-up',
      )}
    >
      {/* Urgency accent strip */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', urgency?.dot ?? 'bg-border')} />

      <div className="flex flex-1 flex-col p-5 pl-6">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {request.category && (
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold text-brand-foreground">
              {request.category.name}
            </span>
          )}
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', status.badge)}>
            {status.label}
          </span>
          {urgency && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', urgency.badge)}>
              <span className={cn('size-1.5 rounded-full', urgency.dot, request.aiAnalysis?.urgency === 'EMERGENCY' && 'animate-pulse')} />
              {urgency.label}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="size-3" /> {formatRelative(request.createdAt)}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="mt-3 text-base font-extrabold leading-snug tracking-tight">
          {request.service?.name ?? 'Yêu cầu dịch vụ'}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{request.description}</p>

        {/* Key facts */}
        <ul className="mt-4 space-y-2 text-[13px]">
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0 text-brand" />
            <span className="font-semibold">{formatTimeWindow(request.preferredStartAt, request.preferredEndAt)}</span>
            {startsSoon && (
              <span className="rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-orange-600 dark:text-orange-400">
                Còn {Math.max(1, Math.round(hoursLeft))}h
              </span>
            )}
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-brand" />
            <span className="truncate">{shortAddress(request.address)}</span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4 shrink-0 text-brand" />
            <span>{formatBudget(request.budgetMin, request.budgetMax)}</span>
          </li>
        </ul>

        {/* Photo + AI hints */}
        {(request.photos.length > 0 || request.aiAnalysis) && (
          <div className="mt-4 flex items-center gap-2">
            {request.photos.length > 0 && (
              <div className="relative size-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={request.photos[0]} alt="" className="size-full object-cover" loading="lazy" />
                {request.photos.length > 1 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-bold text-white">
                    +{request.photos.length - 1}
                  </span>
                )}
              </div>
            )}
            {request.aiAnalysis?.suspectedIssue ? (
              <p className="flex min-w-0 items-center gap-1.5 rounded-xl bg-violet-500/10 px-2.5 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="size-3.5 shrink-0" />
                <span className="truncate">{request.aiAnalysis.suspectedIssue}</span>
              </p>
            ) : (
              request.photos.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageIcon className="size-3.5" /> {request.photos.length} ảnh đính kèm
                </span>
              )
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          {request.hasQuoted ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Send className="size-3.5" /> Đã gửi báo giá
            </span>
          ) : (
            <span className="truncate text-xs text-muted-foreground">
              Khách: <span className="font-semibold text-foreground">{request.customer?.fullName ?? 'Ẩn danh'}</span>
            </span>
          )}
          <button
            id={`view-request-${request.id}`}
            onClick={() => onViewDetails(request)}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-foreground px-3.5 py-2 text-xs font-extrabold text-background transition-all hover:bg-brand hover:text-brand-foreground active:scale-95"
          >
            Xem chi tiết <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        </div>
      </div>
    </article>
  )
}

export const RequestCard = memo(RequestCardBase)
