import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'

export type IncomingRequestStatus = 'REQUESTED' | 'MATCHING'
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
export type IncomingSort = 'newest' | 'soonest'
export type AreaScope = 'mine' | 'all'

export interface AiAnalysis {
  summary?: string
  suspectedIssue?: string
  urgency?: Urgency
  estimatedPriceMin?: number
  estimatedPriceMax?: number
  suggestedTools?: string[]
  recommendations?: string[]
  confidence?: number
  analyzedAt?: string
}

export interface CategoryRef {
  id: string
  name: string
  slug: string
  iconUrl?: string
}

export interface IncomingRequest {
  id: string
  status: IncomingRequestStatus
  service: { id: string; name: string; pricingType?: string; basePrice?: number } | null
  category: CategoryRef | null
  customer: { id: string; fullName: string; avatarUrl?: string } | null
  description: string
  address: { addressLine?: string; ward?: string; district?: string; city?: string }
  preferredStartAt: string
  preferredEndAt: string
  budgetMin?: number
  budgetMax?: number
  photos: string[]
  aiAnalysis: AiAnalysis | null
  hasQuoted: boolean
  createdAt: string
  expiresAt?: string
}

export interface IncomingRequestsMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  sort: IncomingSort
  area: AreaScope
  matchedCategories: CategoryRef[]
  serviceAreas: string[]
  reason?: 'NO_SKILLS'
}

export type IncomingRequestsResponse = ApiEnvelope<IncomingRequest[]> & { meta: IncomingRequestsMeta }

export interface IncomingRequestsQuery {
  page?: number
  limit?: number
  category?: string
  sort?: IncomingSort
  area?: AreaScope
}

const toQueryString = (query: IncomingRequestsQuery) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** UC-35 — Provider incoming requests. */
export const requestService = {
  getIncoming: (query: IncomingRequestsQuery = {}, signal?: AbortSignal) =>
    apiRequest<IncomingRequestsResponse>(`/provider/requests/incoming${toQueryString(query)}`, { signal }),
}
