'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePause,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryInput, CategoryStatusFilter, PricingMode, ServiceCategory } from '@/lib/api/categories'
import { useAdminCategories } from '@/hooks/use-admin-categories'
import { useToast } from '@/components/provider-booking/toast'
import { CategoryIcon, PricingModeBadge } from '@/lib/category-meta'
import { CategoryFormModal } from './category-form-modal'
import { ConfirmDialog, ToggleSwitch } from './controls'

const STATUS_FILTERS: { key: CategoryStatusFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'inactive', label: 'Đã vô hiệu' },
]
const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** UC-57 / UC-58 — Service Category Management (ADMIN). */
export function CategoryManagementPage() {
  const toast = useToast()
  const { query, items, meta, loading, error, togglingIds, reload, updateFilters, goToPage, create, update, setActive } = useAdminCategories()

  const [searchInput, setSearchInput] = useState(query.search ?? '')
  const [modal, setModal] = useState<{ open: boolean; category: ServiceCategory | null }>({ open: false, category: null })
  const [confirmTarget, setConfirmTarget] = useState<ServiceCategory | null>(null)

  // Debounced search (350 ms).
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== (query.search ?? '')) updateFilters({ search: searchInput.trim() })
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput, query.search, updateFilters])

  const openCreate = () => setModal({ open: true, category: null })
  const openEdit = (category: ServiceCategory) => setModal({ open: true, category })
  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), [])

  const handleSubmit = async (input: CategoryInput) => {
    const editing = modal.category
    const result = editing ? await update(editing.id, input) : await create(input)
    if (result.ok) {
      toast.success(editing ? `Đã cập nhật "${result.category.name}"` : `Đã tạo dịch vụ "${result.category.name}"`)
      closeModal()
    }
    return result
  }

  const doToggle = async (category: ServiceCategory, next: boolean) => {
    const res = await setActive(category, next)
    if (res.ok) toast.success(next ? `Đã kích hoạt "${category.name}"` : `Đã vô hiệu hóa "${category.name}"`)
    else toast.error(res.message)
  }

  const requestToggle = (category: ServiceCategory, next: boolean) => {
    // Disabling a category that providers use deserves an explicit confirmation.
    if (!next && (category.providerCount ?? 0) > 0) return setConfirmTarget(category)
    doToggle(category, next)
  }

  const stats = meta?.stats
  const hasFilters = Boolean(query.search) || query.status !== 'all' || Boolean(query.pricingMode)
  const from = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0
  const to = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Danh mục dịch vụ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tạo, chỉnh sửa và bật/tắt các dịch vụ mà thợ có thể đăng ký và khách hàng có thể đặt.</p>
        </div>
        <button
          id="add-category-button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
        >
          <Plus className="size-4" strokeWidth={3} /> Thêm dịch vụ
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Layers className="size-5" />} label="Tổng danh mục" value={stats?.total} tone="from-violet-500 to-indigo-500" />
        <StatCard icon={<CircleCheck className="size-5" />} label="Đang hoạt động" value={stats?.active} tone="from-emerald-500 to-teal-500" />
        <StatCard icon={<CirclePause className="size-5" />} label="Đã vô hiệu hóa" value={stats?.inactive} tone="from-slate-500 to-slate-600" />
        <StatCard
          icon={<Tags className="size-5" />}
          label="Cố định / Báo giá"
          value={stats ? `${stats.fixed} / ${stats.requestQuote}` : undefined}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="category-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, mô tả hoặc mã…"
            className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} aria-label="Xóa tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border bg-muted/60 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                id={`status-${f.key}`}
                onClick={() => updateFilters({ status: f.key })}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  query.status === f.key ? 'bg-card text-violet-600 shadow-xs dark:text-violet-400' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            id="pricing-filter"
            value={query.pricingMode ?? ''}
            onChange={(e) => updateFilters({ pricingMode: (e.target.value || undefined) as PricingMode | undefined })}
            className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-bold outline-none focus:border-violet-500"
          >
            <option value="">Mọi hình thức giá</option>
            <option value="FIXED">Giá cố định</option>
            <option value="REQUEST_QUOTE">Báo giá theo yêu cầu</option>
          </select>
          <button onClick={reload} aria-label="Làm mới" className="rounded-2xl border border-border p-2 text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-extrabold">Không tải được danh mục</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={reload} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Thử lại</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5">Dịch vụ</th>
                  <th className="px-4 py-3.5">Hình thức giá</th>
                  <th className="hidden px-4 py-3.5 xl:table-cell">Mô tả</th>
                  <th className="px-4 py-3.5 text-center">Thợ</th>
                  <th className="px-4 py-3.5">Cập nhật</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y divide-border', loading && items.length > 0 && 'opacity-60 transition-opacity')}>
                {loading && items.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : items.map((c) => (
                      <tr key={c.id} className={cn('group transition-colors hover:bg-muted/30', !c.isActive && 'bg-muted/20')}>
                        <td className="px-5 py-3.5">
                          <div className={cn('flex items-center gap-3', !c.isActive && 'opacity-55')}>
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              <CategoryIcon icon={c.icon} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-extrabold">{c.name}</p>
                              <p className="truncate font-mono text-[11px] text-muted-foreground">{c.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><PricingModeBadge mode={c.pricingMode} /></td>
                        <td className="hidden max-w-xs px-4 py-3.5 xl:table-cell">
                          <p className="line-clamp-2 text-xs text-muted-foreground">{c.description || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-bold">
                            <Users className="size-3" /> {c.providerCount ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{dateFmt.format(new Date(c.updatedAt))}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <ToggleSwitch
                              id={`toggle-${c.slug}`}
                              checked={c.isActive}
                              disabled={togglingIds.has(c.id)}
                              onChange={(next) => requestToggle(c, next)}
                              label={c.isActive ? `Vô hiệu hóa ${c.name}` : `Kích hoạt ${c.name}`}
                            />
                            <span className={cn('text-xs font-bold', c.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                              {c.isActive ? 'Hoạt động' : 'Đã ẩn'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            id={`edit-${c.slug}`}
                            onClick={() => openEdit(c)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:border-violet-400 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400"
                          >
                            <Pencil className="size-3.5" /> Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="flex size-14 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-600">
                  {hasFilters ? <SearchX className="size-6" /> : <Layers className="size-6" />}
                </span>
                <p className="mt-1 font-extrabold">{hasFilters ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}</p>
                <p className="text-sm text-muted-foreground">{hasFilters ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Bắt đầu bằng việc thêm dịch vụ đầu tiên.'}</p>
                {!hasFilters && (
                  <button onClick={openCreate} className="mt-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Thêm dịch vụ</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total > 0 && !error && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:flex-row">
            <span>Hiển thị <b className="text-foreground">{from}–{to}</b> trên <b className="text-foreground">{meta.total}</b> danh mục</span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <PageBtn disabled={meta.page <= 1 || loading} onClick={() => goToPage(meta.page - 1)} label="Trang trước"><ChevronLeft className="size-4" /></PageBtn>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <PageBtn key={p} active={p === meta.page} disabled={loading} onClick={() => goToPage(p)} label={`Trang ${p}`}>{p}</PageBtn>
                ))}
                <PageBtn disabled={meta.page >= meta.totalPages || loading} onClick={() => goToPage(meta.page + 1)} label="Trang sau"><ChevronRight className="size-4" /></PageBtn>
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryFormModal open={modal.open} category={modal.category} onClose={closeModal} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`Vô hiệu hóa "${confirmTarget?.name}"?`}
        description={
          <>
            Có <b className="text-foreground">{confirmTarget?.providerCount} thợ</b> đang đăng ký kỹ năng này. Sau khi vô hiệu hóa, dịch vụ sẽ bị ẩn khỏi
            danh sách đặt lịch của khách và thợ sẽ không nhận yêu cầu mới thuộc danh mục này. Bạn có thể kích hoạt lại bất cứ lúc nào.
          </>
        }
        confirmLabel="Vô hiệu hóa"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          const target = confirmTarget
          setConfirmTarget(null)
          if (target) doToggle(target, false)
        }}
      />
    </div>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value?: number | string; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-xs animate-fade-up">
      <div className={cn('absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br opacity-15 blur-xl', tone)} aria-hidden />
      <span className={cn('flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md', tone)}>{icon}</span>
      <p className="mt-3 text-xs font-bold text-muted-foreground">{label}</p>
      {value === undefined ? <div className="mt-1 h-7 w-12 animate-pulse rounded-lg bg-muted" /> : <p className="text-2xl font-black tracking-tight">{value}</p>}
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr aria-hidden>
      <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="size-10 animate-pulse rounded-2xl bg-muted" /><div className="space-y-1.5"><div className="h-4 w-32 animate-pulse rounded bg-muted" /><div className="h-3 w-20 animate-pulse rounded bg-muted" /></div></div></td>
      <td className="px-4 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-muted" /></td>
      <td className="hidden px-4 py-4 xl:table-cell"><div className="h-3 w-48 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-4"><div className="mx-auto h-6 w-10 animate-pulse rounded-lg bg-muted" /></td>
      <td className="px-4 py-4"><div className="h-3 w-16 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-4"><div className="h-6 w-11 animate-pulse rounded-full bg-muted" /></td>
      <td className="px-5 py-4"><div className="ml-auto h-7 w-14 animate-pulse rounded-xl bg-muted" /></td>
    </tr>
  )
}

function PageBtn({ active, disabled, onClick, label, children }: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 'hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
