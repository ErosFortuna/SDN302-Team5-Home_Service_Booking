import { apiRequest } from './client'

export type ServicePricingType = 'FIXED' | 'FROM' | 'QUOTE_REQUIRED'
export type ServiceStatusFilter = 'all' | 'active' | 'inactive'

export interface AdminService {
  id: string
  category: { id: string; name: string; slug: string } | null
  name: string
  slug: string
  description: string
  basePrice: number
  estimatedDurationMinutes: number
  pricingType: ServicePricingType
  requirements: string[]
  isActive: boolean
  deactivatedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface AdminServiceInput {
  categoryId: string
  name: string
  description: string
  basePrice: number
  estimatedDurationMinutes: number
  pricingType: ServicePricingType
  requirements: string[]
}

export interface AdminServiceQuery {
  search?: string
  status?: ServiceStatusFilter
  categoryId?: string
  page?: number
  limit?: number
}

export type AdminServiceListResponse = {
  success: boolean
  data: AdminService[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    stats: { total: number; active: number; inactive: number }
  }
}

const queryString = (query: object) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => value !== undefined && value !== '' && params.set(key, String(value)))
  const value = params.toString()
  return value ? `?${value}` : ''
}

export const adminServiceApi = {
  list: (query: AdminServiceQuery = {}, signal?: AbortSignal) =>
    apiRequest<AdminService[]>(`/admin/services${queryString(query)}`, { signal }),
  create: (input: AdminServiceInput) =>
    apiRequest<AdminService>('/admin/services', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<AdminServiceInput>) =>
    apiRequest<AdminService>(`/admin/services/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  setActive: (id: string, isActive: boolean) =>
    apiRequest<AdminService>(`/admin/services/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  delete: (id: string) =>
    apiRequest<AdminService>(`/admin/services/${id}`, { method: 'DELETE' }),
}
