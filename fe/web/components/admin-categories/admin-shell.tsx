'use client'

import type { ReactNode } from 'react'
import { BarChart3, Crown, Layers, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'

const ADMIN_NAV: WorkspaceNavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
  { href: '/admin/categories', label: 'Danh mục dịch vụ', icon: Layers },
  { href: '/admin/providers', label: 'Duyệt hồ sơ thợ', icon: ShieldCheck },
]

/** Wraps /admin/* pages: toast context + real JWT login (ADMIN role). */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell
      role="ADMIN"
      title="Admin Console"
      icon={Crown}
      homeHref="/admin/dashboard"
      nav={ADMIN_NAV}
      accentClass="bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
      login={{
        heading: 'Đăng nhập quản trị',
        subheading: 'Quản lý toàn bộ hệ thống Home Service Booking.',
        demoEmail: 'admin.demo@homecare.local',
        roleLabel: 'quản trị viên',
      }}
    >
      {children}
    </WorkspaceShell>
  )
}
