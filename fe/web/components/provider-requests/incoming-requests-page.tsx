'use client'

import { useCallback, useMemo, useState } from 'react'
import { ArrowDownWideNarrow, CalendarClock, ChevronLeft, ChevronRight, Inbox, MapPin, RefreshCw, Siren, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IncomingRequest, IncomingSort } from '@/lib/api/requests'
import { useIncomingRequests } from '@/hooks/use-incoming-requests'
import { useToast } from '@/components/provider-booking/toast'
import { RequestCard } from './request-card'
import { RequestDetailDrawer } from './request-detail-drawer'
import { ProviderAccessBlocked, RequestCardSkeleton, RequestsEmpty, RequestsError } from './request-states'

const SORTS: { key: IncomingSort; label: string; icon: typeof Inbox }[] = [
  { key: 'newest', label: 'Mới nhất', icon: ArrowDownWideNarrow },
  { key: 'soonest', label: 'Sắp diễn ra', icon: CalendarClock },
]

/** UC-35 — Provider "inbox" of new service requests matching their skills. */
export function IncomingRequestsPage() {
  const toast = useToast()
  const { query, requests, meta, loading, error, accessBlock, updateFilters, goToPage, reload } = useIncomingRequests()
  const [selected, setSelected] = useState<IncomingRequest | null>(null)

  const urgentCount = useMemo(
    () => requests.filter((r) => r.aiAnalysis?.urgency === 'EMERGENCY' || r.aiAnalysis?.urgency === 'HIGH').length,
    [requests],
  )
  const withAiCount = useMemo(() => requests.filter((r) => r.aiAnalysis).length, [requests])

  const closeDrawer = useCallback(() => setSelected(null), [])
  // UI only for now — actions are wired in the Accept Request / Submit Quote use cases.
  const handleAccept = useCallback(
    (r: IncomingRequest) => toast.info(`"Nhận việc" cho ${r.service?.name ?? 'yêu cầu'} sẽ được kết nối ở chức năng tiếp theo.`),
    [toast],
  )
  const handleQuote = useCallback(
    (r: IncomingRequest) => toast.info(`"Gửi báo giá" cho ${r.service?.name ?? 'yêu cầu'} sẽ được kết nối ở chức năng tiếp theo.`),
    [toast],
  )

  if (accessBlock) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProviderAccessBlocked block={accessBlock} />
      </div>
    )
  }

  const showSkeleton = loading && requests.length === 0
  const isEmpty = !loading && !error && requests.length === 0
  const emptyVariant = meta?.reason === 'NO_SKILLS' ? 'NO_SKILLS' : query.area === 'mine' && meta?.serviceAreas.length ? 'NO_RESULTS_IN_AREA' : 'NO_RESULTS'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-teal-600 to-emerald-700 p-6 text-white shadow-xl shadow-brand/20 sm:p-8 animate-fade-up">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              Hộp thư yêu cầu
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Yêu cầu mới dành cho bạn</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              Chỉ hiển thị yêu cầu khớp với kỹ năng
              {meta?.matchedCategories.length ? <> <b>{meta.matchedCategories.map((c) => c.name).join(', ')}</b></> : null}
              {query.area === 'mine' && meta?.serviceAreas.length ? <> tại <b>{meta.serviceAreas.join(', ')}</b></> : null}.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[24rem]">
            <Stat icon={<Inbox className="size-4" />} label="Phù hợp" value={meta?.total} loading={showSkeleton} />
            <Stat icon={<Siren className="size-4" />} label="Gấp (trang này)" value={urgentCount} loading={showSkeleton} />
            <Stat icon={<Sparkles className="size-4" />} label="Có phân tích AI" value={withAiCount} loading={showSkeleton} />
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Lọc theo danh mục">
          <FilterChip id="category-all" active={!query.category} onClick={() => updateFilters({ category: undefined })}>
            Tất cả
          </FilterChip>
          {meta?.matchedCategories.map((c) => (
            <FilterChip key={c.id} id={`category-${c.slug}`} active={query.category === c.id} onClick={() => updateFilters({ category: c.id })}>
              {c.name}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border bg-muted/60 p-1">
            {SORTS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                id={`sort-${key}`}
                onClick={() => updateFilters({ sort: key })}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  query.sort === key ? 'bg-card text-brand shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          <button
            id="toggle-area"
            onClick={() => updateFilters({ area: query.area === 'mine' ? 'all' : 'mine' })}
            aria-pressed={query.area === 'mine'}
            className={cn(
              'flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all',
              query.area === 'mine' ? 'border-brand/40 bg-brand/10 text-brand' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <MapPin className="size-3.5" /> {query.area === 'mine' ? 'Khu vực của tôi' : 'Mọi khu vực'}
          </button>

          <button
            id="refresh-incoming"
            onClick={reload}
            aria-label="Làm mới"
            className="rounded-2xl border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </button>
        </div>
      </section>

      {/* Content */}
      <section className="mt-6" aria-busy={loading} aria-live="polite">
        {error ? (
          <RequestsError message={error} onRetry={reload} />
        ) : isEmpty ? (
          <RequestsEmpty variant={emptyVariant} onExpandArea={() => updateFilters({ area: 'all' })} />
        ) : (
          <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', loading && !showSkeleton && 'opacity-60 transition-opacity')}>
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => <RequestCardSkeleton key={i} />)
              : requests.map((r, i) => <RequestCard key={r.id} request={r} index={i} onViewDetails={setSelected} />)}
          </div>
        )}
      </section>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && !error && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Phân trang">
          <PageButton id="page-prev" disabled={meta.page <= 1 || loading} onClick={() => goToPage(meta.page - 1)} aria-label="Trang trước">
            <ChevronLeft className="size-4" />
          </PageButton>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <PageButton key={p} id={`page-${p}`} active={p === meta.page} disabled={loading} onClick={() => goToPage(p)}>
              {p}
            </PageButton>
          ))}
          <PageButton id="page-next" disabled={meta.page >= meta.totalPages || loading} onClick={() => goToPage(meta.page + 1)} aria-label="Trang sau">
            <ChevronRight className="size-4" />
          </PageButton>
        </nav>
      )}

      <RequestDetailDrawer request={selected} onClose={closeDrawer} onAccept={handleAccept} onSubmitQuote={handleQuote} />
    </div>
  )
}

function Stat({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value?: number; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-white/80">{icon} {label}</p>
      {loading ? <div className="mt-1.5 h-7 w-10 animate-pulse rounded-lg bg-white/30" /> : <p className="mt-0.5 text-2xl font-black">{value ?? 0}</p>}
    </div>
  )
}

function FilterChip({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-2xl border px-4 py-2 text-xs font-bold transition-all active:scale-95',
        active
          ? 'border-foreground bg-foreground text-background shadow-md'
          : 'border-border bg-card text-muted-foreground hover:border-brand/50 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function PageButton({ active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        'flex size-10 items-center justify-center rounded-xl border text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'border-brand bg-brand text-brand-foreground shadow-md shadow-brand/20' : 'border-border bg-card hover:border-brand/50',
        className,
      )}
    />
  )
}
