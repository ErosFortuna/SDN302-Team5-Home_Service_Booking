'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  reportsApi,
  type ProviderRevenueItem,
  type RevenueTimeSeriesResponse,
} from '@/lib/api/reports'
import { getErrorMessage } from '@/lib/api/client'
import type { DatePreset } from './use-dashboard'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useRevenueReport() {
  const now = new Date()
  const defaultEnd = formatDate(now)
  const defaultStart = formatDate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))

  const [preset, setPreset] = useState<DatePreset>('30d')
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')

  // Time series state
  const [timeSeries, setTimeSeries] = useState<RevenueTimeSeriesResponse | null>(null)
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  // Provider leaderboard state
  const [providers, setProviders] = useState<ProviderRevenueItem[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [sortBy, setSortBy] = useState('netRevenue')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [providersLoading, setProvidersLoading] = useState(true)
  const [providersError, setProvidersError] = useState<string | null>(null)

  const applyPreset = useCallback((p: DatePreset) => {
    setPreset(p)
    const cur = new Date()
    const endStr = formatDate(cur)

    if (p === '7d') {
      const s = new Date(cur.getTime() - 6 * 24 * 60 * 60 * 1000)
      setStartDate(formatDate(s))
      setEndDate(endStr)
      setGranularity('day')
    } else if (p === '30d') {
      const s = new Date(cur.getTime() - 29 * 24 * 60 * 60 * 1000)
      setStartDate(formatDate(s))
      setEndDate(endStr)
      setGranularity('day')
    } else if (p === 'thisMonth') {
      const s = new Date(cur.getFullYear(), cur.getMonth(), 1)
      setStartDate(formatDate(s))
      setEndDate(endStr)
      setGranularity('day')
    }
  }, [])

  const fetchTimeSeries = useCallback(
    async (signal?: AbortSignal) => {
      setSeriesLoading(true)
      setSeriesError(null)
      try {
        const res = await reportsApi.getRevenueTimeSeries(
          { startDate, endDate, granularity },
          signal
        )
        setTimeSeries(res.data)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSeriesError(getErrorMessage(err))
        }
      } finally {
        setSeriesLoading(false)
      }
    },
    [startDate, endDate, granularity]
  )

  const fetchProviders = useCallback(
    async (signal?: AbortSignal) => {
      setProvidersLoading(true)
      setProvidersError(null)
      try {
        const res = await reportsApi.getRevenueByProvider(
          {
            startDate,
            endDate,
            page: pagination.page,
            limit: pagination.limit,
            sortBy,
            order,
            search,
          },
          signal
        )
        setProviders(res.data)
        if (res.pagination) setPagination(res.pagination)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setProvidersError(getErrorMessage(err))
        }
      } finally {
        setProvidersLoading(false)
      }
    },
    [startDate, endDate, pagination.page, pagination.limit, sortBy, order, search]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchTimeSeries(controller.signal)
    return () => controller.abort()
  }, [fetchTimeSeries])

  useEffect(() => {
    const controller = new AbortController()
    fetchProviders(controller.signal)
    return () => controller.abort()
  }, [fetchProviders])

  return {
    startDate,
    endDate,
    preset,
    granularity,
    timeSeries,
    seriesLoading,
    seriesError,
    providers,
    pagination,
    sortBy,
    order,
    search,
    providersLoading,
    providersError,
    setStartDate: (s: string) => {
      setPreset('custom')
      setStartDate(s)
    },
    setEndDate: (e: string) => {
      setPreset('custom')
      setEndDate(e)
    },
    setGranularity,
    applyPreset,
    setSortBy,
    toggleOrder: () => setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc')),
    setSearch,
    setPage: (p: number) => setPagination((prev) => ({ ...prev, page: p })),
    reload: () => {
      fetchTimeSeries()
      fetchProviders()
    },
  }
}
