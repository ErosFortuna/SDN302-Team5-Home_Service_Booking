import { create } from 'zustand';
import { Booking, BookingStatus, ChatMessage, NewBookingInput, ProviderQuoteInput, Role } from '../types';
import { INITIAL_BOOKINGS, INITIAL_CHAT, JOB_REQUESTS } from '../constants/mockData';

interface AppStoreState {
  role: Role;
  setRole: (role: Role) => void;
  toggleRole: () => void;

  bookings: Booking[];
  jobRequests: Booking[];
  quotedRequestIds: string[];
  chatMessages: ChatMessage[];

  // Actions
  submitBooking: (input: NewBookingInput) => Booking;
  acceptQuote: (bookingId: string, quoteId: string) => void;
  declineQuote: (bookingId: string, quoteId: string) => void;
  submitProviderQuote: (requestId: string, input: ProviderQuoteInput) => void;
  updateJobStatus: (jobId: string, status: BookingStatus) => void;
  sendMessage: (text: string) => void;
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

  submitBooking: (input) => {
    const newBooking: Booking = {
      id: nextId('b'),
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
}));
