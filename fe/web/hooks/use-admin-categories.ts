'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import {
  categoryService,
  type CategoryInput,
  type CategoryListQuery,
  type CategoryListResponse,
  type ServiceCategory,
} from '@/lib/api/categories'

export type FieldErrors = Partial<Record<keyof CategoryInput | 'form', string>>
export type MutationResult = { ok: true; category: ServiceCategory } | { ok: false; fieldErrors: FieldErrors }

/** Maps backend `details: [{ field, message }]` to a field → message object. */
function toFieldErrors(err: unknown): FieldErrors {
  if (err instanceof ApiError && Array.isArray(err.details)) {
    const out: FieldErrors = {}
    for (const d of err.details as { field?: string; message?: string }[]) {
      const key = (d.field && ['name', 'description', 'pricingMode', 'icon', 'sortOrder'].includes(d.field) ? d.field : 'form') as keyof FieldErrors
      out[key] ??= d.message
    }
    if (Object.keys(out).length) return out
  }
  return { form: getErrorMessage(err) }
}

const DEFAULT_QUERY: CategoryListQuery = { page: 1, limit: 8, status: 'all', search: '' }

/**
 * Admin category list + mutations.
 * - Filters reset to page 1; in-flight requests are aborted on change.
 * - Toggling isActive is optimistic (instant UI) and rolled back on failure.
 */
export function useAdminCategories() {
  const [query, setQuery] = useState<CategoryListQuery>(DEFAULT_QUERY)
  const [items, setItems] = useState<ServiceCategory[]>([])
  const [meta, setMeta] = useState<CategoryListResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    categoryService
      .list(query, controller.signal)
      .then((res) => {
        setItems(res.data)
        setMeta(res.meta)
      })
      .catch((err) => (err as Error).name !== 'AbortError' && setError(getErrorMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const updateFilters = useCallback((patch: Omit<CategoryListQuery, 'page'>) => setQuery((q) => ({ ...q, ...patch, page: 1 })), [])
  const goToPage = useCallback((page: number) => setQuery((q) => ({ ...q, page })), [])

  const create = useCallback(async (input: CategoryInput): Promise<MutationResult> => {
    try {
      const res = await categoryService.create(input)
      reload() // refresh list + stats (new item position depends on sort/filter)
      return { ok: true, category: res.data }
    } catch (err) {
      return { ok: false, fieldErrors: toFieldErrors(err) }
    }
  }, [reload])

  const update = useCallback(async (id: string, input: Partial<CategoryInput>): Promise<MutationResult> => {
    try {
      const res = await categoryService.update(id, input)
      setItems((list) => list.map((c) => (c.id === id ? res.data : c)))
      if (input.pricingMode) reload() // stats depend on pricing mode
      return { ok: true, category: res.data }
    } catch (err) {
      return { ok: false, fieldErrors: toFieldErrors(err) }
    }
  }, [reload])

  const setActive = useCallback(async (category: ServiceCategory, isActive: boolean) => {
    const apply = (value: boolean) => {
      setItems((list) => list.map((c) => (c.id === category.id ? { ...c, isActive: value } : c)))
      setMeta((m) => {
        if (!m) return m
        const delta = value ? 1 : -1
        return { ...m, stats: { ...m.stats, active: m.stats.active + delta, inactive: m.stats.inactive - delta } }
      })
    }

    setTogglingIds((s) => new Set(s).add(category.id))
    apply(isActive) // optimistic
    try {
      const res = await categoryService.setActive(category.id, isActive)
      setItems((list) => list.map((c) => (c.id === category.id ? res.data : c)))
      return { ok: true as const, category: res.data }
    } catch (err) {
      apply(!isActive) // rollback
      return { ok: false as const, message: getErrorMessage(err) }
    } finally {
      setTogglingIds((s) => {
        const next = new Set(s)
        next.delete(category.id)
        return next
      })
    }
  }, [])

  return { query, items, meta, loading, error, togglingIds, reload, updateFilters, goToPage, create, update, setActive }
}
