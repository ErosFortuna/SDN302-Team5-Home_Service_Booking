export type ManagedUserRole = 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN'
export type ManagedUserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export interface ManagedUser {
  id: string
  fullName: string
  email: string
  phone: string
  role: ManagedUserRole
  status: ManagedUserStatus
  emailVerified: boolean
  avatarUrl: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface ManagedUserInput {
  fullName: string
  email: string
  phone: string
  role: ManagedUserRole
  status: ManagedUserStatus
  emailVerified: boolean
  password?: string
}

export interface ManagedUserStats {
  total: number
  active: number
  inactive: number
  blocked: number
  customers: number
  providers: number
  staff: number
  admins: number
}

export function getUserInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi-VN')
}

export const USER_ROLE_LABELS: Record<ManagedUserRole, string> = {
  CUSTOMER: 'Khách hàng',
  PROVIDER: 'Đối tác',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

export const USER_STATUS_LABELS: Record<ManagedUserStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  BLOCKED: 'Đã khóa',
}
