import type { Metadata } from 'next'
import { AdminProvidersDashboard } from '@/components/admin-providers/admin-providers-dashboard'

export const metadata: Metadata = {
  title: 'Xét duyệt hồ sơ thợ (UC-56) — Admin Console',
  description: 'Quản lý, kiểm tra giấy tờ xác minh và phê duyệt / từ chối hồ sơ thợ.',
}

export default function AdminProvidersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminProvidersDashboard />
    </div>
  )
}

