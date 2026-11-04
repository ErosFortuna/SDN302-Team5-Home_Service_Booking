import { create } from 'zustand';
import {
  Booking,
  BookingStatus,
  ChatMessage,
  NewBookingInput,
  Role,
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
  role: Role;
  setRole: (role: Role) => void;
  toggleRole: () => void;

  bookings: Booking[];
  jobRequests: Booking[];
  chatMessages: ChatMessage[];
  backendServices: BackendService[];
  complaints: Complaint[];

  // Actions
  fetchServices: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  submitBooking: (input: NewBookingInput) => Promise<Booking>;
  updateJobStatus: (jobId: string, status: BookingStatus, note?: string, photosCount?: number, finalPrice?: number) => void;
  sendMessage: (text: string) => void;

  // Complaint Actions
  fetchComplaints: () => Promise<void>;
  createComplaint: (input: CreateComplaintInput) => Promise<Complaint>;
  replyComplaint: (complaintId: string, message: string, senderRole?: 'customer' | 'provider' | 'staff' | 'admin') => Promise<void>;
  resolveComplaint: (complaintId: string, resolutionNote: string, status?: ComplaintStatus) => Promise<void>;
}

let idCounter = 200;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

export const useAppStore = create<AppStoreState>((set, get) => ({
  role: 'customer',
  setRole: (role) => set({ role }),
  toggleRole: () => set((state) => ({ role: state.role === 'customer' ? 'provider' : 'customer' })),

  bookings: [],
  jobRequests: [],
  chatMessages: [],
  backendServices: [],
  complaints: [],

  fetchServices: async () => {
    try {
      const list = await getActiveServices();
      if (list && list.length > 0) {
        set({ backendServices: list });
      }
    } catch (err) {
      console.warn('fetchServices error:', err);
    }
  },

  fetchBookings: async () => {
    try {
      const currentRole = get().role;
      if (currentRole === 'provider') {
        const providerBookings = await getMyProviderBookings();
        const mapped: Booking[] = providerBookings.map((b: any) => ({
          id: b._id || b.id,
          category: (b.service?.category?.name || 'Cleaning') as any,
          title: b.service?.name || b.request?.description || 'Yêu cầu dịch vụ',
          description: b.request?.description || b.notes || '',
          status: (b.status?.toLowerCase() || 'pending') as BookingStatus,
          date: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleDateString('vi-VN') : '',
          time: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          address: b.address?.addressLine || b.request?.address?.addressLine || 'TP.HCM',
          budget: b.finalPrice ?? b.basePrice ?? b.price ?? 0,
          ...(b.finalPrice != null ? { finalPrice: b.finalPrice } : {}),
          photos: b.request?.attachments?.length || 0,
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
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
          status: (b.status?.toLowerCase() || 'pending') as BookingStatus,
          date: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleDateString('vi-VN') : '',
          time: b.scheduledStartAt ? new Date(b.scheduledStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          address: b.address?.addressLine || b.request?.address?.addressLine || 'TP.HCM',
          budget: b.finalPrice ?? b.basePrice ?? b.price ?? 0,
          ...(b.finalPrice != null ? { finalPrice: b.finalPrice } : {}),
          photos: b.request?.attachments?.length || 0,
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
          customerName: 'Bạn',
          distanceKm: typeof b.distanceKm === 'number' ? b.distanceKm : null,
          customerReview: b.customerReview ?? null,
        }));

        const fromRequests: Booking[] = customerRequests
          .filter((r: any) => !customerBookings.some((b: any) => (b.request?._id || b.request) === (r._id || r.id)))
          .map((r: any) => ({
            id: r._id || r.id,
            category: (typeof r.service === 'object' && r.service?.category?.name ? r.service.category.name : 'Cleaning') as any,
            title: typeof r.service === 'object' && r.service?.name ? r.service.name : r.description || 'Yêu cầu dịch vụ',
            description: r.description || '',
            status: 'pending' as BookingStatus,
            date: r.preferredStartAt ? new Date(r.preferredStartAt).toLocaleDateString('vi-VN') : '',
            time: r.preferredStartAt ? new Date(r.preferredStartAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
            address: r.address?.addressLine || 'TP.HCM',
            budget: r.budgetMax || r.budgetMin || 0,
            photos: r.attachments?.length || 0,
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
            customerName: 'Bạn',
            distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : null,
          }));

        set({ bookings: [...fromBookings, ...fromRequests] });
      }
    } catch (err) {
      console.warn('fetchBookings error:', err);
    }
  },

  submitBooking: async (input) => {
    const currentUser = useAuthStore.getState().currentUser;
    const payload = buildServiceRequestPayload(
      input,
      currentUser?.name || 'Khách hàng',
      currentUser?.phone || '0912345678',
      get().backendServices
    );
    const res = await postCreateServiceRequest(payload);
    if (!res || !res.id) {
      throw new Error('Không thể tạo yêu cầu dịch vụ trên máy chủ. Vui lòng thử lại.');
    }

    const newBooking: Booking = {
      id: res.id,
      ...input,
      date: new Date(`${input.date}T12:00:00`).toLocaleDateString('vi-VN'),
      status: 'pending',
      createdAt: 'Vừa xong',
      customerName: 'Bạn',
      distanceKm: null,
    };
    set((state) => ({
      bookings: [newBooking, ...state.bookings],
    }));
    return newBooking;
  },

  updateJobStatus: (jobId, status, note, photosCount, finalPrice) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === jobId
          ? {
              ...b,
              status,
              ...(note ? { completionNote: note } : {}),
              ...(typeof photosCount === 'number' ? { photos: photosCount } : {}),
              ...(typeof finalPrice === 'number' ? { finalPrice, budget: finalPrice } : {}),
            }
          : b
      ),
    }));
  },

  sendMessage: (text) => {
    const messageId = nextId('m');
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          id: messageId,
          from: 'me',
          text,
          time: 'Vừa xong',
        },
      ],
    }));
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
    const reply = await postReplyComplaint(complaintId, message, senderRole);
    set((state) => ({
      complaints: state.complaints.map((c) => {
        if (c.id === complaintId) {
          const updatedReplies = [...(c.replies || []), reply];
          return {
            ...c,
            status: senderRole === 'provider' && c.status === 'OPEN' ? 'UNDER_REVIEW' : c.status,
            replies: updatedReplies,
          };
        }
        return c;
      }),
    }));
  },

  resolveComplaint: async (complaintId: string, resolutionNote: string, status = 'RESOLVED') => {
    await patchResolveComplaint(complaintId, resolutionNote, status);
    set((state) => ({
      complaints: state.complaints.map((c) => {
        if (c.id === complaintId) {
          return {
            ...c,
            status,
            resolutionNote,
            resolvedBy: 'CSKH',
            resolvedAt: 'Vừa xong',
            replies: [
              ...(c.replies || []),
              {
                id: nextId('r'),
                senderId: 'staff',
                senderName: 'CSKH',
                senderRole: 'staff',
                message: `[Xử lý khiếu nại - ${status}] ${resolutionNote}`,
                createdAt: 'Vừa xong',
              },
            ],
          };
        }
        return c;
      }),
    }));
  },
}));
