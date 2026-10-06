import type { Metadata } from 'next'
import { ProviderShell } from '@/components/provider-booking/provider-shell'

export const metadata: Metadata = {
  title: 'Provider Workspace — Home Service Booking',
  description: 'Quản lý và cập nhật tiến độ công việc dành cho thợ.',
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <ProviderShell>{children}</ProviderShell>
}
