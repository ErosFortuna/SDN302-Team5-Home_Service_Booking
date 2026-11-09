import { apiRequest, API_BASE_URL, getStoredToken } from './client';
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
  pricingType: 'FIXED' | 'FROM';
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
  status: 'OPEN' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';
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
  const token = getStoredToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập trước khi tải ảnh đính kèm.');
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
const CATEGORY_SLUG_MAP: Record<string, string[]> = {
  Cleaning: ['don-dep-nha-theo-gio', 'tong-ve-sinh-can-ho', 'home-cleaning'],
  'Dọn dẹp nhà': ['don-dep-nha-theo-gio', 'tong-ve-sinh-can-ho', 'home-cleaning'],
  'don-dep-nha': ['don-dep-nha-theo-gio', 'tong-ve-sinh-can-ho', 'home-cleaning'],
  Electrical: ['sua-dien-dan-dung', 'electrical-repair'],
  'Điện nước': ['sua-ong-nuoc-ro-ri', 'sua-dien-dan-dung', 'lap-dat-bon-cau', 'lap-may-nuoc-nong'],
  'dien-nuoc': ['sua-ong-nuoc-ro-ri', 'sua-dien-dan-dung', 'lap-dat-bon-cau', 'lap-may-nuoc-nong'],
  Plumbing: ['sua-ong-nuoc-ro-ri', 'lap-dat-bon-cau', 'plumbing-repair'],
  Appliance: ['sua-may-lanh', 've-sinh-may-lanh', 'sua-may-giat', 'air-conditioner-cleaning'],
  'Điện lạnh': ['ve-sinh-may-lanh', 'sua-may-lanh', 'nap-gas-may-lanh'],
  'dien-lanh': ['ve-sinh-may-lanh', 'sua-may-lanh', 'nap-gas-may-lanh'],
  'Sửa đồ gia dụng': ['sua-may-giat'],
  'do-gia-dung': ['sua-may-giat'],
  'Sửa khóa': ['mo-khoa-tai-nha', 'lap-khoa-van-tay'],
  'sua-khoa': ['mo-khoa-tai-nha', 'lap-khoa-van-tay'],
  'Sơn sửa nhà': ['son-tuong-noi-that', 'chong-tham-nha-ve-sinh'],
  'son-sua-nha': ['son-tuong-noi-that', 'chong-tham-nha-ve-sinh'],
  'Diệt côn trùng': ['phun-thuoc-diet-muoi'],
  'diet-con-trung': ['phun-thuoc-diet-muoi'],
  Painting: ['son-tuong-noi-that', 'chong-tham-nha-ve-sinh', 'home-cleaning', 'plumbing-repair'],
};

// Known seeded fallback IDs in test DB
const SEEDED_SERVICE_FALLBACKS: Record<string, string> = {
  Cleaning: '6abb49a3c1679d49c1de9a25', // Home Cleaning
  'Dọn dẹp nhà': '6abb49a3c1679d49c1de9a25',
  Plumbing: '6abb49a3c1679d49c1de9a24', // Plumbing Repair
  'Điện nước': '6abb49a3c1679d49c1de9a24',
  Appliance: '6abb49a3c1679d49c1de9a23', // Air Conditioner Cleaning
  'Điện lạnh': '6abb49a3c1679d49c1de9a23',
  Electrical: '6abb49a3c1679d49c1de9a26', // Electrical Repair
  Painting: '6abb49a3c1679d49c1de9a25',
  'Sơn sửa nhà': '6abb49a3c1679d49c1de9a25',
};

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim();
}

/**
 * Parses user-provided title and description from MongoDB's ServiceRequest.description
 * which concatenates title and description with " - "
 */
export function parseRequestTitleAndDesc(
  rawDesc?: string,
  fallbackServiceTitle?: string
): { title: string; description: string } {
  const fallback = fallbackServiceTitle || 'Đơn dịch vụ';
  if (!rawDesc || !rawDesc.trim()) {
    return { title: fallback, description: '' };
  }

  let clean = rawDesc
    .replace(/\s*\(Yêu cầu dịch vụ tại nhà\)\s*$/gi, '')
    .trim();

  clean = clean.replace(/^Yêu cầu dịch vụ [^:]+:\s*/gi, '').trim();

  const sepIdx = clean.indexOf(' - ');
  if (sepIdx !== -1) {
    const titlePart = clean.slice(0, sepIdx).trim();
    const descPart = clean.slice(sepIdx + 3).trim();
    return {
      title: titlePart || fallback,
      description: descPart,
    };
  }

  return {
    title: clean || fallback,
    description: '',
  };
}

/**
 * Find the most suitable backend service ID based on category and title
 */
