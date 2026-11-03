import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'

export type PricingMode = 'FIXED' | 'REQUEST_QUOTE'
export type CategoryIcon =
  | 'wrench' | 'droplets' | 'zap' | 'snowflake' | 'sparkles' | 'paintbrush' | 'key' | 'hammer'
  | 'plug' | 'washing-machine' | 'truck' | 'leaf' | 'bug' | 'shield' | 'home' | 'tv'
export type CategoryStatusFilter = 'all' | 'active' | 'inactive'

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description: string
  pricingMode: PricingMode
  icon: CategoryIcon
  isActive: boolean
  sortOrder: number
  deactivatedAt: string | null
  createdAt: string
  updatedAt: string
  /** Admin endpoints only: number of providers having this category as a skill. */
  providerCount?: number
}

export interface CategoryInput {
  name: string
  description?: string
  pricingMode: PricingMode
  icon?: CategoryIcon
  sortOrder?: number
}

export interface CategoryStats {
  total: number
  active: number
  inactive: number
  fixed: number
  requestQuote: number
}

export interface CategoryListQuery {
  search?: string
  status?: CategoryStatusFilter
  pricingMode?: PricingMode
  page?: number
  limit?: number
}

export type CategoryListResponse = ApiEnvelope<ServiceCategory[]> & {
  meta: { page: number; limit: number; total: number; totalPages: number; stats: CategoryStats }
}

const qs = (query: object) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)))
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** UC-57 / UC-58 — Admin service category management. */
export const categoryService = {
  list: (query: CategoryListQuery = {}, signal?: AbortSignal) =>
    apiRequest<CategoryListResponse>(`/admin/categories${qs(query)}`, { signal }),

  create: (input: CategoryInput) =>
    apiRequest<ApiEnvelope<ServiceCategory>>('/admin/categories', { method: 'POST', body: input }),

  update: (id: string, input: Partial<CategoryInput>) =>
    apiRequest<ApiEnvelope<ServiceCategory>>(`/admin/categories/${id}`, { method: 'PATCH', body: input }),

  setActive: (id: string, isActive: boolean) =>
    apiRequest<ApiEnvelope<ServiceCategory>>(`/admin/categories/${id}/status`, { method: 'PATCH', body: { isActive } }),

  /** Public catalogue (active categories only). */
  listActive: (signal?: AbortSignal) => apiRequest<ApiEnvelope<ServiceCategory[]>>('/service-categories', { signal }),
}
