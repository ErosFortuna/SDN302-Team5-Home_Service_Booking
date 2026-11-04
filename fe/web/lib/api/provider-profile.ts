import { apiRequest } from './client'

export interface ProviderCategorySkill {
  id: string
  name: string
  slug: string
  icon: string
  pricingMode: 'FIXED' | string
  description: string
}

export interface ProviderServiceItem {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  estimatedDurationMinutes: number
  pricingType: 'FIXED' | 'FROM' | string
  requirements: string[]
  category: {
    id: string
    name: string
    slug: string
    icon: string
    pricingMode: string
  } | null
}

export interface DaySchedule {
  dayOfWeek: number
  dayName: string
  isOff: boolean
  startTime: string
  endTime: string
  breaks: Array<{ startTime: string; endTime: string; note?: string }>
}

export interface DayOffItem {
  id: string
  date: string
  isFullDayOff: boolean
  customStartTime?: string | null
  customEndTime?: string | null
  reason: string
}

export interface ProviderAvailabilitySummary {
  isAcceptingBookings: boolean
  slotDurationMinutes: number
  travelBufferMinutes: number
  weeklySchedule: DaySchedule[]
  upcomingDaysOff: DayOffItem[]
}

export interface StarBreakdownItem {
  count: number
  percentage: number
}

export interface RatingSummary {
  average: number
  total: number
  breakdown: {
    5: StarBreakdownItem
    4: StarBreakdownItem
    3: StarBreakdownItem
    2: StarBreakdownItem
    1: StarBreakdownItem
    [key: number]: StarBreakdownItem
  }
}

export interface PublicProviderProfile {
  id: string
  userId: string
  fullName: string
  avatarUrl: string
  email?: string
  phone?: string
  memberSince: string
  businessName: string
  description: string
  bio: string
  yearsOfExperience: number
  serviceAreas: string[]
  verificationStatus: string
  isVerified: boolean
  stats: {
    averageRating: number
    totalReviews: number
    completedJobs: number
    yearsOfExperience: number
  }
  skills: ProviderCategorySkill[]
  services: ProviderServiceItem[]
  availability: ProviderAvailabilitySummary
  ratings: RatingSummary
}

export interface ReviewCustomer {
  id: string
  fullName: string
  avatarUrl: string
}

export interface ReviewItem {
  id: string
  rating: number
  comment: string
  response: string | null
  createdAt: string
  customer: ReviewCustomer
  serviceName: string | null
}

export interface ReviewFilterQuery {
  page?: number
  limit?: number
  rating?: number | 'all'
  sortBy?: 'newest' | 'highest' | 'lowest'
}

export interface PaginatedReviewsData {
  reviews: ReviewItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: RatingSummary
}

export const providerProfileApi = {
  /**
   * UC-14: Lấy hồ sơ công khai của Provider cho Customer
   */
  async getPublicProfile(providerId: string, signal?: AbortSignal): Promise<PublicProviderProfile> {
    const res = await apiRequest<{ success: boolean; data: PublicProviderProfile }>(
      `/providers/${providerId}`,
      { signal }
    )
    return res.data as PublicProviderProfile
  },

  /**
   * UC-15: Lấy danh sách đánh giá của Provider có phân trang, lọc theo số sao và sắp xếp
   */
  async getProviderReviews(
    providerId: string,
    query: ReviewFilterQuery = {},
    signal?: AbortSignal
  ): Promise<PaginatedReviewsData> {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    if (query.rating && query.rating !== 'all') params.set('rating', String(query.rating))
    if (query.sortBy) params.set('sortBy', query.sortBy)

    const qs = params.toString() ? `?${params.toString()}` : ''

    const res = await apiRequest<{
      success: boolean
      data: ReviewItem[] | {
        reviews?: ReviewItem[]
        averageRating?: number
        reviewCount?: number
      }
      pagination: {
        page: number
        limit: number
        total?: number
        totalItems?: number
        totalPages: number
        hasNext?: boolean
        hasPrev?: boolean
        hasNextPage?: boolean
        hasPreviousPage?: boolean
      }
      summary?: RatingSummary
    }>(`/providers/${providerId}/reviews${qs}`, { signal })
    const responseData = res.data
    const reviews = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData.reviews)
        ? responseData.reviews
        : []
    const total = res.pagination.total ?? res.pagination.totalItems ??
      (Array.isArray(responseData) ? undefined : responseData.reviewCount) ?? reviews.length
    const page = res.pagination.page ?? query.page ?? 1
    const limit = res.pagination.limit ?? query.limit ?? 5
    const totalPages = res.pagination.totalPages ?? Math.max(1, Math.ceil(total / limit))

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: res.pagination.hasNext ?? res.pagination.hasNextPage ?? page < totalPages,
        hasPrev: res.pagination.hasPrev ?? res.pagination.hasPreviousPage ?? page > 1,
      },
      summary: res.summary ?? createRatingSummary(
        reviews,
        total,
        Array.isArray(responseData) ? 0 : responseData.averageRating ?? 0,
      ),
    }
  },

  /**
   * Lấy lịch làm việc chi tiết của Provider
   */
  async respondToReview(reviewId: string, response: string): Promise<void> {
    await apiRequest(`/reviews/${reviewId}/response`, {
      method: 'PATCH',
      body: { response },
    })
  },

  async getProviderAvailability(
    providerId: string,
    signal?: AbortSignal
  ): Promise<ProviderAvailabilitySummary> {
    const res = await apiRequest<{ success: boolean; data: ProviderAvailabilitySummary }>(
      `/providers/${providerId}/availability`,
      { signal }
    )
    return res.data
  },
}



export interface ProviderProfile {
  id: string
  businessName: string
  bio: string
  yearsOfExperience: number
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
  averageRating?: number
  reviewCount?: number
  completedJobCount?: number
  skills?: string[]
  serviceAreas: string[]
  city: string
  location: { type: 'Point'; coordinates: [number, number] } | null
  documents?: string[]
  isDeleted?: boolean
  deletedAt?: string | null
}

export interface ProviderProfileInput {
  businessName: string
  bio: string
  yearsOfExperience: number
  serviceAreas: string[]
  city: string
  location: { type: 'Point'; coordinates: [number, number] } | null
}

export async function getMyProviderProfile(signal?: AbortSignal): Promise<ProviderProfile | null> {
  const response = await apiRequest<{ success: boolean; data: ProviderProfile | null }>('/provider/profile', { signal })
  return (response.data as ProviderProfile | null) ?? null
}

export async function createMyProviderProfile(input: ProviderProfileInput, signal?: AbortSignal): Promise<ProviderProfile> {
  const response = await apiRequest<{ success: boolean; data: ProviderProfile }>('/provider/profile', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  })
  return response.data as ProviderProfile
}

export async function updateMyProviderProfile(input: ProviderProfileInput, signal?: AbortSignal): Promise<ProviderProfile> {
  const response = await apiRequest<{ success: boolean; data: ProviderProfile }>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
    signal,
  })
  return response.data as ProviderProfile
}

export async function deleteMyProviderProfile(signal?: AbortSignal): Promise<ProviderProfile> {
  const response = await apiRequest<{ success: boolean; data: ProviderProfile }>('/provider/profile', {
    method: 'DELETE',
    signal,
  })
  return response.data as ProviderProfile
}
