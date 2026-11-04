'use client'

import type { ReactNode } from 'react'
<<<<<<< HEAD
import { BadgeCheck, Briefcase, Inbox, Wrench } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'
=======
import { BadgeCheck, Briefcase, CreditCard, Inbox, UserRound, Wrench, Calendar } from 'lucide-react'
import { WorkspaceShell, type WorkspaceNavLink } from '@/components/workspace/workspace-shell'
import { ProviderStatusCard } from '@/components/admin-providers/provider-status-card'
>>>>>>> development

const PROVIDER_NAV: WorkspaceNavLink[] = [
  { href: '/provider/requests', label: 'Yêu cầu mới', icon: Inbox },
  { href: '/provider/bookings', label: 'Công việc', icon: Briefcase },
  { href: '/provider/skills', label: 'Kỹ năng', icon: BadgeCheck },
<<<<<<< HEAD
=======
  { href: '/provider/profile', label: 'Hồ sơ', icon: UserRound },
  { href: '/provider/membership', label: 'Gói thành viên', icon: CreditCard },
  { href: '/provider/availability', label: 'Lịch rảnh', icon: Calendar },
>>>>>>> development
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
<<<<<<< HEAD
      {children}
=======
      <div className="space-y-6">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <ProviderStatusCard />
        </div>
        {children}
      </div>
>>>>>>> development
    </WorkspaceShell>
  )
}
