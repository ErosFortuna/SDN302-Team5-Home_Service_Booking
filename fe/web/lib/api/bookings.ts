import { apiRequest, type SessionUser } from './client'
import type { CategoryIcon } from './categories'

export type BookingStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PROVIDER_ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface StatusHistoryEntry {
  from: BookingStatus
  to: BookingStatus
  note?: string
  changedAt: string
}

export interface ProviderBooking {
  id: string
  status: BookingStatus
  price: number
  finalPrice?: number
  paymentStatus?: string
  totalAmount: number
  scheduledStartAt: string
  scheduledEndAt: string
  address: string | Record<string, string>
  customer: { id: string; fullName: string; phone?: string; email?: string; avatarUrl?: string } | null
  service: {
    id: string
    name: string
    category?: { id: string; name: string; slug: string; icon: CategoryIcon }
  } | null
  statusHistory: StatusHistoryEntry[]
  startedAt?: string
  completedAt?: string
  completionNote?: string
  progressPhotos?: string[]
  proofPhotos?: string[]
  distanceKm?: number | null
  allowedTransitions: BookingStatus[]
}

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface StatusUpdatePayload {
  status: BookingStatus
  note?: string
  confirmCompletion?: boolean
  photos?: string[]
  finalPrice?: number
}

export const bookingApi = {
  listCustomerMine: (signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderBooking[]>>('/bookings/customer/me', { signal }),

  listMine: (statuses?: BookingStatus[], signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderBooking[]>>(
      `/bookings/provider/me${statuses?.length ? `?status=${statuses.join(',')}` : ''}`,
      { signal },
    ),

  listAll: (params?: { status?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    const query = search.toString() ? `?${search.toString()}` : ''
    return apiRequest<ApiEnvelope<ProviderBooking[]>>(`/bookings${query}`, { signal })
  },

  getById: (id: string, signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}`, { signal }),

  confirm: (id: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/confirm`, { method: 'PATCH', body: {} }),

  decline: (id: string, reasonCode: string, note?: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/decline`, {
      method: 'PATCH',
      body: { reasonCode, note },
    }),

  reschedule: (id: string, scheduledStartAt: string, note?: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: { scheduledStartAt, note },
    }),

  cancel: (id: string, reason: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    }),

  review: (id: string, rating: number, comment?: string) =>
    apiRequest<ApiEnvelope<any>>(`/bookings/${id}/reviews`, {
      method: 'POST',
      body: { rating, comment },
    }),

  confirmPayment: (id: string, note?: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/confirm-payment`, {
      method: 'POST',
      body: { note },
    }),

  updateStatus: (id: string, payload: StatusUpdatePayload) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/status`, { method: 'PATCH', body: payload }),

}

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: SessionUser }> => {
    const res = await apiRequest<ApiEnvelope<{ user: SessionUser; accessToken: string }>>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    return { token: res.data.accessToken, user: res.data.user }
  },
}
