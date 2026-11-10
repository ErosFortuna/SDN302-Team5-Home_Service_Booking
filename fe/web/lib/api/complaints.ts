import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'

export interface ComplaintReply {
  sender?: {
    _id?: string
    fullName?: string
    email?: string
  }
  senderRole: 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN'
  message: string
  createdAt: string
}

export interface BackendComplaint {
  _id?: string
  id?: string
  booking?: string | {
    _id?: string
    id?: string
    service?: { name?: string; slug?: string }
    customer?: { fullName?: string; phone?: string; email?: string }
    provider?: { fullName?: string; phone?: string; email?: string }
  }
  reporter?: {
    _id?: string
    fullName?: string
    email?: string
    phone?: string
  }
  against?: {
    _id?: string
    fullName?: string
    email?: string
  }
  title?: string
  category: string
  description: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED' | 'CLOSED'
  resolutionNote?: string
  resolvedBy?: {
    fullName?: string
  }
  resolvedAt?: string
  replies?: ComplaintReply[]
  createdAt: string
}

export type ComplaintCategory =
  | 'QUALITY'
  | 'LATE_ARRIVAL'
  | 'NO_SHOW'
  | 'PRICE'
  | 'BEHAVIOR'
  | 'DAMAGE'
  | 'OTHER'

export const complaintApi = {
  create: (input: {
    bookingId: string
    category: ComplaintCategory
    description: string
    title?: string
  }) =>
    apiRequest<ApiEnvelope<BackendComplaint>>('/complaints', {
      method: 'POST',
      body: {
        booking: input.bookingId,
        category: input.category,
        title: input.title,
        description: input.description,
      },
    }),

  list: (params?: { status?: string; category?: string; page?: number; limit?: number }, signal?: AbortSignal) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.category) q.set('category', params.category)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const query = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<ApiEnvelope<BackendComplaint[]> & { pagination?: any }>(`/complaints${query}`, { signal })
  },

  getById: (id: string, signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<BackendComplaint>>(`/complaints/${id}`, { signal }),

  resolve: (id: string, resolutionNote: string, status: 'RESOLVED' | 'REJECTED' = 'RESOLVED') =>
    apiRequest<ApiEnvelope<BackendComplaint>>(`/complaints/${id}/resolve`, {
      method: 'PATCH',
      body: { resolutionNote, status },
    }),

  reply: (id: string, message: string) =>
    apiRequest<ApiEnvelope<BackendComplaint>>(`/complaints/${id}/reply`, {
      method: 'POST',
      body: { message },
    }),
}
