'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  providerVerificationApi,
  type ProviderProfileItem,
  type VerificationCounts,
} from '@/lib/api/verification'
import { getErrorMessage } from '@/lib/api/client'

export function useProviderVerification() {
  const [items, setItems] = useState<ProviderProfileItem[]>([])
  const [counts, setCounts] = useState<VerificationCounts>({
    all: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    additionalInfoRequested: 0,
  })
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Selected profile for Inspection / Decision Modal
  const [selectedProfile, setSelectedProfile] = useState<ProviderProfileItem | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [actionProcessing, setActionProcessing] = useState(false)

  const fetchList = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await providerVerificationApi.list(
          {
            status: statusFilter,
            search,
            page: pagination.page,
            limit: pagination.limit,
          },
          signal
        )

        setItems(res.data)
        if (res.pagination) setPagination(res.pagination)
        if (res.counts) setCounts(res.counts)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(getErrorMessage(err))
        }
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, search, pagination.page, pagination.limit]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchList(controller.signal)
    return () => controller.abort()
  }, [fetchList])

  const inspectProfile = useCallback(async (profileId: string) => {
    setInspectLoading(true)
    setError(null)
    try {
      const res = await providerVerificationApi.getById(profileId)
      setSelectedProfile(res.data)

      // Nếu đang PENDING, tự động kích hoạt START_REVIEW để chuyển sang UNDER_REVIEW
      if (res.data.verificationStatus === 'PENDING') {
        const reviewed = await providerVerificationApi.startReview(profileId)
        setSelectedProfile(reviewed.data)
        // Cập nhật lại trong danh sách
        setItems((prev) =>
          prev.map((item) => (item._id === profileId ? reviewed.data : item))
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setInspectLoading(false)
    }
  }, [])

  const approve = useCallback(
    async (profileId: string, note?: string) => {
      setActionProcessing(true)
      setError(null)
      try {
        const res = await providerVerificationApi.approve(profileId, note)
        setSelectedProfile(res.data)
        setSuccessMessage(`Đã phê duyệt hồ sơ của thợ ${res.data.user.fullName}`)
        setTimeout(() => setSuccessMessage(null), 3500)
        fetchList()
      } catch (err) {
        setError(getErrorMessage(err))
        throw err
      } finally {
        setActionProcessing(false)
      }
    },
    [fetchList]
  )

  const reject = useCallback(
    async (profileId: string, reason: string) => {
      setActionProcessing(true)
      setError(null)
      try {
        const res = await providerVerificationApi.reject(profileId, reason)
        setSelectedProfile(res.data)
        setSuccessMessage(`Đã từ chối hồ sơ của thợ ${res.data.user.fullName}`)
        setTimeout(() => setSuccessMessage(null), 3500)
        fetchList()
      } catch (err) {
        setError(getErrorMessage(err))
        throw err
      } finally {
        setActionProcessing(false)
      }
    },
    [fetchList]
  )

  const requestInfo = useCallback(
    async (profileId: string, note: string) => {
      setActionProcessing(true)
      setError(null)
      try {
        const res = await providerVerificationApi.requestInfo(profileId, note)
        setSelectedProfile(res.data)
        setSuccessMessage(
          `Đã gửi yêu cầu bổ sung thông tin đến thợ ${res.data.user.fullName}`
        )
        setTimeout(() => setSuccessMessage(null), 3500)
        fetchList()
      } catch (err) {
        setError(getErrorMessage(err))
        throw err
      } finally {
        setActionProcessing(false)
      }
    },
    [fetchList]
  )

  const closeModal = useCallback(() => {
    setSelectedProfile(null)
  }, [])

  return {
    items,
    counts,
    pagination,
    statusFilter,
    search,
    loading,
    error,
    successMessage,
    selectedProfile,
    inspectLoading,
    actionProcessing,
    setStatusFilter,
    setSearch,
    setPage: (page: number) => setPagination((prev) => ({ ...prev, page })),
    inspectProfile,
    approve,
    reject,
    requestInfo,
    closeModal,
    reload: () => fetchList(),
    clearError: () => setError(null),
  }
}

