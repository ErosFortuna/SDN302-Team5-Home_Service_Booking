import type { Metadata } from 'next'
import { RevenueReportView } from '@/components/admin-reports/revenue-report-view'

export const metadata: Metadata = {
  title: 'Báo cáo Doanh thu & Hiệu suất (UC-61) — Admin Console',
  description: 'Báo cáo chuỗi thời gian doanh thu và bảng xếp hạng hiệu suất thợ.',
}

export default function AdminReportsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RevenueReportView />
    </div>
  )
}
