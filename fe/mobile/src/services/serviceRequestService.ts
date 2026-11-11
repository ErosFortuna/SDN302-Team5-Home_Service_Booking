import { apiRequest, getApiBaseUrl, getStoredToken } from './apiClient';
import { File } from 'expo-file-system';
import { NewBookingInput, ServiceCategory } from '../types';
import {
  getVietnamParts,
  toOffsetIso,
  vietnamWallClockToDate,
  vietnamWallClockToIso,
} from '../utils/timezone';

export interface BackendCategory {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

export interface BackendService {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  category?: {
    id?: string;
    _id?: string;
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

const CATEGORY_SLUG_MAP: Record<ServiceCategory, string[]> = {
  Cleaning: ['home-cleaning', 'don-dep-nha', 'don-dep-nha-theo-gio', 've-sinh-nha-cua'],
  Electrical: ['electrical-repair', 'sua-dien-dan-dung', 'dien-dan-dung', 'dien-nuoc'],
  Plumbing: ['plumbing-repair', 'sua-ong-nuoc-ro-ri', 'lap-dat-thiet-bi-ve-sinh', 'sua-ong-nuoc', 'dien-nuoc'],
  Appliance: ['air-conditioner-cleaning', 'sua-may-lanh', 've-sinh-may-lanh', 'dieu-hoa-dien-lanh', 'dien-lanh'],
  Painting: ['son-trang-tri', 'son-sua-nha'],
  Locksmith: ['sua-khoa'],
  HomeAppliance: ['do-gia-dung'],
  PestControl: ['diet-con-trung'],
};

/**
 * Fetch active service categories from backend API
 */
export async function getActiveCategories(): Promise<BackendCategory[]> {
  try {
    const res = await apiRequest<BackendCategory[]>('/service-categories');
    return (res.data || []).filter((c) => c.isActive !== false);
  } catch (err) {
    console.warn('Failed to fetch service categories:', err);
    return [];
  }
}

/**
 * Fetch active services from backend API
 */
export async function getActiveServices(): Promise<BackendService[]> {
  const res = await apiRequest<BackendService[]>('/services');
  return res.data || [];
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
    throw new Error(res.message || 'Không thể tạo yêu cầu dịch vụ');
  }

  return res.data;
}

/**
 * Upload image from device URI to Cloudinary via backend POST /api/upload
 */
export async function uploadRequestImage(imageUri: string): Promise<string> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const file = new File(imageUri);
  formData.append('images', file, filename);

  const baseUrl = getApiBaseUrl();
  const token = await getStoredToken();
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
    throw new Error(body.message || 'Không thể tải ảnh lên');
  }

  const urls = body.urls || (body.data ? body.data.map((item: any) => item.url) : []);
  return urls[0] || '';
}

export function resolveServiceId(
  category: ServiceCategory,
  availableServices: BackendService[] = []
): string {
  const service = findServiceForCategory(category, availableServices);
  return service?.id || service?._id || '';
}

function findServiceForCategory(
  category: ServiceCategory,
  availableServices: BackendService[]
): BackendService | undefined {
  if (availableServices.length > 0) {
    const slugs = CATEGORY_SLUG_MAP[category] || [];
    const normalizedCategory = category.trim().toLowerCase();
    return availableServices.find(
      (s) =>
        slugs.includes(s.slug) ||
        slugs.includes(s.category?.slug || '') ||
        s.category?.name?.trim().toLowerCase() === normalizedCategory ||
        s.name.toLowerCase().includes(category.toLowerCase())
    );
  }
  return undefined;
}

export function getEstimatedServiceDurationMinutes(
  category: ServiceCategory,
  availableServices: BackendService[] = []
): number {
  const duration = findServiceForCategory(category, availableServices)?.estimatedDurationMinutes;
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? duration
    : 0;
}

/**
 * Convert form input into backend payload
 */
export function buildServiceRequestPayload(
  input: NewBookingInput,
  userName: string,
  userPhone: string,
  activeServices: BackendService[] = []
): CreateServiceRequestPayload {
  const serviceId = resolveServiceId(input.category, activeServices);
  if (!serviceId) throw new Error('Không tìm thấy dịch vụ đang hoạt động tương ứng. Vui lòng chọn dịch vụ từ danh mục mới nhất.');

  let description = `${input.title.trim()}`;
  if (input.description && input.description.trim()) {
    description += ` - ${input.description.trim()}`;
  }
  if (description.length < 10) {
    description = `Yêu cầu dịch vụ ${input.category}: ${description}`;
  }
  if (description.length < 10) {
    description = `${description} (Cần hỗ trợ sớm)`;
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
  const startDate = vietnamWallClockToDate(year, month, day, hours, minutes, 0, 0);
  const startParts = getVietnamParts(startDate);
  if (
    startParts.year !== year ||
    startParts.month !== month ||
    startParts.day !== day ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    startDate <= new Date()
  ) {
    throw new Error('Ngày và giờ phải hợp lệ và nằm trong tương lai.');
  }
  const durationMinutes = getEstimatedServiceDurationMinutes(input.category, activeServices);
  if (durationMinutes <= 0) throw new Error('Dịch vụ chưa có thời lượng ước tính trên máy chủ. Vui lòng liên hệ quản trị viên.');
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  const fullAddress = input.address?.trim();
  if (!fullAddress) throw new Error('Vui lòng nhập địa chỉ thực hiện dịch vụ.');
  const parts = fullAddress.split(',').map((p) => p.trim());
  const city = parts[parts.length - 1];

  const phone = userPhone.replace(/\D/g, '');
  if (!userName.trim()) throw new Error('Vui lòng cập nhật họ tên tài khoản trước khi đặt dịch vụ.');
  if (!/^(0)(3|5|7|8|9)\d{8}$/.test(phone)) throw new Error('Vui lòng cập nhật số điện thoại hợp lệ trong tài khoản.');
  const budget = Number.isFinite(input.budget) && input.budget > 0 ? input.budget : undefined;

  return {
    service: serviceId,
    description: description.slice(0, 3000),
    preferredStartAt: vietnamWallClockToIso(input.date, input.time),
    preferredEndAt: toOffsetIso(endDate),
    ...(budget != null ? { budgetMin: Math.round(budget * 0.8), budgetMax: Math.round(budget * 1.2) } : {}),
    address: {
      recipientName: userName.trim(),
      phone,
      addressLine: fullAddress.slice(0, 500),
      city: city.slice(0, 100),
      country: 'Vietnam',
      ...(input.coordinates ? { location: {
        type: 'Point',
        coordinates: input.coordinates,
      } } : {}),
    },
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
}

export async function selectProvider(
  requestId: string,
  providerId: string,
  scheduledStartAt?: string
): Promise<{ booking: any; request: BackendServiceRequest }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để chọn thợ.');
  }
  const response = await apiRequest<{ booking: any; request: BackendServiceRequest }>(
    `/requests/${requestId}/select-provider`,
    {
      method: 'POST',
      body: JSON.stringify({ providerId, scheduledStartAt }),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!response.data) throw new Error(response.message || 'Lỗi khi chọn thợ');
  return response.data;
}
