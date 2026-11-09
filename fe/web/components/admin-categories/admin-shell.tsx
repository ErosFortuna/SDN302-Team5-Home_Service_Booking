'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { BarChart3, Crown, FileText, Layers, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'

const ADMIN_NAV: WorkspaceNavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
  { href: '/admin/categories', label: 'Danh mục dịch vụ', icon: Layers },
  { href: '/admin/providers', label: 'Duyệt hồ sơ thợ', icon: ShieldCheck },
  { href: '/admin/policies', label: 'Chính sách & Điều khoản', icon: FileText },
]

/** Wraps the /admin/* routes. Provider verification (/admin/providers) is open to both ADMIN and STAFF (thẩm định hồ sơ thợ; chỉ ADMIN được approve theo V-17). */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isProviderVerificationRoute = Boolean(pathname?.startsWith('/admin/providers'))

  return (
    <WorkspaceShell
      role={isProviderVerificationRoute ? ['ADMIN', 'STAFF'] : 'ADMIN'}
      title="Admin Console"
      icon={Crown}
      homeHref={isProviderVerificationRoute ? '/admin/providers' : '/admin/dashboard'}
      nav={ADMIN_NAV}
      accentClass="bg-brand text-brand-foreground"
      login={{
        heading: 'Đăng nhập quản trị',
        subheading: 'Quản lý toàn bộ hệ thống Home Service Booking.',
        roleLabel: isProviderVerificationRoute ? 'quản trị viên hoặc nhân viên' : 'quản trị viên',
      }}
    >
      {children}
    </WorkspaceShell>
  )
}
