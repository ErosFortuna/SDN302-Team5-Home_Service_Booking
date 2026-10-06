'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Accessible on/off switch (role="switch"). */
export function ToggleSwitch({ id, checked, onChange, disabled, label }: {
  id?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-wait disabled:opacity-60',
        checked ? 'bg-emerald-500' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

/** Small confirmation dialog (ESC / backdrop to cancel). */
export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'danger', loading, onConfirm, onCancel }: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  tone?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex gap-4">
          <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-brand/10 text-brand')}>
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-lg font-black tracking-tight">{title}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} id="confirm-cancel" onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
            Hủy
          </button>
          <button
            id="confirm-ok"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-60',
              tone === 'danger' ? 'bg-destructive shadow-destructive/20' : 'bg-brand shadow-brand/20',
            )}
          >
            {loading && <LoaderCircle className="size-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
