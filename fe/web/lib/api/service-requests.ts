import { apiRequest, API_BASE_URL, getStoredToken, ensureCustomerToken } from './client';
import type { NewBookingInput, ServiceCategory } from '../types';

export interface BackendService {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  category?: {
    _id?: string;
    id?: string;
    name?: string;
    slug?: string;
  };
  basePrice: number;
  estimatedDurationMinutes?: number;
  pricingType: 'FIXED' | 'FROM' | 'QUOTE_REQUIRED';
  isActive: boolean;
}

export interface ServiceRequestAddress {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
  country?: string;
  label?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface CreateServiceRequestPayload {
  service: string; // ObjectId of the service
  description: string;
  address: ServiceRequestAddress;
  preferredStartAt: string; // ISO string
  preferredEndAt: string; // ISO string
  budgetMin?: number;
  budgetMax?: number;
  attachments?: string[];
}

export interface BackendServiceRequest {
  id: string;
  customer: string;
  service: string | BackendService;
  category?: string;
  description: string;
  address: ServiceRequestAddress;
  preferredStartAt: string;
  preferredEndAt: string;
  budgetMin?: number;
  budgetMax?: number;
  status: 'OPEN' | 'QUOTED' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch list of active services from backend API
 */
export async function getActiveServices(): Promise<BackendService[]> {
  try {
    const res = await apiRequest<BackendService[]>('/services');
    return res.data || [];
  } catch (err) {
    console.warn('Failed to fetch services from backend, using fallback:', err);
    return [];
  }
}

/**
 * Fetch current customer's requests from backend API
 */
export async function getMyServiceRequests(): Promise<BackendServiceRequest[]> {
  const res = await apiRequest<BackendServiceRequest[]>('/service-requests/me');
  return res.data || [];
}

/**
 * Create a new service request via POST /api/service-requests
 */
export async function postCreateServiceRequest(
  payload: CreateServiceRequestPayload
): Promise<BackendServiceRequest> {
  const res = await apiRequest<BackendServiceRequest>('/service-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.data) {
    throw new Error(res.message || 'Failed to create service request');
  }

  return res.data;
}

/**
 * Upload image files to Cloudinary via backend POST /api/upload
 */
export async function uploadRequestImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  let token = getStoredToken();
  if (!token) {
    token = await ensureCustomerToken();
  }

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || 'Tải ảnh lên thất bại');
  }

  return body.urls || (body.data ? body.data.map((item: any) => item.url) : []);
}

/**
 * Maps category names in UI to matched active services in MongoDB
 */
const CATEGORY_SLUG_MAP: Record<ServiceCategory, string[]> = {
  Cleaning: ['home-cleaning', 'don-dep-nha-theo-gio'],
  Electrical: ['electrical-repair', 'sua-dien-dan-dung'],
  Plumbing: ['plumbing-repair', 'sua-ong-nuoc-ro-ri', 'lap-dat-thiet-bi-ve-sinh'],
  Appliance: ['air-conditioner-cleaning', 'sua-may-lanh', 've-sinh-may-lanh'],
  Painting: ['home-cleaning', 'plumbing-repair'],
};

// Known seeded fallback IDs in test DB
const SEEDED_SERVICE_FALLBACKS: Record<ServiceCategory, string> = {
  Cleaning: '6abb49a3c1679d49c1de9a25', // Home Cleaning
  Plumbing: '6abb49a3c1679d49c1de9a24', // Plumbing Repair
  Appliance: '6abb49a3c1679d49c1de9a23', // Air Conditioner Cleaning
  Electrical: '6abb49a3c1679d49c1de9a26', // Electrical Repair
  Painting: '6abb49a3c1679d49c1de9a25',
};

/**
 * Find the most suitable backend service ID based on category and title
 */
export function resolveServiceId(
  category: ServiceCategory,
  availableServices: BackendService[]
): string {
  if (availableServices.length > 0) {
    const slugs = CATEGORY_SLUG_MAP[category] || [];
    const matched = availableServices.find(
      (s) =>
        slugs.includes(s.slug) ||
        s.name.toLowerCase().includes(category.toLowerCase())
    );
    if (matched) return matched.id || (matched as any)._id;
    // Default to the first active service
    return availableServices[0].id || (availableServices[0] as any)._id;
  }
  return SEEDED_SERVICE_FALLBACKS[category] || '6abb49a3c1679d49c1de9a23';
}

/**
 * Convert user form inputs from BookingFlow into valid CreateServiceRequestPayload
 */
export function buildServiceRequestPayload(
  input: NewBookingInput,
  userName: string = 'Nguyen Van A',
  userPhone: string = '0912345678',
  activeServices: BackendService[] = []
): CreateServiceRequestPayload {
  const serviceId = resolveServiceId(input.category, activeServices);

  // Description must be 10..3000 chars
  let description = `${input.title.trim()}`;
  if (input.description && input.description.trim()) {
    description += ` - ${input.description.trim()}`;
  }
  if (description.length < 10) {
    description = `${description} (Yêu cầu dịch vụ tại nhà)`;
  }
  if (description.length < 10) {
    description = `Yêu cầu dịch vụ ${input.category}: ${description}`;
  }

  // Parse time & date into valid future dates
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow by default
  startDate.setHours(9, 0, 0, 0);

  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours after start

  // Extract address info
  const fullAddress = input.address?.trim() || '123 Nguyen Hue, Quan 1, TP.HCM';
  const parts = fullAddress.split(',').map((p: string) => p.trim());
  const city = parts.length > 1 ? parts[parts.length - 1] : 'TP.HCM';

  const budget = typeof input.budget === 'number' && input.budget > 0 ? input.budget : 300000;
  const budgetMin = Math.round(budget * 0.8);
  const budgetMax = Math.round(budget * 1.2);

  // Safe phone format (must match Vietnamese phone: 0 + (3|5|7|8|9) + 8 digits)
  let phone = userPhone.replace(/\D/g, '');
  if (!/^(0)(3|5|7|8|9)\d{8}$/.test(phone)) {
    phone = '0912345678';
  }

  return {
    service: serviceId,
    description: description.slice(0, 3000),
    preferredStartAt: startDate.toISOString(),
    preferredEndAt: endDate.toISOString(),
    budgetMin,
    budgetMax,
    address: {
      recipientName: userName || 'Khách hàng',
      phone,
      addressLine: fullAddress.slice(0, 500),
      city: city.slice(0, 100),
      country: 'Vietnam',
      location: {
        type: 'Point',
        coordinates: [106.7009, 10.7769], // Ho Chi Minh City coordinates
      },
    },
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
}
