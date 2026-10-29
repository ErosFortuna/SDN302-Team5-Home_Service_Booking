'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, CirclePause, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import type { ServiceCategory } from '@/lib/api/categories'
import { apiRequest, getErrorMessage } from '@/lib/api/client'
import { adminServiceApi, type AdminService, type AdminServiceInput, type AdminServiceListResponse, type AdminServiceQuery, type ServicePricingType, type ServiceStatusFilter } from '@/lib/api/admin-services'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/provider-booking/toast'
import { ConfirmDialog } from '@/components/admin-categories/controls'

const DEFAULT_QUERY: AdminServiceQuery = { page: 1, limit: 10, status: 'all', search: '' }
const STATUS_OPTIONS: { key: ServiceStatusFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'inactive', label: 'Đã ẩn' },
]

const emptyForm = (categoryId = ''): AdminServiceInput => ({
  categoryId,
  name: '',
  description: '',
  basePrice: 0,
  estimatedDurationMinutes: 60,
  pricingType: 'QUOTE_REQUIRED',
  requirements: [],
})

export function ServiceManagementPage({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast()
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [items, setItems] = useState<AdminService[]>([])
  const [meta, setMeta] = useState<AdminServiceListResponse['meta'] | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [modalService, setModalService] = useState<AdminService | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null)
  const [form, setForm] = useState<AdminServiceInput>(emptyForm())
  const [requirementsText, setRequirementsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const reload = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    return adminServiceApi.list(query, signal)
      .then((response) => {
        if (!response.data) throw new Error('Máy chủ không trả về danh sách dịch vụ')
        setItems(response.data)
        setMeta(response.meta)
      })
      .catch((reason) => {
        if ((reason as Error).name !== 'AbortError') setError(getErrorMessage(reason))
      })
      .finally(() => !signal?.aborted && setLoading(false))
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    void reload(controller.signal)
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<ServiceCategory[]>('/admin/categories?page=1&limit=100&status=all', { signal: controller.signal })
      .then((response) => {
        if (!response.data) throw new Error('Máy chủ không trả về danh sách danh mục')
        setCategories(response.data)
      })
      .catch((reason) => (reason as Error).name !== 'AbortError' && toast.error(getErrorMessage(reason)))
    return () => controller.abort()
  }, [toast])

  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchInput.trim()
      setQuery((current) => current.search === search ? current : { ...current, search, page: 1 })
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const openCreate = () => {
    setForm(emptyForm(categories[0]?.id ?? ''))
    setRequirementsText('')
    setModalService(null)
  }

  const openEdit = (service: AdminService) => {
    setForm({
      categoryId: service.category?.id ?? '',
      name: service.name,
      description: service.description ?? '',
      basePrice: service.basePrice,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
      pricingType: service.pricingType,
      requirements: service.requirements ?? [],
    })
    setRequirementsText((service.requirements ?? []).join('\n'))
    setModalService(service)
  }

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const input = {
      ...form,
      requirements: requirementsText.split('\n').map((item) => item.trim()).filter(Boolean),
    }
    try {
      const response = modalService
        ? await adminServiceApi.update(modalService.id, input)
        : await adminServiceApi.create(input)
      if (!response.data) throw new Error('Máy chủ không trả về dịch vụ đã lưu')
      toast.success(modalService ? 'Đã cập nhật dịch vụ' : 'Đã tạo dịch vụ')
      setModalService(undefined)
      await reload()
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (service: AdminService, isActive: boolean) => {
    setBusyIds((current) => new Set(current).add(service.id))
    try {
      const response = await adminServiceApi.setActive(service.id, isActive)
      if (!response.data) throw new Error('Máy chủ không trả về trạng thái dịch vụ đã cập nhật')
      const updatedService = response.data
      setItems((current) => current.map((item) => item.id === service.id ? updatedService : item))
      setMeta((current) => current ? {
        ...current,
        stats: {
          ...current.stats,
          active: current.stats.active + (isActive ? 1 : -1),
          inactive: current.stats.inactive + (isActive ? -1 : 1),
        },
      } : current)
      toast.success(isActive ? 'Đã kích hoạt dịch vụ' : 'Đã ẩn dịch vụ')
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(service.id)
        return next
      })
    }
  }

  const deleteService = async () => {
    if (!deleteTarget) return
    const service = deleteTarget
    setBusyIds((current) => new Set(current).add(service.id))
    try {
      const response = await adminServiceApi.delete(service.id)
      if (!response.data) throw new Error('Máy chủ không trả về dịch vụ đã vô hiệu hóa')
      setDeleteTarget(null)
      toast.success(`Đã vô hiệu hóa "${service.name}"`)
      await reload()
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(service.id)
        return next
      })
    }
  }

  return (
    <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Quản lý dịch vụ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tạo, cập nhật và quản lý trạng thái dịch vụ trên nền tảng.</p>
        </div>
        <button onClick={openCreate} disabled={categories.length === 0} className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-violet-700 disabled:opacity-50">
          <Plus className="size-4" /> Thêm dịch vụ
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<CheckCircle2 className="size-5" />} label="Tổng dịch vụ" value={meta?.stats.total} />
        <Stat icon={<CheckCircle2 className="size-5" />} label="Đang hoạt động" value={meta?.stats.active} />
        <Stat icon={<CirclePause className="size-5" />} label="Đã ẩn" value={meta?.stats.inactive} />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm tên, mô tả hoặc mã dịch vụ..." className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm outline-none focus:border-violet-500" />
          {searchInput && <button onClick={() => setSearchInput('')} aria-label="Xóa tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2"><X className="size-4" /></button>}
        </div>
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/50 p-1">
          {STATUS_OPTIONS.map((status) => (
            <button key={status.key} onClick={() => setQuery((current) => ({ ...current, status: status.key, page: 1 }))} className={cn('rounded-xl px-3 py-1.5 text-xs font-bold', query.status === status.key ? 'bg-card text-violet-600 shadow-sm' : 'text-muted-foreground')}>
              {status.label}
            </button>
          ))}
        </div>
        <button onClick={() => void reload()} aria-label="Làm mới danh sách" className="rounded-2xl border border-border p-2 text-muted-foreground hover:text-foreground"><RefreshCw className={cn('size-4', loading && 'animate-spin')} /></button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl border border-border bg-card">
        {error ? (
          <div role="alert" className="space-y-3 px-6 py-12 text-center">
            <p className="font-bold">Không tải được danh sách dịch vụ</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => void reload()} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Thử lại</button>
          </div>
        ) : (
          <table className="w-full min-w-[850px] text-sm">
            <thead><tr className="border-b border-border bg-muted/40 text-left text-xs font-bold text-muted-foreground">
              <th className="px-5 py-3">Dịch vụ</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Giá</th><th className="px-4 py-3">Thời lượng</th><th className="px-4 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th>
            </tr></thead>
            <tbody className={cn('divide-y divide-border', loading && 'opacity-60')}>
              {items.map((service) => (
                <tr key={service.id} className="hover:bg-muted/30">
                  <td className="max-w-[280px] px-5 py-3.5"><p className="truncate font-extrabold">{service.name}</p><p className="truncate font-mono text-[11px] text-muted-foreground">{service.slug}</p></td>
                  <td className="px-4 py-3.5">{service.category?.name ?? 'Danh mục đã xóa'}</td>
                  <td className="px-4 py-3.5">{service.pricingType === 'QUOTE_REQUIRED' ? 'Báo giá' : `${service.basePrice.toLocaleString('vi-VN')} ₫${service.pricingType === 'FROM' ? ' trở lên' : ''}`}</td>
                  <td className="px-4 py-3.5">{service.estimatedDurationMinutes} phút</td>
                  <td className="px-4 py-3.5">
                    <button disabled={busyIds.has(service.id)} onClick={() => void setActive(service, !service.isActive)} className={cn('rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50', service.isActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                      {service.isActive ? 'Hoạt động' : 'Đã ẩn'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(service)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:border-violet-400 hover:text-violet-600"><Pencil className="size-3.5" /> Sửa</button>
                      <button onClick={() => setDeleteTarget(service)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/5"><Trash2 className="size-3.5" /> Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Không có dịch vụ phù hợp.</td></tr>}
            </tbody>
          </table>
        )}
        {meta && meta.totalPages > 1 && !error && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>{meta.total} dịch vụ</span>
            <div className="flex gap-2">
              <button disabled={meta.page <= 1 || loading} onClick={() => setQuery((current) => ({ ...current, page: current.page! - 1 }))} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span className="px-2 py-1.5">{meta.page} / {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages || loading} onClick={() => setQuery((current) => ({ ...current, page: current.page! + 1 }))} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      {modalService !== undefined && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="service-form-title">
          <form onSubmit={submitForm} className="my-auto w-full max-w-2xl space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><h2 id="service-form-title" className="text-xl font-black">{modalService ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'}</h2><p className="text-sm text-muted-foreground">Nhập thông tin dịch vụ và giá niêm yết.</p></div>
              <button type="button" onClick={() => setModalService(undefined)} aria-label="Đóng" className="rounded-xl p-2 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên dịch vụ"><input required minLength={2} maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
              <Field label="Danh mục"><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{!category.isActive ? ' (đã ẩn)' : ''}</option>)}</select></Field>
              <Field label="Giá cơ bản (₫)"><input required type="number" min="0" step="1000" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: Number(event.target.value) })} /></Field>
              <Field label="Thời lượng ước tính (phút)"><input required type="number" min="15" max="1440" step="1" value={form.estimatedDurationMinutes} onChange={(event) => setForm({ ...form, estimatedDurationMinutes: Number(event.target.value) })} /></Field>
              <Field label="Hình thức giá"><select value={form.pricingType} onChange={(event) => setForm({ ...form, pricingType: event.target.value as ServicePricingType })}><option value="FIXED">Giá cố định</option><option value="FROM">Giá từ</option><option value="QUOTE_REQUIRED">Báo giá theo yêu cầu</option></select></Field>
              <Field label="Yêu cầu (mỗi dòng một mục)"><textarea value={requirementsText} onChange={(event) => setRequirementsText(event.target.value)} rows={3} /></Field>
              <Field label="Mô tả"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={3000} rows={3} /></Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => setModalService(undefined)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Hủy</button>
              <button type="submit" disabled={saving || categories.length === 0} className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu dịch vụ'}</button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Vô hiệu hóa "${deleteTarget?.name}"?`}
        description="Dịch vụ sẽ được ẩn khỏi danh sách đặt lịch nhưng vẫn được giữ lại cho các đơn hàng và lịch sử hiện có."
        confirmLabel="Vô hiệu hóa dịch vụ"
        loading={Boolean(deleteTarget && busyIds.has(deleteTarget.id))}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void deleteService()}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-bold">{label}<div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:font-normal [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:font-normal [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:font-normal">{children}</div></label>
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><span className="text-violet-600">{icon}</span><div><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="text-xl font-black">{value ?? '—'}</p></div></div>
}
