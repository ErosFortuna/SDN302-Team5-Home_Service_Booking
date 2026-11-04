import { apiRequest, type SessionUser } from './client'

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

export type MaterialApproval = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface BookingMaterial {
  id: string
  name: string
  quantity: number
  price: number
  note?: string
  approvalStatus: MaterialApproval
  lineTotal: number
  createdAt: string
}

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
  additionalFees: number
  pendingFees: number
  totalAmount: number
  scheduledStartAt: string
  scheduledEndAt: string
  address: string | Record<string, string>
  customer: { id: string; fullName: string; phone?: string; email?: string; avatarUrl?: string } | null
  service: { id: string; name: string } | null
  materials: BookingMaterial[]
  statusHistory: StatusHistoryEntry[]
  startedAt?: string
  completedAt?: string
  completionNote?: string
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
}

export interface MaterialInput {
  name: string
  quantity: number
  price: number
  note?: string
}

export const bookingApi = {
  listMine: (statuses?: BookingStatus[], signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderBooking[]>>(
      `/bookings/provider/me${statuses?.length ? `?status=${statuses.join(',')}` : ''}`,
      { signal },
    ),

  getById: (id: string, signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}`, { signal }),

  updateStatus: (id: string, payload: StatusUpdatePayload) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/status`, { method: 'PATCH', body: payload }),

  addMaterials: (id: string, items: MaterialInput[]) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/materials`, { method: 'POST', body: { items } }),

  removeMaterial: (id: string, materialId: string) =>
    apiRequest<ApiEnvelope<ProviderBooking>>(`/bookings/${id}/materials/${materialId}`, { method: 'DELETE' }),
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
