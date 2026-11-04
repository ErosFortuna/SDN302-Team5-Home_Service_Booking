import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin-categories/admin-shell'

export const metadata: Metadata = {
  title: 'Admin Console — Home Service Booking',
  description: 'Khu vực quản trị hệ thống Home Service Booking.',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
