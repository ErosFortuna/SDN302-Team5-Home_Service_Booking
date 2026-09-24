'use client'

import {
  Sparkles,
  Zap,
  Droplets,
  WashingMachine,
  PaintRoller,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BookingStatus, ServiceCategory } from '@/lib/types'

const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  Cleaning: Sparkles,
  Electrical: Zap,
  Plumbing: Droplets,
  Appliance: WashingMachine,
  Painting: PaintRoller,
}

const CATEGORY_TINT: Record<ServiceCategory, string> = {
  Cleaning: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  Electrical: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Plumbing: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  Appliance: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  Painting: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
}

export function CategoryIcon({
  category,
  className,
}: {
  category: ServiceCategory
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl',
        CATEGORY_TINT[category],
        className,
      )}
    >
      <Icon className="size-1/2" />
    </div>
  )
}

export const STATUS_META: Record<
  BookingStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    className:
      'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  quoted: {
    label: 'Quoted',
    className: 'bg-cta/20 text-amber-700 dark:text-amber-400',
    dot: 'bg-cta',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  completed: {
    label: 'Completed',
    className: 'bg-brand/15 text-brand',
    dot: 'bg-brand',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
  },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
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

/** Amber CTA button used for primary actions (Book Now, Accept Quote). */
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
