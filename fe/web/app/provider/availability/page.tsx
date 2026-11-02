import type { Metadata } from 'next'
import { AvailabilityMainView } from '@/components/provider-availability/availability-main-view'

export const metadata: Metadata = {
  title: 'Quản lý Lịch làm việc & Giờ rảnh — Provider Workspace',
  description: 'Cấu hình lịch làm việc định kỳ hàng tuần, giờ nghỉ, ngày ngoại lệ và thời gian đệm di chuyển.',
}

export default function ProviderAvailabilityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AvailabilityMainView />
    </div>
  )
}

