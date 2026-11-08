import { apiRequest } from './apiClient';
import { BackendBooking, DeclineBookingPayload } from '../types';

/**
 * Provider confirms a pending booking request (UC-14).
 * Transitions status from PENDING_CONFIRMATION -> CONFIRMED.
 *
 * @param bookingId - MongoDB ObjectId of the booking
 */
export async function confirmBooking(bookingId: string): Promise<BackendBooking> {
  const res = await apiRequest<BackendBooking>(`/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  return res.data!;
}

/**
 * Provider declines a pending booking request (UC-14).
 * Transitions status from PENDING_CONFIRMATION -> CANCELLED with reasonCode and optional note.
 *
 * @param bookingId - MongoDB ObjectId of the booking
 * @param payload - { reasonCode, note? }
 */
export async function declineBooking(
  bookingId: string,
  payload: DeclineBookingPayload
): Promise<BackendBooking> {
  const res = await apiRequest<BackendBooking>(`/bookings/${bookingId}/decline`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data!;
}

/**
 * Fetch provider's own bookings, optionally filtered by status (e.g. PENDING_CONFIRMATION).
 */
export async function getMyProviderBookings(params?: { status?: string }): Promise<BackendBooking[]> {
  const query = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
  const res = await apiRequest<BackendBooking[]>(`/bookings/provider/me${query}`, {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * Fetch customer's own bookings from backend API.
 */
export async function getMyCustomerBookings(params?: { status?: string }): Promise<BackendBooking[]> {
  const query = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
  const res = await apiRequest<BackendBooking[]>(`/bookings/customer/me${query}`, {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * Fetch a single booking by its ID.
 */
export async function getBookingById(bookingId: string): Promise<BackendBooking> {
  const res = await apiRequest<BackendBooking>(`/bookings/${bookingId}`, {
    method: 'GET',
  });
  return res.data!;
}

export async function submitBookingReview(
  bookingId: string,
  payload: { rating: number; comment?: string },
): Promise<void> {
  await apiRequest(`/bookings/${bookingId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Provider updates booking service status (UC-38).
 * Transitions: CONFIRMED -> PROVIDER_ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED
 */
export async function updateBookingStatus(
  bookingId: string,
  payload: {
    status: string;
    note?: string;
    confirmCompletion?: boolean;
    finalPrice?: number;
  }
): Promise<BackendBooking> {
  const res = await apiRequest<BackendBooking>(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data!;
}

export async function confirmCustomerPayment(
  bookingId: string,
  note?: string
): Promise<BackendBooking> {
  const res = await apiRequest<BackendBooking>(`/bookings/${bookingId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return res.data!;
}

export const bookingService = {
  confirmBooking,
  declineBooking,
  updateBookingStatus,
  confirmCustomerPayment,
  getMyProviderBookings,
  getMyCustomerBookings,
  getBookingById,
  submitBookingReview,
};
