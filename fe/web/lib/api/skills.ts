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
<<<<<<< HEAD
  profile: { exists: boolean; verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null }
=======
  profile: { exists: boolean; verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | null }
>>>>>>> development
}

/** UC-33 — Provider skills. */
export const skillService = {
  getMine: (signal?: AbortSignal) => apiRequest<ApiEnvelope<MySkills>>('/provider/skills', { signal }),

  updateMine: (skillIds: string[]) =>
    apiRequest<ApiEnvelope<MySkills>>('/provider/skills', { method: 'PUT', body: { skillIds } }),
}
