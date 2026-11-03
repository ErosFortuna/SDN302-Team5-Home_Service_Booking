import { cn } from '@/lib/utils'
import { STATUS_META } from '@/lib/booking-status'
import type { BookingStatus } from '@/lib/api/bookings'

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        meta.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot, status === 'IN_PROGRESS' && 'animate-pulse')} />
      {meta.label}
    </span>
  )
}

export function Card({ title, icon, action, children, className }: {
  title?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-3xl border border-border bg-card p-5 shadow-xs', className)}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
            {icon && <span className="text-brand">{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
