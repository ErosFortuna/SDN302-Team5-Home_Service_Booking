'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import {
  requestService,
  type IncomingRequest,
  type IncomingRequestsMeta,
  type IncomingRequestsQuery,
} from '@/lib/api/requests'

/** Error codes returned by `isApprovedProvider` (403) that deserve a dedicated screen. */
export type AccessBlockCode = 'PROVIDER_NOT_APPROVED' | 'PROFILE_MISSING' | 'ACCOUNT_INACTIVE' | 'NOT_PROVIDER'

export interface AccessBlock {
  code: AccessBlockCode
  message: string
  verificationStatus?: string
}

const DEFAULT_QUERY: Required<Pick<IncomingRequestsQuery, 'page' | 'limit' | 'sort' | 'area'>> & IncomingRequestsQuery = {
  page: 1,
  limit: 9,
  sort: 'newest',
  area: 'mine',
}

/**
 * Loads the provider inbox. Changing any filter resets to page 1.
 * Aborts in-flight requests when the query changes or the component unmounts.
 */
export function useIncomingRequests() {
  const [query, setQuery] = useState<IncomingRequestsQuery>(DEFAULT_QUERY)
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const [meta, setMeta] = useState<IncomingRequestsMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessBlock, setAccessBlock] = useState<AccessBlock | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    requestService
      .getIncoming(query, controller.signal)
      .then((res) => {
        setRequests(res.data)
        setMeta(res.meta)
        setAccessBlock(null)
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        const details = err instanceof ApiError ? (err.details as Partial<AccessBlock> | undefined) : undefined
        if (err instanceof ApiError && err.status === 403 && details?.code) {
          setAccessBlock({ code: details.code, message: err.message, verificationStatus: details.verificationStatus })
          setRequests([])
          return
        }
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [query, reloadKey])

  const updateFilters = useCallback(
    (patch: Omit<IncomingRequestsQuery, 'page'>) => setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )
  const goToPage = useCallback((page: number) => setQuery((q) => ({ ...q, page })), [])
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { query, requests, meta, loading, error, accessBlock, updateFilters, goToPage, reload }
}
