'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { skillService, type MySkills } from '@/lib/api/skills'
import { useToast } from '@/components/provider-booking/toast'

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))

/**
 * Loads the provider's skills and tracks a local (unsaved) selection.
 * `added` / `removed` describe the pending diff; a beforeunload guard protects unsaved changes.
 */
export function useMySkills() {
  const toast = useToast()
  const [data, setData] = useState<MySkills | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((payload: MySkills) => {
    setData(payload)
    const ids = new Set(payload.selectedIds)
    setSaved(ids)
    setSelected(new Set(ids))
  }, [])

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      apply((await skillService.getMine(signal)).data)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(getErrorMessage(err))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const dirty = !sameSet(saved, selected)

  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  const { added, removed } = useMemo(
    () => ({ added: [...selected].filter((id) => !saved.has(id)), removed: [...saved].filter((id) => !selected.has(id)) }),
    [selected, saved],
  )

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((s) => {
      const next = new Set(s)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }, [])

  const reset = useCallback(() => setSelected(new Set(saved)), [saved])

  const save = useCallback(async () => {
    if (!data) return
    setSaving(true)
    try {
      // Keep the catalogue order for a stable payload.
      const ids = data.available.map((c) => c.id).filter((id) => selected.has(id))
      const res = await skillService.updateMine(ids)
      apply(res.data)
      toast.success(res.message ?? 'Đã lưu kỹ năng')
    } catch (err) {
      toast.error(getErrorMessage(err))
      // A category was disabled meanwhile → resync the catalogue.
      if (err instanceof ApiError && err.status === 400 && (err.details as { invalidIds?: string[] })?.invalidIds) load()
    } finally {
      setSaving(false)
    }
  }, [data, selected, apply, toast, load])

  return { data, selected, loading, saving, error, dirty, added, removed, toggle, setMany, reset, save, reload: () => load() }
}
