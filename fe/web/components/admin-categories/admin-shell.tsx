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

/** Wraps the separate category-management route for ADMIN users. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell
      role="ADMIN"
      title="Admin Console"
      icon={Crown}
      homeHref="/admin/dashboard"
      nav={ADMIN_NAV}
      accentClass="bg-brand text-brand-foreground"
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
