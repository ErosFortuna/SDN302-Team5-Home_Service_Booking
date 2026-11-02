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
import { INITIAL_BOOKINGS, INITIAL_CHAT, JOB_REQUESTS } from '../constants/mockData';
import {
  postCreateServiceRequest,
  buildServiceRequestPayload,
  getActiveServices,
  type BackendService,
} from '../services/serviceRequestService';
import {
  INITIAL_MOBILE_COMPLAINTS,
  getBackendComplaints,
  postCreateComplaint,
  postReplyComplaint,
  patchResolveComplaint,
} from '../services/complaintService';

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
  submitBooking: (input: NewBookingInput) => Promise<Booking>;
  updateJobStatus: (jobId: string, status: BookingStatus) => void;
  sendMessage: (text: string) => void;

  // Complaint Actions (KAN-13, KAN-19, KAN-26)
  fetchComplaints: () => Promise<void>;
  createComplaint: (input: CreateComplaintInput) => Promise<Complaint>;
  replyComplaint: (complaintId: string, message: string, senderRole?: 'customer' | 'provider' | 'staff' | 'admin') => Promise<void>;
  resolveComplaint: (complaintId: string, resolutionNote: string, refundAmount?: number, status?: ComplaintStatus) => Promise<void>;
}

let idCounter = 200;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

export const useAppStore = create<AppStoreState>((set, get) => ({
  role: 'customer',
  setRole: (role) => set({ role }),
  toggleRole: () => set((state) => ({ role: state.role === 'customer' ? 'provider' : 'customer' })),

  bookings: INITIAL_BOOKINGS,
  jobRequests: JOB_REQUESTS,
  chatMessages: INITIAL_CHAT,
  backendServices: [],

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

  submitBooking: async (input) => {
    const payload = buildServiceRequestPayload(
      input,
      'Alex Tran',
      '0912345678',
      get().backendServices
    );
    const res = await postCreateServiceRequest(payload);
    if (!res || !res.id) {
      throw new Error('Không thể tạo yêu cầu dịch vụ trên máy chủ. Vui lòng thử lại.');
    }

    const newBooking: Booking = {
      id: res.id,
      ...input,
      status: 'pending',
      createdAt: 'Vừa xong',
      customerName: 'Bạn',
      distanceKm: 2.0,
    };
    set((state) => ({
      bookings: [newBooking, ...state.bookings],
    }));
    return newBooking;
  },

  updateJobStatus: (jobId, status) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === jobId ? { ...b, status } : b
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

    // Auto-reply simulation
    setTimeout(() => {
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          {
            id: nextId('m'),
            from: 'them',
            text: 'Cảm ơn bạn đã phản hồi! Mình sẽ chuẩn bị đồ nghề và có mặt đúng hẹn nhé.',
            time: 'Vừa xong',
          },
        ],
      }));
    }, 1200);
  },

  complaints: process.env.EXPO_PUBLIC_USE_MOCK === 'true' ? INITIAL_MOBILE_COMPLAINTS : [],

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

  resolveComplaint: async (complaintId: string, resolutionNote: string, refundAmount = 0, status = 'RESOLVED') => {
    await patchResolveComplaint(complaintId, resolutionNote, refundAmount, status);
    set((state) => ({
      complaints: state.complaints.map((c) => {
        if (c.id === complaintId) {
          return {
            ...c,
            status,
            resolutionNote,
            refundAmount,
            resolvedBy: 'CSKH',
            resolvedAt: 'Vừa xong',
            replies: [
              ...(c.replies || []),
              {
                id: nextId('r'),
                senderId: 'staff',
                senderName: 'CSKH',
                senderRole: 'staff',
                message: `[Xử lý khiếu nại - ${status}] ${resolutionNote}${refundAmount > 0 ? ` (Bồi thường: ${refundAmount.toLocaleString()} VNĐ)` : ''}`,
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
