import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'
import type { ServiceCategory } from './categories'

export interface MySkills {
  /** Every ACTIVE category the provider can choose. */
  available: ServiceCategory[]
  /** Currently selected (active) category ids. */
  selectedIds: string[]
  /** Skills the provider had that the admin has since disabled. */
  inactiveSkills: ServiceCategory[]
  profile: { exists: boolean; verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | null }
}

/** UC-33 — Provider skills. */
export const skillService = {
  getMine: (signal?: AbortSignal) => apiRequest<ApiEnvelope<MySkills>>('/provider/skills', { signal }),

  updateMine: (skillIds: string[]) =>
    apiRequest<ApiEnvelope<MySkills>>('/provider/skills', { method: 'PUT', body: { skillIds } }),
}
