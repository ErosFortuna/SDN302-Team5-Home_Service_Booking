import { apiRequest } from './apiClient';

export interface ProviderProfile {
  id: string;
  businessName: string;
  bio: string;
  yearsOfExperience: number;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  averageRating: number;
  reviewCount: number;
  completedJobCount: number;
  skills: string[];
  serviceAreas: string[];
  city: string;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  documents: string[];
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface ProviderProfileInput {
  businessName: string;
  bio: string;
  yearsOfExperience: number;
  serviceAreas: string[];
  city: string;
  location: { type: 'Point'; coordinates: [number, number] } | null;
}

function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Máy chủ không trả về hồ sơ thợ.');
  }
  return data;
}

export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
  const response = await apiRequest<ProviderProfile | null>('/provider/profile');
  return requireData(response.data);
}

export async function createMyProviderProfile(input: ProviderProfileInput): Promise<ProviderProfile> {
  const response = await apiRequest<ProviderProfile>('/provider/profile', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return requireData(response.data);
}

export async function updateMyProviderProfile(input: ProviderProfileInput): Promise<ProviderProfile> {
  const response = await apiRequest<ProviderProfile>('/provider/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return requireData(response.data);
}

export async function deleteMyProviderProfile(): Promise<ProviderProfile> {
  const response = await apiRequest<ProviderProfile>('/provider/profile', { method: 'DELETE' });
  return requireData(response.data);
}
