import { apiRequest, authStorage } from './client'
import type { ApiEnvelope } from './bookings'

export type VerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'

  | 'REJECTED'
  | 'VERIFIED'

export type DocumentType = 'ID_CARD' | 'CERTIFICATE' | 'BUSINESS_LICENSE' | 'OTHER'

export interface ProviderDocument {
  _id?: string
  docType: DocumentType
  fileUrl: string
  uploadedAt?: string
}

export interface VerificationLog {
  _id?: string
  action: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'RESUBMIT'
  status: VerificationStatus
  note?: string
  adminId?: {
    _id: string
    fullName: string
    email: string
  }
  timestamp: string
}

export interface ProviderProfileItem {
  _id: string
  user: {
    _id: string
    fullName: string
    email: string
    phone?: string
    avatar?: string
    status: string
    createdAt: string
  }
  businessName?: string
  description?: string
  bio?: string
  yearsOfExperience?: number
  serviceCategories?: Array<{
    _id: string
    name: string
    slug: string
    iconUrl?: string
  }>
  skills?: Array<{
    _id: string
    name: string
    slug: string
    iconUrl?: string
  }>
  serviceAreas?: string[]
  documents?: ProviderDocument[]
  verificationStatus: VerificationStatus
  additionalInfoRequested: boolean
  adminReviewNote?: string
  verifiedBy?: {
    _id: string
    fullName: string
    email: string
  }
  verifiedAt?: string
  verificationLogs?: VerificationLog[]
  averageRating?: number
  reviewCount?: number
  completedJobCount?: number
  createdAt: string
  updatedAt?: string
}

export interface VerificationCounts {
  all: number
  pending: number
  underReview: number
  approved: number
  rejected: number
  additionalInfoRequested: number
}

export interface VerificationListResponse {
  items: ProviderProfileItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  counts: VerificationCounts
}

export interface MyVerificationStatusResponse {
  exists: boolean
  profileId?: string
  businessName?: string
  description?: string
  verificationStatus: VerificationStatus | 'NOT_CREATED'
  additionalInfoRequested: boolean
  adminReviewNote?: string
  documents: ProviderDocument[]
  verificationLogs: VerificationLog[]
  skills?: Array<{
    _id: string
    name: string
    slug: string
  }>
  serviceAreas?: string[]
  averageRating?: number
}

/** UC-56 & UC-31 — Provider Verification API */
export const providerVerificationApi = {
  // --- ADMIN METHODS ---

  /** Lấy danh sách hồ sơ thợ cần duyệt */
  list: (params?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }, signal?: AbortSignal) => {
    const q = new URLSearchParams()
    if (params?.status && params.status !== 'ALL') q.set('status', params.status)
    if (params?.search) q.set('search', params.search)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))

    const queryStr = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<ApiEnvelope<ProviderProfileItem[]> & {
      pagination: VerificationListResponse['pagination']
      counts: VerificationCounts
    }>(`/admin/providers${queryStr}`, { signal })
  },

  /** Xem chi tiết hồ sơ một thợ kèm giấy tờ xác minh */
  getById: (id: string, signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>(`/admin/providers/${id}`, { signal }),

  /** Bắt đầu xét duyệt hồ sơ (PENDING -> UNDER_REVIEW) */
  startReview: (id: string) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>(`/admin/providers/${id}/start-review`, {
      method: 'PATCH',
    }),

  /** Phê duyệt hồ sơ (VERIFIED) */
  approve: (id: string, adminReviewNote?: string) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>(`/admin/providers/${id}/approve`, {
      method: 'PATCH',
      body: { adminReviewNote },
    }),

  /** Từ chối hồ sơ (REJECTED - bắt buộc lý do) */
  reject: (id: string, adminReviewNote: string) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>(`/admin/providers/${id}/reject`, {
      method: 'PATCH',
      body: { adminReviewNote },
    }),

  /** Yêu cầu bổ sung thông tin (bắt buộc nêu nội dung cần bổ sung) */
  requestInfo: (id: string, adminReviewNote: string) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>(`/admin/providers/${id}/request-info`, {
      method: 'PATCH',
      body: { adminReviewNote },
    }),

  // --- PROVIDER METHODS (UC-31) ---

  /** Thợ xem trạng thái xét duyệt của chính mình */
  getMyStatus: (signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<MyVerificationStatusResponse>>('/provider-verification/my/status', {
      signal,
    }),

  /** Upload giấy tờ xác minh của thợ vào folder provider-documents qua POST /api/upload */
  uploadDocument: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('folder', 'provider-documents')

    const token = authStorage.getToken()
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')

    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.message || 'Tải ảnh tài liệu lên thất bại')
    }

    const url = body.urls?.[0] || body.data?.[0]?.url || body.data?.url
    if (!url) {
      throw new Error('Không nhận được đường dẫn tệp sau khi tải lên')
    }
    return url
  },

  /** Thợ cập nhật bổ sung hồ sơ và gửi lại */
  resubmit: (payload: {
    businessName?: string
    description?: string
    serviceAreas?: string[]
    documents?: Array<{ docType: DocumentType; fileUrl: string }>
    note?: string
  }) =>
    apiRequest<ApiEnvelope<ProviderProfileItem>>('/provider-verification/my/resubmit', {
      method: 'POST',
      body: payload,
    }),
}

