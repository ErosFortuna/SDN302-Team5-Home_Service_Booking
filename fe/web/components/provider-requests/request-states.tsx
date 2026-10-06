'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, Inbox, MapPinOff, RefreshCw, ShieldAlert, UserX, Wrench } from 'lucide-react'
import type { AccessBlock } from '@/hooks/use-incoming-requests'

export function RequestCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 pl-6" aria-hidden>
      <div className="flex gap-1.5">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 h-5 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-5 space-y-2.5">
        {[70, 50, 40].map((w) => (
          <div key={w} className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

export function RequestsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <p className="font-extrabold">Không tải được danh sách yêu cầu</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        id="retry-incoming"
        onClick={onRetry}
        className="mt-1 flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-90"
      >
        <RefreshCw className="size-4" /> Thử lại
      </button>
    </div>
  )
}

type EmptyVariant = 'NO_SKILLS' | 'NO_RESULTS' | 'NO_RESULTS_IN_AREA'

const EMPTY_COPY: Record<EmptyVariant, { icon: typeof Inbox; title: string; text: string }> = {
  NO_SKILLS: {
    icon: Wrench,
    title: 'Bạn chưa khai báo kỹ năng',
    text: 'Hệ thống chỉ gửi yêu cầu khớp với danh mục dịch vụ của bạn. Hãy cập nhật kỹ năng trong hồ sơ thợ.',
  },
  NO_RESULTS_IN_AREA: {
    icon: MapPinOff,
    title: 'Chưa có yêu cầu trong khu vực của bạn',
    text: 'Thử mở rộng sang mọi khu vực để xem thêm các yêu cầu phù hợp kỹ năng.',
  },
  NO_RESULTS: {
    icon: Inbox,
    title: 'Hộp thư trống',
    text: 'Hiện chưa có yêu cầu mới phù hợp. Chúng tôi sẽ hiển thị ngay khi khách hàng gửi yêu cầu.',
  },
}

export function RequestsEmpty({ variant, onExpandArea }: { variant: EmptyVariant; onExpandArea?: () => void }) {
  const { icon: Icon, title, text } = EMPTY_COPY[variant]
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="relative flex size-16 items-center justify-center rounded-3xl bg-brand/10 text-brand">
        <Icon className="size-7" />
        <span className="absolute inset-0 animate-ping rounded-3xl bg-brand/10 [animation-duration:2.5s]" />
      </span>
      <p className="mt-1 text-lg font-extrabold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {variant === 'NO_RESULTS_IN_AREA' && onExpandArea && (
        <button
          id="expand-area"
          onClick={onExpandArea}
          className="mt-1 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110"
        >
          Xem mọi khu vực
        </button>
      )}
    </div>
  )
}

const BLOCK_COPY: Record<AccessBlock['code'], { icon: typeof Inbox; title: string; tone: string }> = {
  PROVIDER_NOT_APPROVED: { icon: Clock, title: 'Hồ sơ đang chờ phê duyệt', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  PROFILE_MISSING: { icon: UserX, title: 'Chưa có hồ sơ thợ', tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  ACCOUNT_INACTIVE: { icon: ShieldAlert, title: 'Tài khoản bị hạn chế', tone: 'bg-destructive/10 text-destructive' },
  NOT_PROVIDER: { icon: ShieldAlert, title: 'Không có quyền truy cập', tone: 'bg-destructive/10 text-destructive' },
}

/** Shown when the backend `isApprovedProvider` middleware rejects the provider (403). */
export function ProviderAccessBlocked({ block }: { block: AccessBlock }) {
  const copy = BLOCK_COPY[block.code] ?? BLOCK_COPY.NOT_PROVIDER
  const Icon = copy.icon
  const rejected = block.verificationStatus === 'REJECTED'
  return (
    <div className="mx-auto mt-6 max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl animate-fade-up">
      <span className={`mx-auto flex size-16 items-center justify-center rounded-3xl ${rejected ? BLOCK_COPY.ACCOUNT_INACTIVE.tone : copy.tone}`}>
        <Icon className="size-8" />
      </span>
      <h2 className="mt-5 text-xl font-black tracking-tight">{rejected ? 'Hồ sơ bị từ chối' : copy.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{block.message}</p>
      {block.verificationStatus && (
        <p className="mt-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          Trạng thái xác minh: {block.verificationStatus}
        </p>
      )}
      <div className="mt-6">
        <Link href="/provider/bookings" className="text-sm font-bold text-brand hover:underline">
          ← Về danh sách công việc
        </Link>
      </div>
    </div>
  )
}