export function resolveServiceId(
  category: ServiceCategory,
  availableServices: BackendService[],
  userTitle?: string
): string {
  const service = findServiceForCategory(category, availableServices, userTitle);
  if (service?.id || service?._id) return service.id || service._id || '';
  return SEEDED_SERVICE_FALLBACKS[category] || '6abb49a3c1679d49c1de9a23';
}

function findServiceForCategory(
  category: ServiceCategory,
  availableServices: BackendService[],
  userTitle?: string
): BackendService | undefined {
  if (!availableServices || availableServices.length === 0) {
    return undefined;
  }

  const normalizedCategory = normalizeSearchText(category);
  const slugs = CATEGORY_SLUG_MAP[category] || CATEGORY_SLUG_MAP[normalizedCategory] || [];

  // Filter available services belonging to this category
  const servicesInCategory = availableServices.filter((s) => {
    if (slugs.includes(s.slug)) return true;
    const catName = s.category?.name ? normalizeSearchText(s.category.name) : '';
    const catSlug = s.category?.slug ? normalizeSearchText(s.category.slug) : '';
    return catName === normalizedCategory || catSlug === normalizedCategory;
  });

  const pool = servicesInCategory.length > 0 ? servicesInCategory : availableServices;

  // 1. If userTitle is provided, check if any service in pool matches keywords in userTitle
  if (userTitle && userTitle.trim()) {
    const normTitle = normalizeSearchText(userTitle);

    const KEYWORD_MAP: Array<{ keywords: string[]; slugPart: string }> = [
      { keywords: ['nuoc nong', 'binh nong lanh'], slugPart: 'lap-may-nuoc-nong' },
      { keywords: ['bon cau', 'toilet', 've sinh'], slugPart: 'lap-dat-bon-cau' },
      { keywords: ['ong nuoc', 'ro ri', 'van nuoc', 'voi nuoc', 'lavabo', 'bon rua', 'be ong'], slugPart: 'sua-ong-nuoc-ro-ri' },
      { keywords: ['chap dien', 'aptomat', 'o cam', 'cong tac', 'chay cau chi', 'mat dien', 'dien'], slugPart: 'sua-dien-dan-dung' },
      { keywords: ['may lanh', 'dieu hoa', 've sinh may'], slugPart: 've-sinh-may-lanh' },
      { keywords: ['nap gas', 'bom gas', 'thieu gas'], slugPart: 'nap-gas-may-lanh' },
      { keywords: ['sua may lanh', 'may lanh khong lanh'], slugPart: 'sua-may-lanh' },
      { keywords: ['may giat'], slugPart: 'sua-may-giat' },
      { keywords: ['khoa van tay', 'khoa thong minh', 'khoa dien tu'], slugPart: 'lap-khoa-van-tay' },
      { keywords: ['mo khoa', 'sua khoa', 'ket khoa', 'mat chia'], slugPart: 'mo-khoa-tai-nha' },
      { keywords: ['son tuong', 'son nha', 'dan tuong'], slugPart: 'son-tuong-noi-that' },
      { keywords: ['chong tham', 'ngam nuoc', 'ro tran'], slugPart: 'chong-tham-nha-ve-sinh' },
      { keywords: ['diet muoi', 'con trung', 'diet gian', 'diet moi'], slugPart: 'phun-thuoc-diet-muoi' },
      { keywords: ['tong ve sinh', 'sau xay dung', 'can ho'], slugPart: 'tong-ve-sinh-can-ho' },
      { keywords: ['don dep', 'don nha', 'giup viec', 'theo gio'], slugPart: 'don-dep-nha-theo-gio' },
    ];

    for (const item of KEYWORD_MAP) {
      if (item.keywords.some((kw) => normTitle.includes(kw))) {
        const match = pool.find((s) => s.slug.includes(item.slugPart));
        if (match) return match;
      }
    }

    // Direct match against service names in pool
    const directMatch = pool.find((s) => {
      const normServiceName = normalizeSearchText(s.name);
      return normTitle.includes(normServiceName) || normServiceName.includes(normTitle);
    });
    if (directMatch) return directMatch;
  }

  // 2. Try to match preferred slugs in CATEGORY_SLUG_MAP in order
  for (const preferredSlug of slugs) {
    const match = pool.find((s) => s.slug === preferredSlug);
    if (match) return match;
  }

  // 3. Fallback to first service in pool
  return pool[0] || availableServices[0];
}

