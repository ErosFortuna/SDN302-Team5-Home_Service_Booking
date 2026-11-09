'use client'

import { useCallback, useEffect, useState } from 'react'
import { reportsApi, type DashboardOverviewResponse } from '@/lib/api/reports'
import { getErrorMessage } from '@/lib/api/client'

export type DatePreset = '7d' | '30d' | 'thisMonth' | 'custom'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useDashboard() {
  const now = new Date()
  const defaultEnd = formatDate(now)
  const defaultStart = formatDate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))

  const [preset, setPreset] = useState<DatePreset>('30d')
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [data, setData] = useState<DashboardOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyPreset = useCallback((p: DatePreset) => {
    setPreset(p)
    const cur = new Date()
    const endStr = formatDate(cur)

    if (p === '7d') {
      const s = new Date(cur.getTime() - 6 * 24 * 60 * 60 * 1000)
      setStartDate(formatDate(s))
      setEndDate(endStr)
    } else if (p === '30d') {
      const s = new Date(cur.getTime() - 29 * 24 * 60 * 60 * 1000)
      setStartDate(formatDate(s))
      setEndDate(endStr)
    } else if (p === 'thisMonth') {
      const s = new Date(cur.getFullYear(), cur.getMonth(), 1)
      setStartDate(formatDate(s))
      setEndDate(endStr)
    }
  }, [])

  const fetchDashboard = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await reportsApi.getDashboard({ startDate, endDate }, signal)
        setData(res.data)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(getErrorMessage(err))
        }
      } finally {
        setLoading(false)
      }
    },
    [startDate, endDate]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchDashboard(controller.signal)
    return () => controller.abort()
  }, [fetchDashboard])

  return {
    data,
    loading,
    error,
    startDate,
    endDate,
    preset,
    setStartDate: (s: string) => {
      setPreset('custom')
      setStartDate(s)
    },
    setEndDate: (e: string) => {
      setPreset('custom')
      setEndDate(e)
    },
    applyPreset,
    reload: () => fetchDashboard(),
  }
}
