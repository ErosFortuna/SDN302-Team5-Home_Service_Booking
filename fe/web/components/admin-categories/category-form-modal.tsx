'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryIcon as CategoryIconKey, CategoryInput, PricingMode, ServiceCategory } from '@/lib/api/categories'
import type { FieldErrors, MutationResult } from '@/hooks/use-admin-categories'
import { CATEGORY_ICON_KEYS, CATEGORY_ICON_MAP, PRICING_MODE_META } from '@/lib/category-meta'

const DESCRIPTION_MAX = 500

interface FormState {
  name: string
  description: string
  pricingMode: PricingMode
  icon: CategoryIconKey
  sortOrder: string
}

const toFormState = (c?: ServiceCategory | null): FormState => ({
  name: c?.name ?? '',
  description: c?.description ?? '',
  pricingMode: c?.pricingMode ?? 'REQUEST_QUOTE',
  icon: c?.icon ?? 'wrench',
  sortOrder: String(c?.sortOrder ?? 0),
})

/** Client-side mirror of the backend rules (server remains the source of truth). */
function validate(f: FormState): FieldErrors {
  const errors: FieldErrors = {}
  const name = f.name.trim()
  if (name.length < 2 || name.length > 100) errors.name = 'Tên dịch vụ phải từ 2–100 ký tự'
  if (f.description.length > DESCRIPTION_MAX) errors.description = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự`
  const order = Number(f.sortOrder)
  if (!Number.isInteger(order) || order < 0 || order > 9999) errors.sortOrder = 'Số nguyên từ 0 đến 9999'
  return errors
}

interface CategoryFormModalProps {
  open: boolean
  /** null → create mode */
  category: ServiceCategory | null
  onClose: () => void
  onSubmit: (input: CategoryInput) => Promise<MutationResult>
}

export function CategoryFormModal({ open, category, onClose, onSubmit }: CategoryFormModalProps) {
  const isEdit = Boolean(category)
  const [form, setForm] = useState<FormState>(() => toFormState(category))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Reset whenever the modal opens for a (different) category.
  useEffect(() => {
    if (!open) return
    setForm(toFormState(category))
    setErrors({})
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [open, category])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  const initial = useMemo(() => toFormState(category), [category])
  const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k])

  if (!open) return null

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof FieldErrors] || errors.form) setErrors((e) => ({ ...e, [key]: undefined, form: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clientErrors = validate(form)
    if (Object.keys(clientErrors).length) return setErrors(clientErrors)

    const payload: CategoryInput = {
      name: form.name.trim().replace(/\s+/g, ' '),
      description: form.description.trim(),
      pricingMode: form.pricingMode,
      icon: form.icon,
      sortOrder: Number(form.sortOrder),
    }
    // In edit mode only send what changed.
    const body = isEdit
      ? (Object.fromEntries(Object.entries(payload).filter(([k, v]) => String(v) !== String(initial[k as keyof FormState]).trim())) as CategoryInput)
      : payload

    setSubmitting(true)
    const result = await onSubmit(body)
    setSubmitting(false)
    if (!result.ok) setErrors(result.fieldErrors)
  }

  const SelectedIcon = CATEGORY_ICON_MAP[form.icon]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !submitting && onClose()} aria-hidden />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-violet-500/10 via-background to-background px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
              <SelectedIcon className="size-5" />
            </span>
            <div>
              <h2 id="category-form-title" className="text-lg font-black tracking-tight">
                {isEdit ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit ? `Mã: ${category?.slug}` : 'Danh mục sẽ được kích hoạt ngay sau khi tạo.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {errors.form && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{errors.form}</p>
          )}

          <Field label="Tên dịch vụ" required error={errors.name} htmlFor="category-name">
            <input
              ref={nameRef}
              id="category-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={100}
              placeholder="vd: Lắp đặt camera an ninh"
              aria-invalid={Boolean(errors.name)}
              className={inputCls(errors.name)}
            />
          </Field>

          <Field
            label="Mô tả"
            error={errors.description}
            htmlFor="category-description"
            hint={<span className={cn(form.description.length > DESCRIPTION_MAX * 0.9 && 'text-amber-600')}>{form.description.length}/{DESCRIPTION_MAX}</span>}
          >
            <textarea
              id="category-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              maxLength={DESCRIPTION_MAX}
              placeholder="Mô tả ngắn phạm vi công việc của dịch vụ…"
              className={cn(inputCls(errors.description), 'resize-none')}
            />
          </Field>

          <Field label="Hình thức tính giá" required error={errors.pricingMode}>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Hình thức tính giá">
              {(Object.keys(PRICING_MODE_META) as PricingMode[]).map((mode) => {
                const meta = PRICING_MODE_META[mode]
                const active = form.pricingMode === mode
                return (
                  <button
                    key={mode}
                    id={`pricing-${mode}`}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set('pricingMode', mode)}
                    className={cn(
                      'relative rounded-2xl border-2 p-4 text-left transition-all',
                      active ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/10' : 'border-border hover:border-violet-300',
                    )}
                  >
                    <span className={cn('absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border-2 transition-all', active ? 'border-violet-500 bg-violet-500 text-white' : 'border-border')}>
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={cn('inline-block h-1.5 w-8 rounded-full bg-gradient-to-r', meta.accent)} />
                    <p className="mt-2 text-sm font-extrabold">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field label="Biểu tượng" error={errors.icon}>
              <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Biểu tượng">
                {CATEGORY_ICON_KEYS.map((key) => {
                  const Icon = CATEGORY_ICON_MAP[key]
                  const active = form.icon === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={key}
                      title={key}
                      onClick={() => set('icon', key)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-xl border transition-all',
                        active ? 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-500/30' : 'border-border text-muted-foreground hover:border-violet-300 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Thứ tự" error={errors.sortOrder} htmlFor="category-sort" hint="Nhỏ hiển thị trước">
              <input
                id="category-sort"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                className={inputCls(errors.sortOrder)}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted">
            Hủy
          </button>
          <button
            id="category-form-submit"
            type="submit"
            disabled={submitting || (isEdit && !dirty)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <LoaderCircle className="size-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
          </button>
        </footer>
      </form>
    </div>
  )
}

const inputCls = (error?: string) =>
  cn(
    'w-full rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-2',
    error ? 'border-destructive focus:ring-destructive/20' : 'border-border focus:border-violet-500 focus:ring-violet-500/20',
  )

function Field({ label, required, error, hint, htmlFor, children }: {
  label: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-extrabold text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  )
}
