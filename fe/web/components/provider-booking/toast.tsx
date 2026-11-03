'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: Tone
  message: string
}
interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TONE_STYLES: Record<Tone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300' },
  error: { icon: CircleAlert, className: 'border-destructive/30 text-destructive' },
  info: { icon: Info, className: 'border-brand/30 text-brand' },
}

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = ++seq
      setToasts((list) => [...list.slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map(({ id, tone, message }) => {
          const { icon: Icon, className } = TONE_STYLES[tone]
          return (
            <div
              key={id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card/95 p-3.5 shadow-lg backdrop-blur animate-in slide-in-from-bottom-2 fade-in duration-200',
                className,
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <p className="flex-1 text-sm font-semibold text-foreground">{message}</p>
              <button onClick={() => dismiss(id)} className="text-muted-foreground hover:text-foreground" aria-label="Đóng">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
