import { create } from 'zustand';
import {
  Booking,
  BookingStatus,
  NewBookingInput,
  Complaint,
  CreateComplaintInput,
  ComplaintStatus,
} from '../types';
import {
  postCreateServiceRequest,
  buildServiceRequestPayload,
  getActiveServices,
  getMyServiceRequests,
  type BackendService,
} from '../services/serviceRequestService';
import {
  getBackendComplaints,
  postCreateComplaint,
  postReplyComplaint,
  patchResolveComplaint,
} from '../services/complaintService';
import { getMyCustomerBookings, getMyProviderBookings } from '../services/bookingService';
import { useAuthStore } from './useAuthStore';

interface AppStoreState {
  bookings: Booking[];
  jobRequests: Booking[];
  backendServices: BackendService[];
  complaints: Complaint[];

  // Actions
  fetchServices: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  submitBooking: (input: NewBookingInput) => Promise<Booking>;

  // Complaint Actions
  fetchComplaints: () => Promise<void>;
  createComplaint: (input: CreateComplaintInput) => Promise<Complaint>;
  replyComplaint: (complaintId: string, message: string, senderRole?: 'customer' | 'provider' | 'staff' | 'admin') => Promise<void>;
  resolveComplaint: (complaintId: string, resolutionNote: string, status?: ComplaintStatus) => Promise<void>;
}

function normalizeBookingStatus(value?: string): BookingStatus {
  switch (value?.toUpperCase()) {
    case 'PENDING_CONFIRMATION': return 'pending_confirmation';
    case 'CONFIRMED': return 'confirmed';
    case 'PROVIDER_ON_THE_WAY': return 'provider_on_the_way';
    case 'ARRIVED': return 'arrived';
    case 'IN_PROGRESS': return 'in_progress';
    case 'AWAITING_APPROVAL': return 'awaiting_approval';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    case 'NO_SHOW': return 'no_show';
    default: return 'unknown';
  }
}