export function getEstimatedServiceDurationMinutes(
  category: ServiceCategory,
  availableServices: BackendService[]
): number {
  const duration = findServiceForCategory(category, availableServices)?.estimatedDurationMinutes;
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? duration
    : 60;
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
  const serviceId = resolveServiceId(input.category, activeServices, input.title);

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

  const dateParts = input.date.split('-').map(Number);
  const timeParts = input.time.split(':').map(Number);
  if (
    dateParts.length !== 3 ||
    timeParts.length !== 2 ||
    dateParts.some((part) => !Number.isInteger(part)) ||
    timeParts.some((part) => !Number.isInteger(part))
  ) {
    throw new Error('Vui lòng chọn ngày và giờ hợp lệ.');
  }
  const [year, month, day] = dateParts;
  const [hours, minutes] = timeParts;
  const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    startDate.getFullYear() !== year ||
    startDate.getMonth() !== month - 1 ||
    startDate.getDate() !== day ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    startDate <= new Date()
  ) {
    throw new Error('Ngày và giờ phải hợp lệ và nằm trong tương lai.');
  }
  const durationMinutes = getEstimatedServiceDurationMinutes(input.category, activeServices);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  // Extract address info
  const fullAddress = input.address?.trim() || 'Đà Nẵng';
  const parts = fullAddress.split(',').map((p: string) => p.trim());
  const city = parts.length > 1 ? parts[parts.length - 1] : 'Đà Nẵng';

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
        coordinates: Array.isArray(input.coordinates) && input.coordinates.length === 2
          ? input.coordinates
          : [108.2208, 16.0544],
      },
    },
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
}


export interface RecommendedProviderItem {
  providerId: string;
  fullName: string;
  businessName?: string;
  avatarUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  completedJobCount: number;
  yearsOfExperience?: number;
  distanceKm?: number | null;
  score: number;
  scoreBreakdown?: Record<string, number>;
  reasons?: string[];
  basePrice?: number;
}

export interface DispatchServiceRequestItem {
  id: string;
  customer?: {
    id: string;
    fullName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
  } | string;
  service?: {
    id: string;
    name: string;
    basePrice?: number;
    category?: { id?: string; name?: string; slug?: string } | null;
  };
  category?: string;
  description: string;
  address: ServiceRequestAddress;
  preferredStartAt: string;
  preferredEndAt: string;
  budgetMin?: number;
  budgetMax?: number;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';
  attachments?: string[];
  createdAt: string;
}

/**
 * Fetch requests for staff dispatch (GET /api/requests?status=OPEN)
 */
export async function getDispatchRequests(
  params?: { status?: string; page?: number; limit?: number }
): Promise<{ requests: DispatchServiceRequestItem[]; totalItems: number }> {
  const status = params?.status || 'OPEN';
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const res = await apiRequest<DispatchServiceRequestItem[]>(
    `/requests?status=${status}&page=${page}&limit=${limit}`
  );
  return {
    requests: res.data || [],
    totalItems: (res as any).pagination?.totalItems || (res.data ? res.data.length : 0),
  };
}

/**
 * Fetch recommended providers for a request (GET /api/requests/:requestId/recommended-providers)
 */
export async function getDispatchRecommendedProviders(
  requestId: string,
  query?: { limit?: number; radiusKm?: number; sortBy?: string }
): Promise<RecommendedProviderItem[]> {
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.radiusKm) params.set('radiusKm', String(query.radiusKm));
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await apiRequest<RecommendedProviderItem[]>(
    `/requests/${requestId}/recommended-providers${qs}`
  );
  return res.data || [];
}

/**
 * Staff assigns/dispatches a provider to a request (POST /api/requests/:requestId/assign-provider)
 */
export async function dispatchAssignProvider(
  requestId: string,
  providerId: string,
  scheduledStartAt?: string
): Promise<{ booking: any; request: any }> {
  const res = await apiRequest<{ booking: any; request: any }>(
    `/requests/${requestId}/assign-provider`,
    {
      method: 'POST',
      body: JSON.stringify({ providerId, scheduledStartAt }),
    }
  );
  if (!res.data) {
    throw new Error(res.message || 'Không thể điều phối thợ cho yêu cầu này');
  }
  return res.data;
}


/**
 * Customer selects a provider for their own request (POST /api/requests/:requestId/select-provider)
 */
export async function customerSelectProvider(
  requestId: string,
  providerId: string,
  scheduledStartAt?: string
): Promise<{ booking: any; request: any }> {
  const res = await apiRequest<{ booking: any; request: any }>(
    `/requests/${requestId}/select-provider`,
    {
      method: 'POST',
      body: JSON.stringify({ providerId, scheduledStartAt }),
    }
  );
  if (!res.data) {
    throw new Error(res.message || 'Không thể chọn thợ cho yêu cầu này');
  }
  return res.data;
}
