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
  pricingType: 'FIXED' | 'FROM'
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

interface PublicProviderAvailabilityResponse {
  isAcceptingBookings?: boolean
  slotDurationMinutes?: number
  travelBufferMinutes?: number
  weeklySchedule?: DaySchedule[]
  daysOffDates?: Array<{
    date: string
    isFullDayOff: boolean
    reason?: string
    customStartTime?: string | null
    customEndTime?: string | null
  }>
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

interface PublicProviderProfileResponse {
  id: string
  userId?: string
  fullName?: string
  avatarUrl?: string | null
  memberSince?: string
  businessName?: string
  description?: string
  bio?: string
  yearsOfExperience?: number
  serviceAreas?: string[]
  verificationStatus?: string
  isVerified?: boolean
  averageRating?: number
  reviewCount?: number
  completedJobCount?: number
  stats?: Partial<PublicProviderProfile['stats']>
  skills?: Array<Pick<ProviderCategorySkill, 'id' | 'name' | 'slug'> & Partial<ProviderCategorySkill>>
  services?: ProviderServiceItem[]
  ratings?: RatingSummary
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

interface ProviderReviewResponseItem {
  id?: string
  _id?: string
  rating?: number
  comment?: string
  response?: string | null
  createdAt?: string
  customer?: {
    _id?: string
    id?: string
    fullName?: string
    avatarUrl?: string
  } | null
  serviceName?: string | null
  booking?: { service?: { name?: string } | string | null } | null
}

interface ProviderReviewsResponse {
  success: boolean
  data:
    | ProviderReviewResponseItem[]
    | {
        reviews?: ProviderReviewResponseItem[]
        averageRating?: number
        reviewCount?: number
        summary?: RatingSummary
      }
  pagination?: {
    page?: number
    limit?: number
    total?: number
    totalItems?: number
    totalPages?: number
    hasNext?: boolean
    hasNextPage?: boolean
    hasPrev?: boolean
    hasPreviousPage?: boolean
  }
  summary?: RatingSummary
}

async function fetchProviderAvailability(
  providerId: string,
  signal?: AbortSignal
): Promise<ProviderAvailabilitySummary> {
  const res = await apiRequest<{
    success: boolean
    data: PublicProviderAvailabilityResponse
  }>(`/availability/providers/${providerId}`, { signal })
  const data = res.data

  return {
    isAcceptingBookings: data.isAcceptingBookings ?? true,
    slotDurationMinutes: data.slotDurationMinutes ?? 60,
    travelBufferMinutes: data.travelBufferMinutes ?? 30,
    weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
    upcomingDaysOff: (Array.isArray(data.daysOffDates) ? data.daysOffDates : []).map((dayOff) => ({
      id: dayOff.date,
      date: dayOff.date,
      isFullDayOff: dayOff.isFullDayOff,
      customStartTime: dayOff.customStartTime,
      customEndTime: dayOff.customEndTime,
      reason: dayOff.reason || 'Nghỉ theo lịch',
    })),
  }
}

function toReviewItem(review: ProviderReviewResponseItem): ReviewItem {
  const service = review.booking?.service
  return {
    id: review.id ?? review._id ?? '',
    rating: review.rating ?? 0,
    comment: review.comment ?? '',
    response: review.response ?? null,
    createdAt: review.createdAt ?? '',
    customer: {
      id: review.customer?.id ?? review.customer?._id ?? '',
      fullName: review.customer?.fullName ?? 'Khách hàng',
      avatarUrl: review.customer?.avatarUrl ?? '',
    },
    serviceName: review.serviceName ?? (typeof service === 'object' ? service?.name ?? null : null),
  }
}

function createRatingSummary(reviews: ReviewItem[], total: number, average: number): RatingSummary {
  const breakdown = {
    5: { count: 0, percentage: 0 },
    4: { count: 0, percentage: 0 },
    3: { count: 0, percentage: 0 },
    2: { count: 0, percentage: 0 },
    1: { count: 0, percentage: 0 },
  }

  reviews.forEach(({ rating }) => {
    if (rating >= 1 && rating <= 5 && Number.isInteger(rating)) {
      breakdown[rating as keyof typeof breakdown].count += 1
    }
  })

  Object.values(breakdown).forEach((item) => {
    item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
  })

  return { average, total, breakdown }
}

export const providerProfileApi = {
  /**
   * UC-14: Lấy hồ sơ công khai của Provider cho Customer
   */
  async getPublicProfile(providerId: string, signal?: AbortSignal): Promise<PublicProviderProfile> {
    const [profileRes, availability] = await Promise.all([
      apiRequest<{ success: boolean; data: PublicProviderProfileResponse }>(
        `/providers/${providerId}`,
        { signal }
      ),
      fetchProviderAvailability(providerId, signal),
    ])
    const data = profileRes.data
    const yearsOfExperience = data.yearsOfExperience ?? data.stats?.yearsOfExperience ?? 0
    const averageRating = data.stats?.averageRating ?? data.averageRating ?? 0
    const totalReviews = data.stats?.totalReviews ?? data.reviewCount ?? 0
    const completedJobs = data.stats?.completedJobs ?? data.completedJobCount ?? 0
    const emptyBreakdown = {
      count: 0,
      percentage: 0,
    }

    return {
      id: data.id,
      userId: data.userId ?? data.id,
      fullName: data.fullName ?? '',
      avatarUrl: data.avatarUrl ?? '',
      memberSince: data.memberSince ?? '',
      businessName: data.businessName ?? '',
      description: data.description ?? data.bio ?? '',
      bio: data.bio ?? '',
      yearsOfExperience,
      serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
      verificationStatus: data.verificationStatus ?? '',
      isVerified: data.isVerified ?? data.verificationStatus === 'VERIFIED',
      stats: {
        averageRating,
        totalReviews,
        completedJobs,
        yearsOfExperience,
      },
      skills: (data.skills ?? []).map((skill) => ({
        ...skill,
        icon: skill.icon ?? 'wrench',
        pricingMode: skill.pricingMode ?? 'FIXED',
        description: skill.description ?? '',
      })),
      services: data.services ?? [],
      availability,
      ratings: data.ratings ?? {
        average: averageRating,
        total: totalReviews,
        breakdown: {
          5: emptyBreakdown,
          4: emptyBreakdown,
          3: emptyBreakdown,
          2: emptyBreakdown,
          1: emptyBreakdown,
        },
      },
    }
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

    const res = await apiRequest<ProviderReviewsResponse>(
      `/providers/${providerId}/reviews${qs}`,
      { signal }
    )
    const responseData = res.data
    const rawReviews = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData.reviews)
        ? responseData.reviews
        : []
    const reviews = rawReviews.map(toReviewItem)
    const pagination = res.pagination
    const total = pagination?.total ?? pagination?.totalItems ??
      (!Array.isArray(responseData) ? responseData.reviewCount : undefined) ?? reviews.length
    const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(total / (pagination?.limit ?? query.limit ?? 5)))
    const summary = res.summary ??
      (!Array.isArray(responseData) ? responseData.summary : undefined) ??
      createRatingSummary(
        reviews,
        total,
        !Array.isArray(responseData) ? responseData.averageRating ?? 0 : 0
      )

    return {
      reviews,
      pagination: {
        page: pagination?.page ?? query.page ?? 1,
        limit: pagination?.limit ?? query.limit ?? 5,
        total,
        totalPages,
        hasNext: pagination?.hasNext ?? pagination?.hasNextPage ?? (pagination?.page ?? query.page ?? 1) < totalPages,
        hasPrev: pagination?.hasPrev ?? pagination?.hasPreviousPage ?? (pagination?.page ?? query.page ?? 1) > 1,
      },
      summary,
    }
  },

  async respondToReview(reviewId: string, response: string): Promise<void> {
    await apiRequest(`/reviews/${reviewId}/response`, {
      method: 'PATCH',
      body: { response },
    })
  },

  /**
   * Lấy lịch làm việc chi tiết của Provider
   */
  async getProviderAvailability(
    providerId: string,
    signal?: AbortSignal
  ): Promise<ProviderAvailabilitySummary> {
    return fetchProviderAvailability(providerId, signal)
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
