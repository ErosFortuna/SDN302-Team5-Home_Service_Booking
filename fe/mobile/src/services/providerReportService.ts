import { apiRequest } from './apiClient';

export type ReportGranularity = 'day' | 'week' | 'month';
export type RequestGranularity = 'day' | 'week';

export interface ProviderPerformanceReport {
  dateRange: { startDate: string; endDate: string };
  summary: {
    totalRevenue: number;
    completedBookings: number;
    totalRequests: number;
    respondedRequests: number;
    responseRate: number;
    averageResponseMinutes: number | null;
  };
  revenueSeries: Array<{ period: string; revenue: number; completedBookings: number }>;
  requestSeries: Array<{ period: string; bookingCount: number; sharePercent: number }>;
  granularity: ReportGranularity;
  requestGranularity: RequestGranularity;
}

export async function getProviderPerformanceReport(params: {
  startDate: string;
  endDate: string;
  granularity: ReportGranularity;
  requestGranularity: RequestGranularity;
}): Promise<ProviderPerformanceReport> {
  const query = new URLSearchParams(params).toString();
  const response = await apiRequest<ProviderPerformanceReport>(`/provider/reports/performance?${query}`);
  if (!response.data) throw new Error('Máy chủ không trả về báo cáo provider.');
  return response.data;
}

export const formatProviderReportMoney = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
