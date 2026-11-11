'use client'

import { cn } from '@/lib/utils'
import type { BookingStatus, ServiceCategory } from '@/lib/types'
import type { CategoryIcon as CategoryIconKey } from '@/lib/api/categories'
import { CategoryIcon as ServiceCategoryIcon, CATEGORY_TINTS } from '@/lib/category-meta'

export function CategoryIcon({
  category,
  icon,
  slug,
  tintIndex = 0,
  className,
}: {
  category: ServiceCategory
  icon?: CategoryIconKey
  slug?: string
  tintIndex?: number
  className?: string
}) {
  const colorIndex = tintIndex >= 0 ? tintIndex % CATEGORY_TINTS.length : 0

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl',
        CATEGORY_TINTS[colorIndex],
        'text-white',
        className,
      )}
    >
      <ServiceCategoryIcon icon={icon} slug={slug} className="size-1/2" />
    </div>
  )
}

export const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: 'Chờ xác nhận',
    className:
      'bg-muted text-muted-foreground ring-1 ring-border',
    dot: 'bg-muted-foreground',
  },
  in_progress: {
    label: 'Đang thực hiện',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30',
    dot: 'bg-sky-500',
  },
  completed: {
    label: 'Hoàn thành',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-destructive/15 text-destructive ring-1 ring-destructive/30',
    dot: 'bg-destructive',
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus | string
  className?: string
}) {
  const upper = String(status || '').toUpperCase()
  const normalizedKey = (
    upper === 'COMPLETED'
      ? 'completed'
      : upper === 'CANCELLED'
      ? 'cancelled'
      : upper === 'PENDING_CONFIRMATION' || upper === 'PENDING'
      ? 'pending'
      : 'in_progress'
  ) as BookingStatus

  const meta = STATUS_META[normalizedKey] || STATUS_META.in_progress
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full px-2.5 py-1 text-xs font-bold leading-none shadow-2xs',
        meta.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full shrink-0', meta.dot, normalizedKey === 'in_progress' && 'animate-pulse')} />
      {meta.label}
    </span>
  )
}

export function Avatar({
  initials,
  className,
  color = 'bg-brand text-brand-foreground',
}: {
  initials: string
  className?: string
  color?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-sm font-bold',
        color,
        className,
      )}
    >
      {initials}
    </div>
  )
}

export function Stars({
  rating,
  className,
}: {
  rating: number
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <svg
        viewBox="0 0 24 24"
        className="size-3.5 fill-cta text-cta"
        aria-hidden="true"
      >
        <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.7 6.1 20.8l1.2-6.6L2.5 9l6.6-.9L12 2z" />
      </svg>
      <span className="font-semibold">{rating.toFixed(1)}</span>
    </span>
  )
}

/** Amber CTA button used for primary actions (Book Now, Confirm). */
export function CtaButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-sm font-bold text-cta-foreground shadow-sm transition-all hover:brightness-105 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/** Teal primary button. */
export function BrandButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground shadow-sm transition-all hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
