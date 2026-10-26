import { create } from 'zustand';
import {
  Booking,
  BookingStatus,
  ChatMessage,
  NewBookingInput,
  ProviderQuoteInput,
  Role,
  Complaint,
  CreateComplaintInput,
  ComplaintStatus,
} from '../types';
import { INITIAL_BOOKINGS, INITIAL_CHAT, JOB_REQUESTS } from '../constants/mockData';
<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
import {
  postCreateServiceRequest,
  buildServiceRequestPayload,
  getActiveServices,
  type BackendService,
} from '../services/serviceRequestService';
<<<<<<< Updated upstream
=======
import {
  INITIAL_MOBILE_COMPLAINTS,
  getBackendComplaints,
  postCreateComplaint,
  postReplyComplaint,
  patchResolveComplaint,
} from '../services/complaintService';
>>>>>>> Stashed changes
>>>>>>> Stashed changes

interface AppStoreState {
  role: Role;
  setRole: (role: Role) => void;
  toggleRole: () => void;

  bookings: Booking[];
  jobRequests: Booking[];
  quotedRequestIds: string[];
  chatMessages: ChatMessage[];
<<<<<<< Updated upstream
  backendServices: BackendService[];
=======
<<<<<<< Updated upstream
=======
  backendServices: BackendService[];
  complaints: Complaint[];
>>>>>>> Stashed changes
>>>>>>> Stashed changes

  // Actions
  fetchServices: () => Promise<void>;
  submitBooking: (input: NewBookingInput) => Promise<Booking>;
  acceptQuote: (bookingId: string, quoteId: string) => void;
  declineQuote: (bookingId: string, quoteId: string) => void;
  submitProviderQuote: (requestId: string, input: ProviderQuoteInput) => void;
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
  quotedRequestIds: [],
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
    let createdId = nextId('b');
    try {
      const payload = buildServiceRequestPayload(
        input,
        'Alex Tran',
        '0912345678',
        get().backendServices
      );
      const res = await postCreateServiceRequest(payload);
      if (res && res.id) {
        createdId = res.id;
      }
    } catch (err) {
      console.warn('API submission failed, persisting locally:', err);
    }

    const newBooking: Booking = {
      id: createdId,
      ...input,
      status: 'pending',
      createdAt: 'Vừa xong',
      customerName: 'Bạn',
      distanceKm: 2.0,
      quotes: [],
    };
    set((state) => ({
      bookings: [newBooking, ...state.bookings],
    }));
    return newBooking;
  },

  acceptQuote: (bookingId, quoteId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'in_progress', acceptedQuoteId: quoteId }
          : b
      ),
    }));
  },

  declineQuote: (bookingId, quoteId) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, quotes: b.quotes.filter((q) => q.id !== quoteId) }
          : b
      ),
    }));
  },

  submitProviderQuote: (requestId, input) => {
    set((state) => ({
      quotedRequestIds: state.quotedRequestIds.includes(requestId)
        ? state.quotedRequestIds
        : [...state.quotedRequestIds, requestId],
      chatMessages: [
        ...state.chatMessages,
        {
          id: nextId('m'),
          from: 'me',
          time: 'Vừa xong',
          quote: input,
        },
      ],
    }));
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

  complaints: INITIAL_MOBILE_COMPLAINTS,

  fetchComplaints: async () => {
    try {
      const data = await getBackendComplaints();
      if (data && data.length > 0) {
        set({ complaints: data });
      }
    } catch (err) {
      console.warn('fetchComplaints error:', err);
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