function normalizeRequestStatus(value?: string): BookingStatus {
  if (value === 'CANCELLED' || value === 'EXPIRED') return 'cancelled';
  if (value === 'BOOKED') return 'pending_confirmation';
  if (value === 'OPEN') return 'pending';
  return 'unknown';
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  bookings: [],
  jobRequests: [],
  backendServices: [],
  complaints: [],

  fetchServices: async () => {
    const list = await getActiveServices();
    set({ backendServices: list });
  },

  fetchBookings: async () => {
      const currentRole = useAuthStore.getState().role;
      if (currentRole === 'provider') {
        const providerBookings = await getMyProviderBookings();
        const mapped: Booking[] = providerBookings.map((b: any) => ({
          id: b._id || b.id,
          category: (b.service?.category?.name || 'Cleaning') as any,
          title: b.service?.name || b.request?.description || 'Yêu cầu dịch vụ',
          description: b.request?.description || b.notes || '',
          status: normalizeBookingStatus(b.status),
          date: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleDateString('vi-VN') : '',
          time: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          address: b.address?.addressLine || b.request?.address?.addressLine || '',
          budget: b.finalPrice ?? b.basePrice ?? b.price ?? 0,
          ...(b.finalPrice != null ? { finalPrice: b.finalPrice } : {}),
          photos: b.progressPhotos?.length || b.proofPhotos?.length || 0,
          attachments: b.request?.attachments || [],
          progressPhotos: b.progressPhotos || [],
          proofPhotos: b.proofPhotos || [],
          createdAt: b.createdAt || '',
          customerName: b.customer?.fullName || 'Khách hàng',
          distanceKm: typeof b.distanceKm === 'number' ? b.distanceKm : null,
        }));
        set({ bookings: mapped, jobRequests: mapped.filter((b) => b.status === 'pending') });
      } else {
        const customerBookings = await getMyCustomerBookings();
        const customerRequests = await getMyServiceRequests();

        const fromBookings: Booking[] = customerBookings.map((b: any) => ({
          id: b._id || b.id,
          category: (b.service?.category?.name || 'Cleaning') as any,
          title: b.service?.name || 'Dịch vụ tại nhà',
          description: b.request?.description || b.notes || '',
          status: normalizeBookingStatus(b.status),
          date: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleDateString('vi-VN') : '',
          time: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          address: b.address?.addressLine || b.request?.address?.addressLine || '',
          budget: b.finalPrice ?? b.basePrice ?? b.price ?? 0,
          ...(b.finalPrice != null ? { finalPrice: b.finalPrice } : {}),
          photos: b.progressPhotos?.length || b.proofPhotos?.length || 0,
          createdAt: b.createdAt || '',
          progressPhotos: b.progressPhotos || [],
          proofPhotos: b.proofPhotos || [],
          customerName: 'Bạn',
          distanceKm: typeof b.distanceKm === 'number' ? b.distanceKm : null,
          paymentStatus: b.paymentStatus,
          customerReview: b.customerReview ?? null,
        }));

        const fromRequests: Booking[] = customerRequests
          .filter((r: any) => !customerBookings.some((b: any) => (b.request?._id || b.request) === (r._id || r.id)))
          .map((r: any) => ({
            id: r._id || r.id,
            category: (typeof r.service === 'object' && r.service?.category?.name ? r.service.category.name : 'Cleaning') as any,
            title: typeof r.service === 'object' && r.service?.name ? r.service.name : r.description || 'Yêu cầu dịch vụ',
            description: r.description || '',
            status: normalizeRequestStatus(r.status),
            date: r.preferredStartAt ? new Date(r.preferredStartAt).toLocaleDateString('vi-VN') : '',
            time: r.preferredStartAt ? new Date(r.preferredStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
            address: r.address?.addressLine || '',
            budget: r.budgetMax || r.budgetMin || 0,
            photos: r.attachments?.length || 0,
            createdAt: r.createdAt || '',
            customerName: 'Bạn',
            distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : null,
          }));

        set({ bookings: [...fromBookings, ...fromRequests] });
      }
  },

  submitBooking: async (input) => {
    const currentUser = useAuthStore.getState().currentUser;
    const backendServices = get().backendServices.length
      ? get().backendServices
      : await getActiveServices();
    set({ backendServices });
    const payload = buildServiceRequestPayload(
      input,
      currentUser?.name || '',
      currentUser?.phone || '',
      backendServices
    );
    const res = await postCreateServiceRequest(payload);
    if (!res || !res.id) {
      throw new Error('Không thể tạo yêu cầu dịch vụ trên máy chủ. Vui lòng thử lại.');
    }

    const newBooking: Booking = {
      id: res.id,
      ...input,
      title: typeof res.service === 'object' && res.service?.name ? res.service.name : input.title,
      description: res.description || input.description,
      date: new Date(`${input.date}T12:00:00`).toLocaleDateString('vi-VN'),
      status: normalizeRequestStatus(res.status),
      createdAt: res.createdAt || '',
      customerName: currentUser?.name || '',
      distanceKm: null,
    };
    set((state) => ({
      bookings: [newBooking, ...state.bookings],
    }));
    return newBooking;
  },

  fetchComplaints: async () => {
    try {
      const data = await getBackendComplaints();
      set({ complaints: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.warn('fetchComplaints error:', err);
      throw err;
    }
  },

  createComplaint: async (input: CreateComplaintInput) => {
    const newComplaint = await postCreateComplaint(input);
    set((state) => ({
      complaints: [newComplaint, ...state.complaints],
    }));
    return newComplaint;
  },

  replyComplaint: async (complaintId: string, message: string, senderRole = 'customer') => {
    await postReplyComplaint(complaintId, message, senderRole);
    set({ complaints: await getBackendComplaints() });
  },

  resolveComplaint: async (complaintId: string, resolutionNote: string, status = 'RESOLVED') => {
    await patchResolveComplaint(complaintId, resolutionNote, status);
    set({ complaints: await getBackendComplaints() });
  },
}));
