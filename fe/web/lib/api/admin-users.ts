import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'
import type { ManagedUser, ManagedUserInput, ManagedUserRole, ManagedUserStatus, ManagedUserStats } from '../admin-users'

export interface AdminUserListQuery {
  search?: string
  role?: ManagedUserRole | 'all'
  status?: ManagedUserStatus | 'all'
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'role' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface AdminUserListResponse {
  success: boolean
  data: ManagedUser[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    stats: ManagedUserStats
  }
}

function queryString(query: AdminUserListQuery) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.toString()
}

export const adminUsersApi = {
  list: (query: AdminUserListQuery, signal?: AbortSignal) =>
    apiRequest<AdminUserListResponse>(`/admin/users?${queryString(query)}`, { signal }),

  getById: (id: string, signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<ManagedUser>>(`/admin/users/${encodeURIComponent(id)}`, { signal }),

  create: (input: ManagedUserInput) =>
    apiRequest<ApiEnvelope<ManagedUser>>('/admin/users', { method: 'POST', body: input }),

  update: (id: string, input: Partial<ManagedUserInput>) =>
    apiRequest<ApiEnvelope<ManagedUser>>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: input }),

  delete: (id: string) =>
    apiRequest<ApiEnvelope<{ id: string }>>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
