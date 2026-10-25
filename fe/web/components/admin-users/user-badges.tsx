import { CircleCheck, CirclePause, CircleX } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getUserInitials,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type ManagedUser,
  type ManagedUserRole,
  type ManagedUserStatus,
} from '@/lib/admin-users'

export function UserAvatar({ user, size = 'normal' }: { user: ManagedUser; size?: 'normal' | 'large' }) {
  return (
    <span className={cn(
      'flex shrink-0 items-center justify-center rounded-2xl bg-brand/10 font-black text-brand',
      size === 'large' ? 'size-16 text-xl' : 'size-10 text-xs',
    )}>
      {getUserInitials(user.fullName)}
    </span>
  )
}

export function RoleBadge({ role }: { role: ManagedUserRole }) {
  const styles: Record<ManagedUserRole, string> = {
    CUSTOMER: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    PROVIDER: 'bg-brand/10 text-brand',
    STAFF: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    ADMIN: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  }
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', styles[role])}>{USER_ROLE_LABELS[role]}</span>
}

export function StatusBadge({ status }: { status: ManagedUserStatus }) {
  const Icon = status === 'ACTIVE' ? CircleCheck : status === 'BLOCKED' ? CircleX : CirclePause
  const styles: Record<ManagedUserStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    INACTIVE: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    BLOCKED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  }
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold', styles[status])}><Icon className="size-3.5" />{USER_STATUS_LABELS[status]}</span>
}
