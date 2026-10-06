'use client'

import type { ReactNode } from 'react'
import { BadgeCheck, Briefcase, Inbox, Wrench } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'

const PROVIDER_NAV: WorkspaceNavLink[] = [
  { href: '/provider/requests', label: 'Yêu cầu mới', icon: Inbox },
  { href: '/provider/bookings', label: 'Công việc', icon: Briefcase },
  { href: '/provider/skills', label: 'Kỹ năng', icon: BadgeCheck },
]

/** Wraps /provider/* pages: toast context + real JWT login (PROVIDER role). */
export function ProviderShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell
      role="PROVIDER"
      title="Provider Workspace"
      icon={Wrench}
      homeHref="/provider/bookings"
      nav={PROVIDER_NAV}
      login={{
        heading: 'Đăng nhập thợ',
        subheading: 'Quản lý tiến độ công việc của bạn.',
        demoEmail: 'provider.demo@homecare.local',
        roleLabel: 'thợ',
      }}
    >
      {children}
    </WorkspaceShell>
  )
}
