import { apiRequest } from './client'

export interface ProviderPerformanceReport {
  dateRange: { startDate: string; endDate: string }
  summary: {
    totalRevenue: number
    completedBookings: number
    totalRequests: number
    respondedRequests: number
    responseRate: number
    averageResponseMinutes: number | null
  }
  revenueSeries: Array<{ period: string; revenue: number; completedBookings: number }>
  requestSeries: Array<{ period: string; bookingCount: number; sharePercent: number }>
  granularity: 'day' | 'week' | 'month'
  requestGranularity: 'day' | 'week'
}

export const providerReportsApi = {
  performance: (params: {
    startDate: string
    endDate: string
    granularity: 'day' | 'week' | 'month'
    requestGranularity: 'day' | 'week'
  }, signal?: AbortSignal) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest<{ success: boolean; data: ProviderPerformanceReport }>(`/provider/reports/performance?${query}`, { signal })
  },
}
