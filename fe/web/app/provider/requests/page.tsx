import type { Metadata } from 'next'
import { IncomingRequestsPage } from '@/components/provider-requests/incoming-requests-page'

export const metadata: Metadata = {
  title: 'Yêu cầu mới — Provider Workspace',
  description: 'Xem các yêu cầu dịch vụ mới phù hợp với kỹ năng và khu vực của bạn.',
}

export default function ProviderIncomingRequestsRoute() {
  return <IncomingRequestsPage />
}
