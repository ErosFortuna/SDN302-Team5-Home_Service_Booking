'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, Check, Clock, LoaderCircle, RefreshCw, Save, Search, ShieldCheck, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PricingMode, ServiceCategory } from '@/lib/api/categories'
import { useMySkills } from '@/hooks/use-my-skills'
import { CategoryIcon, PRICING_MODE_META } from '@/lib/category-meta'

const GROUP_ORDER: PricingMode[] = ['FIXED', 'REQUEST_QUOTE']
type ViewFilter = 'all' | 'selected'

const VERIFICATION_BADGE = {
  VERIFIED: { label: 'Đã xác minh', icon: ShieldCheck, cls: 'bg-white/20 text-white' },
  PENDING: { label: 'Chờ xác minh', icon: Clock, cls: 'bg-amber-400/25 text-amber-50' },
  REJECTED: { label: 'Bị từ chối', icon: AlertTriangle, cls: 'bg-red-500/30 text-red-50' },
} as const

/** UC-33 — Provider "My Skills / Capabilities". */
export function MySkillsPage() {
  const { data, selected, loading, saving, error, dirty, added, removed, toggle, setMany, reset, save, reload } = useMySkills()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewFilter>('all')

  const byId = useMemo(() => new Map((data?.available ?? []).map((c) => [c.id, c])), [data])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const visible = (data?.available ?? []).filter(
      (c) => (view === 'all' || selected.has(c.id)) && (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    )
    return GROUP_ORDER.map((mode) => ({ mode, items: visible.filter((c) => c.pricingMode === mode) })).filter((g) => g.items.length)
  }, [data, search, view, selected])

  const selectedList = [...selected].map((id) => byId.get(id)).filter(Boolean) as ServiceCategory[]
  const verification = data?.profile.verificationStatus ? VERIFICATION_BADGE[data.profile.verificationStatus] : null

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-extrabold">Không tải được danh sách kỹ năng</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <button onClick={reload} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
          <RefreshCw className="size-4" /> Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-brand/20 sm:p-8 animate-fade-up">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">Hồ sơ năng lực</p>
              {verification && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', verification.cls)}>
                  <verification.icon className="size-3" /> {verification.label}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Kỹ năng của tôi</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              Chọn những dịch vụ bạn có thể thực hiện. Hệ thống chỉ gửi yêu cầu mới thuộc các kỹ năng này đến bạn.
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div className="rounded-2xl bg-white/15 px-5 py-3 ring-1 ring-white/20 backdrop-blur">
              <p className="text-[11px] font-bold text-white/80">Đã chọn</p>
              <p className="text-3xl font-black">
                {loading ? '–' : selected.size}
                <span className="text-base font-bold text-white/70"> / {data?.available.length ?? '–'}</span>
              </p>
            </div>
            <button
              id="save-skills-button"
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-teal-700 shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
            </button>
          </div>
        </div>
      </section>

      {/* Disabled-by-admin notice */}
      {!!data?.inactiveSkills.length && (
        <div role="status" className="mt-4 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>
            <b>{data.inactiveSkills.map((s) => s.name).join(', ')}</b> đã bị quản trị viên tạm ngừng. Các kỹ năng này không được dùng để ghép yêu cầu
            và sẽ được gỡ khỏi hồ sơ khi bạn lưu.
          </p>
        </div>
      )}

      {/* Selected tags */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Kỹ năng đã chọn</h2>
          {selected.size > 0 && (
            <button onClick={() => setMany([...selected], false)} className="text-xs font-bold text-muted-foreground hover:text-destructive">
              Bỏ chọn tất cả
            </button>
          )}
        </div>
        <div className="mt-3 flex min-h-9 flex-wrap gap-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-muted" />)
          ) : selectedList.length ? (
            selectedList.map((c) => (
              <span
                key={c.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-1 text-xs font-bold ring-1 ring-inset animate-in zoom-in-95 fade-in duration-150',
                  added.includes(c.id) ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300' : 'bg-brand/10 text-brand ring-brand/30',
                )}
              >
                <CategoryIcon icon={c.icon} className="size-3.5" />
                {c.name}
                <button onClick={() => toggle(c.id)} aria-label={`Bỏ ${c.name}`} className="rounded-full p-0.5 hover:bg-black/10">
                  <X className="size-3" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Chưa chọn kỹ năng nào — bạn sẽ không nhận được yêu cầu mới.</p>
          )}
        </div>
      </section>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="skill-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm dịch vụ…"
            className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex rounded-2xl border border-border bg-muted/60 p-1">
          {(['all', 'selected'] as ViewFilter[]).map((v) => (
            <button
              key={v}
              id={`view-${v}`}
              onClick={() => setView(v)}
              className={cn('rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all', view === v ? 'bg-card text-brand shadow-xs' : 'text-muted-foreground hover:text-foreground')}
            >
              {v === 'all' ? 'Tất cả dịch vụ' : `Đã chọn (${selected.size})`}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="mt-6 space-y-8">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-14 text-center">
            <p className="font-extrabold">{data?.available.length ? 'Không có dịch vụ phù hợp' : 'Hệ thống chưa có dịch vụ nào đang hoạt động'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{data?.available.length ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Vui lòng quay lại sau.'}</p>
          </div>
        ) : (
          groups.map(({ mode, items }) => {
            const meta = PRICING_MODE_META[mode]
            const ids = items.map((c) => c.id)
            const allOn = ids.every((id) => selected.has(id))
            const count = ids.filter((id) => selected.has(id)).length
            return (
              <section key={mode} aria-labelledby={`group-${mode}`}>
                <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id={`group-${mode}`} className="flex items-center gap-2 text-base font-black tracking-tight">
                      <span className={cn('h-5 w-1.5 rounded-full bg-gradient-to-b', meta.accent)} />
                      {meta.label}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{count}/{items.length}</span>
                    </h2>
                    <p className="mt-0.5 pl-3.5 text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                  <button
                    id={`select-all-${mode}`}
                    onClick={() => setMany(ids, !allOn)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                  >
                    {allOn ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                  </button>
                </header>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((c) => (
                    <SkillTile key={c.id} category={c} checked={selected.has(c.id)} changed={added.includes(c.id) || removed.includes(c.id)} onToggle={() => toggle(c.id)} />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* Sticky save bar */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 transition-all duration-300',
          dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
        )}
      >
        <div className="mx-auto mb-4 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-3xl border border-border bg-card/95 px-5 py-3.5 shadow-2xl backdrop-blur sm:flex-row">
          <p className="text-sm">
            <b>Thay đổi chưa lưu:</b>{' '}
            {added.length > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400">+{added.length} thêm</span>}
            {added.length > 0 && removed.length > 0 && <span className="text-muted-foreground"> · </span>}
            {removed.length > 0 && <span className="font-bold text-destructive">−{removed.length} bỏ</span>}
            {selected.size === 0 && <span className="ml-2 text-xs font-semibold text-amber-600">(bạn sẽ không nhận yêu cầu nào)</span>}
          </p>
          <div className="flex gap-2">
            <button id="reset-skills" onClick={reset} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
              <Undo2 className="size-4" /> Hoàn tác
            </button>
            <button
              id="save-skills-bar"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/25 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />} Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkillTile({ category, checked, changed, onToggle }: { category: ServiceCategory; checked: boolean; changed: boolean; onToggle: () => void }) {
  return (
    <button
      id={`skill-${category.slug}`}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'group relative flex items-start gap-3 rounded-3xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.98]',
        checked ? 'border-brand bg-brand/5 shadow-md shadow-brand/10' : 'border-border bg-card hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors',
          checked ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground group-hover:text-brand',
        )}
      >
        <CategoryIcon icon={category.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-extrabold">{category.name}</span>
          {changed && <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Chưa lưu" />}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{category.description || 'Chưa có mô tả.'}</span>
      </span>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
          checked ? 'scale-100 border-brand bg-brand text-brand-foreground' : 'border-border text-transparent',
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  )
}
