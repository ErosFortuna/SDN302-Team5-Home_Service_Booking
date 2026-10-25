'use client'

import type { ReactNode } from 'react'
import { Crown, Layers } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'

const ADMIN_NAV: WorkspaceNavLink[] = [
  { href: '/admin/categories', label: 'Danh mục dịch vụ', icon: Layers },
]

/** Wraps the separate category-management route for ADMIN users. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell
      role="ADMIN"
      title="Admin Console"
      icon={Crown}
      homeHref="/admin/categories"
      nav={ADMIN_NAV}
      accentClass="bg-brand text-brand-foreground"
      login={{
        heading: 'Đăng nhập quản trị',
        subheading: 'Quản lý người dùng và danh mục dịch vụ của hệ thống.',
        demoEmail: 'admin.demo@homecare.local',
        roleLabel: 'quản trị viên',
      }}
    >
      {children}
    </WorkspaceShell>
  )
}
