'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Crown, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { adminMembershipApi, type MembershipPlan, type MembershipPlanInput } from '@/lib/api/membership'
import { getErrorMessage } from '@/lib/api/client'
import { formatVND, cn } from '@/lib/utils'
import { useToast } from '@/components/provider-booking/toast'
import { ConfirmDialog, ToggleSwitch } from '@/components/admin-categories/controls'

const emptyForm = (): MembershipPlanInput => ({ name: '', slug: '', monthlyPrice: 199000, benefits: [] })

export function MembershipManagementPage() {
  const toast = useToast()
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MembershipPlan | null | undefined>(undefined)
  const [form, setForm] = useState<MembershipPlanInput>(emptyForm())
  const [benefitsText, setBenefitsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const reload = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await adminMembershipApi.list(signal)
      if (!response.data) throw new Error('Máy chủ không trả về danh sách gói membership')
      setPlans(response.data)
    } catch (reason) {
      if ((reason as Error).name !== 'AbortError') setError(getErrorMessage(reason))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void reload(controller.signal)
    return () => controller.abort()
  }, [reload])

  const openCreate = () => {
    setForm(emptyForm())
    setBenefitsText('')
    setEditing(null)
  }

  const openEdit = (plan: MembershipPlan) => {
    setForm({ name: plan.name, slug: plan.slug, monthlyPrice: plan.monthlyPrice, benefits: plan.benefits })
    setBenefitsText(plan.benefits.join('\n'))
    setEditing(plan)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const input = { ...form, name: form.name.trim(), slug: form.slug.trim(), benefits: benefitsText.split('\n').map((item) => item.trim()).filter(Boolean) }
    try {
      const response = editing
        ? await adminMembershipApi.update(editing.id, input)
        : await adminMembershipApi.create(input)
      if (!response.data) throw new Error('Máy chủ không trả về gói membership đã lưu')
      toast.success(editing ? 'Đã cập nhật gói membership' : 'Đã tạo gói membership')
      setEditing(undefined)
      await reload()
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  const setPlanActive = async (plan: MembershipPlan, isActive: boolean) => {
    setBusyIds((current) => new Set(current).add(plan.id))
    try {
      const response = await adminMembershipApi.setActive(plan.id, isActive)
      if (!response.data) throw new Error('Máy chủ không trả về gói membership đã cập nhật')
      toast.success(isActive ? 'Đã kích hoạt gói' : 'Đã ẩn gói membership')
      await reload()
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(plan.id); return next })
    }
  }

  const deactivate = async () => {
    if (!deleteTarget) return
    const plan = deleteTarget
    setBusyIds((current) => new Set(current).add(plan.id))
    try {
      const response = await adminMembershipApi.deactivate(plan.id)
      if (!response.data) throw new Error('Máy chủ không trả về gói membership đã cập nhật')
      toast.success('Đã xóa mềm gói membership')
      setDeleteTarget(null)
      await reload()
    } catch (reason) {
      toast.error(getErrorMessage(reason))
    } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(plan.id); return next })
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand"><Crown className="size-5" /><span className="text-xs font-black uppercase tracking-wide">Membership</span></div>
          <h2 className="mt-1 text-xl font-black">Quản lý gói thành viên</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tạo, chỉnh sửa, ẩn hoặc khôi phục gói membership provider.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground shadow-sm hover:brightness-105"><Plus className="size-4" /> Tạo gói mới</button>
      </div>

      {error && <div role="alert" className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><span>{error}</span><button onClick={() => void reload()} className="font-bold underline">Thử lại</button></div>}

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border bg-muted/30 px-5 py-3 text-xs font-bold text-muted-foreground sm:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_auto]">
          <span>Gói membership</span><span className="hidden sm:block">Giá / tháng</span><span className="hidden sm:block">Quyền lợi</span><span className="hidden sm:block">Trạng thái</span><span className="text-right">Thao tác</span>
        </div>
        {loading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div> : plans.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Chưa có gói membership nào.</div> : plans.map((plan) => (
          <div key={plan.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border/70 px-5 py-4 last:border-0 sm:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_auto]">
            <div className="min-w-0"><p className="truncate font-bold">{plan.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{plan.slug} · phiên bản {plan.version ?? 1}</p><p className="mt-1 text-sm font-black text-brand sm:hidden">{formatVND(plan.monthlyPrice)} / tháng</p></div>
            <p className="hidden text-sm font-black text-brand sm:block">{formatVND(plan.monthlyPrice)}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{plan.benefits.length ? plan.benefits.join(' · ') : 'Chưa thiết lập quyền lợi'}</p>
            <div className="hidden items-center gap-2 sm:flex"><ToggleSwitch checked={Boolean(plan.isActive)} disabled={busyIds.has(plan.id)} label={`${plan.isActive ? 'Ẩn' : 'Kích hoạt'} gói ${plan.name}`} onChange={(active) => void setPlanActive(plan, active)} /><span className={cn('text-xs font-bold', plan.isActive ? 'text-emerald-600' : 'text-muted-foreground')}>{plan.isActive ? 'Đang hoạt động' : 'Đã ẩn'}</span></div>
            <div className="flex justify-end gap-1"><button aria-label={`Sửa ${plan.name}`} title="Chỉnh sửa" onClick={() => openEdit(plan)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-brand"><Pencil className="size-4" /></button>{plan.isActive ? <button aria-label={`Xóa mềm ${plan.name}`} title="Xóa mềm" disabled={busyIds.has(plan.id)} onClick={() => setDeleteTarget(plan)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button> : <button aria-label={`Khôi phục ${plan.name}`} title="Khôi phục" disabled={busyIds.has(plan.id)} onClick={() => void setPlanActive(plan, true)} className="rounded-lg p-2 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"><RotateCcw className="size-4" /></button>}</div>
            <div className="col-span-2 flex items-center gap-2 text-xs sm:hidden"><span className={cn('rounded-full px-2.5 py-1 font-bold', plan.isActive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>{plan.isActive ? 'Đang hoạt động' : 'Đã ẩn'}</span>{plan.benefits.length > 0 && <span className="truncate text-muted-foreground">{plan.benefits.join(' · ')}</span>}</div>
          </div>
        ))}
      </div>

      {editing !== undefined && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="membership-form-title"><form onSubmit={submit} className="my-auto w-full max-w-xl space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 id="membership-form-title" className="text-xl font-black">{editing ? 'Chỉnh sửa gói' : 'Tạo gói membership'}</h3><p className="mt-1 text-sm text-muted-foreground">Giá được tính theo tháng bằng VND.</p></div><button type="button" aria-label="Đóng" onClick={() => setEditing(undefined)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="size-4" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-muted-foreground sm:col-span-2">Tên gói<input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" /></label><label className="text-xs font-bold text-muted-foreground">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="goi-chuyen-nghiep" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" /></label><label className="text-xs font-bold text-muted-foreground">Giá / tháng (VND)<input required type="number" min={1000} max={100000000} step={1} value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" /></label><label className="text-xs font-bold text-muted-foreground sm:col-span-2">Quyền lợi <span className="font-normal">(mỗi dòng một quyền lợi)</span><textarea rows={5} maxLength={4000} value={benefitsText} onChange={(event) => setBenefitsText(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" /></label></div><div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">Hủy</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60">{editing ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />}{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo gói'}</button></div></form></div>}

      <ConfirmDialog open={Boolean(deleteTarget)} title="Xóa mềm gói membership?" description={<>Gói <strong>{deleteTarget?.name}</strong> sẽ bị ẩn khỏi danh sách đăng ký mới. Dữ liệu gói và lịch sử thanh toán cũ vẫn được giữ lại; có thể khôi phục sau.</>} confirmLabel="Xóa mềm" loading={deleteTarget ? busyIds.has(deleteTarget.id) : false} onConfirm={() => void deactivate()} onCancel={() => setDeleteTarget(null)} />
    </section>
  )
}
