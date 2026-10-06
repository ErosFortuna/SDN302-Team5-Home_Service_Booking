'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import {
  bookingApi,
  type ApiEnvelope,
  type MaterialInput,
  type ProviderBooking,
  type StatusUpdatePayload,
} from '@/lib/api/bookings'
import { STATUS_META } from '@/lib/booking-status'
import { useToast } from '@/components/provider-booking/toast'

/**
 * Loads one booking and exposes mutation helpers with loading / toast handling.
 * `pendingAction` identifies which button is busy (e.g. "status:IN_PROGRESS").
 */
export function useProviderBooking(bookingId: string) {
  const toast = useToast()
  const [booking, setBooking] = useState<ProviderBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await bookingApi.getById(bookingId, signal)
        setBooking(res.data)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(getErrorMessage(err))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [bookingId],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const run = useCallback(
    async (key: string, action: () => Promise<ApiEnvelope<ProviderBooking>>, successMessage: string) => {
      setPendingAction(key)
      try {
        const res = await action()
        setBooking(res.data)
        toast.success(successMessage)
        return true
      } catch (err) {
        toast.error(getErrorMessage(err))
        // 409 = someone else changed the booking → resync with server state.
        if (err instanceof ApiError && err.status === 409) load()
        return false
      } finally {
        setPendingAction(null)
      }
    },
    [toast, load],
  )

  const updateStatus = useCallback(
    (payload: StatusUpdatePayload) =>
      run(
        `status:${payload.status}`,
        () => bookingApi.updateStatus(bookingId, payload),
        `Đã chuyển trạng thái sang "${STATUS_META[payload.status].label}"`,
      ),
    [bookingId, run],
  )

  const addMaterials = useCallback(
    (items: MaterialInput[]) =>
      run('materials:add', () => bookingApi.addMaterials(bookingId, items), `Đã thêm ${items.length} hạng mục, chờ khách duyệt`),
    [bookingId, run],
  )

  const removeMaterial = useCallback(
    (materialId: string) =>
      run(`materials:remove:${materialId}`, () => bookingApi.removeMaterial(bookingId, materialId), 'Đã xóa hạng mục'),
    [bookingId, run],
  )

  return { booking, loading, error, pendingAction, reload: () => load(), updateStatus, addMaterials, removeMaterial }
}
