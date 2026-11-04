import type { Metadata } from 'next'
import { DashboardView } from '@/components/admin-reports/dashboard-view'

export const metadata: Metadata = {
  title: 'Dashboard Tổng quan (UC-53) — Admin Console',
  description: 'Bảng điều khiển các chỉ số KPI, hiệu suất dịch vụ và chất lượng vận hành.',
}

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardView />
    </div>
  )
}
