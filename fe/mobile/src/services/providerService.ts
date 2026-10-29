import { apiRequest } from './apiClient';
import {
  RecommendedProvider,
  RecommendedProvidersParams,
  ProviderSearchResult,
  ProviderSearchParams,
} from '../types';

/**
 * Fetch recommended providers for a specific service request.
 *
 * @param requestId - The MongoDB ObjectId of the service request (OPEN or QUOTED)
 * @param params - Optional query filters (limit, radiusKm, sortBy)
 */
export async function getRecommendedProviders(
  requestId: string,
  params?: RecommendedProvidersParams
): Promise<RecommendedProvider[]> {
  const queryParts: string[] = [];

  if (params?.limit != null) {
    queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);
  }
  if (params?.radiusKm != null) {
    queryParts.push(`radiusKm=${encodeURIComponent(String(params.radiusKm))}`);
  }
  if (params?.sortBy) {
    queryParts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const endpoint = `/requests/${requestId}/recommended-providers${queryString}`;

  const res = await apiRequest<RecommendedProvider[]>(endpoint, {
    method: 'GET',
  });

  return res.data || [];
}

/**
 * Public search for providers with pagination, geographic filtering, and ratings.
 *
 * @param params - Search criteria
 */
export async function searchProviders(
  params: ProviderSearchParams
): Promise<{
  data: ProviderSearchResult[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> {
  const queryParts: string[] = [];

  if (params.serviceId) queryParts.push(`serviceId=${encodeURIComponent(params.serviceId)}`);
  if (params.categoryId) queryParts.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
  if (params.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
  if (params.lat != null) queryParts.push(`lat=${encodeURIComponent(String(params.lat))}`);
  if (params.lng != null) queryParts.push(`lng=${encodeURIComponent(String(params.lng))}`);
  if (params.radiusKm != null) queryParts.push(`radiusKm=${encodeURIComponent(String(params.radiusKm))}`);
  if (params.minRating != null) queryParts.push(`minRating=${encodeURIComponent(String(params.minRating))}`);
  if (params.page != null) queryParts.push(`page=${encodeURIComponent(String(params.page))}`);
  if (params.limit != null) queryParts.push(`limit=${encodeURIComponent(String(params.limit))}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const endpoint = `/providers/search${queryString}`;

  const res = await apiRequest<ProviderSearchResult[]>(endpoint, {
    method: 'GET',
  });

  return {
    data: res.data || [],
    pagination: res.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      totalItems: (res.data || []).length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}
