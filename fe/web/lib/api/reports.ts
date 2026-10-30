import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'

export interface DashboardKPI {
  totalUsers: number
  activeProviders: number
  totalBookings: number
  completedServices: number
  cancellationRate: number
  netRevenue: number
  grossRevenue: number
  refundedAmount: number
  netGrowthPercent: number
}

export interface BookingStatusBreakdown {
  completed: number
  inProgress: number
  cancelled: number
  pending: number
  total: number
}

export interface CategoryBreakdownItem {
  categoryName: string
  categorySlug: string
  bookingsCount: number
  totalValue: number
  percentage: number
}

export interface OperationalQuality {
  avgHandlingMinutes: number
  systemAvgRating: number
  totalReviews: number
  openComplaintsCount: number
}

export interface DashboardOverviewResponse {
  dateRange: {
    startDate: string
    endDate: string
  }
  kpi: DashboardKPI
  statusBreakdown: BookingStatusBreakdown
  categoriesBreakdown: CategoryBreakdownItem[]
  operationalQuality: OperationalQuality
}

export interface RevenueTimeSeriesItem {
  period: string
  grossRevenue: number
  refundedAmount: number
  netRevenue: number
  paidBookingsCount: number
}

export interface RevenueTimeSeriesResponse {
  dateRange: {
    startDate: string
    endDate: string
  }
  granularity: 'day' | 'week' | 'month'
  summary: {
    grossRevenue: number
    refundedAmount: number
    netRevenue: number
    paidBookingsCount: number
  }
  data: RevenueTimeSeriesItem[]
}

export interface ProviderRevenueItem {
  _id: string
  providerName: string
  email?: string
  phone?: string
  avatar?: string
  businessName?: string
  rating: number
  reviewCount: number
  grossRevenue: number
  refundedAmount: number
  netRevenue: number
  completedJobs: number
}

export interface ProviderRevenueResponse {
  items: ProviderRevenueItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  dateRange: {
    startDate: string
    endDate: string
  }
}

/** UC-53 & UC-61 — Admin Analytics & Reports API */
export const reportsApi = {
  /** UC-53: Lấy toàn bộ chỉ số Dashboard tổng quan */
  getDashboard: (params?: { startDate?: string; endDate?: string }, signal?: AbortSignal) => {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<ApiEnvelope<DashboardOverviewResponse>>(`/admin/reports/dashboard${qs}`, {
      signal,
    })
  },

  /** UC-61: Lấy chuỗi thời gian doanh thu nhóm theo ngày/tuần/tháng */
  getRevenueTimeSeries: (
    params?: { startDate?: string; endDate?: string; granularity?: 'day' | 'week' | 'month' },
    signal?: AbortSignal
  ) => {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    if (params?.granularity) q.set('granularity', params.granularity)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<ApiEnvelope<RevenueTimeSeriesResponse>>(
      `/admin/reports/revenue-time-series${qs}`,
      { signal }
    )
  },

  /** UC-61: Lấy báo cáo xếp hạng doanh thu và hiệu suất theo Provider */
  getRevenueByProvider: (
    params?: {
      startDate?: string
      endDate?: string
      page?: number
      limit?: number
      sortBy?: string
      order?: 'asc' | 'desc'
      search?: string
    },
    signal?: AbortSignal
  ) => {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.sortBy) q.set('sortBy', params.sortBy)
    if (params?.order) q.set('order', params.order)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<
      ApiEnvelope<ProviderRevenueItem[]> & {
        pagination: ProviderRevenueResponse['pagination']
        dateRange: ProviderRevenueResponse['dateRange']
      }
    >(`/admin/reports/revenue-by-provider${qs}`, { signal })
  },
}
