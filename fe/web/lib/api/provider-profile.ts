import { apiRequest } from '@/lib/api/client'

export interface ProviderProfile {
  id: string
  businessName: string
  bio: string
  yearsOfExperience: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  averageRating: number
  reviewCount: number
  completedJobCount: number
  skills: string[]
  serviceAreas: string[]
  city: string
  location: { type: 'Point'; coordinates: [number, number] } | null
  documents: string[]
  isDeleted: boolean
  deletedAt: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ProviderProfileInput {
  businessName: string
  bio: string
  yearsOfExperience: number
  serviceAreas: string[]
  city: string
  location: { type: 'Point'; coordinates: [number, number] } | null
}

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('Máy chủ không trả về hồ sơ thợ.')
  return data
}

export async function getMyProviderProfile() {
  const response = await apiRequest<ProviderProfile | null>('/provider/profile')
  return requireData(response.data)
}

export async function createMyProviderProfile(profile: ProviderProfileInput) {
  const response = await apiRequest<ProviderProfile>('/provider/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
  return requireData(response.data)
}

export async function updateMyProviderProfile(profile: ProviderProfileInput) {
  const response = await apiRequest<ProviderProfile>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
  return requireData(response.data)
}

export async function deleteMyProviderProfile() {
  const response = await apiRequest<ProviderProfile>('/provider/profile', { method: 'DELETE' })
  return requireData(response.data)
}
