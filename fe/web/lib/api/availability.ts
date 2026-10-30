import { apiRequest } from './client'
import type { ApiEnvelope } from './bookings'

export interface BreakItem {
  _id?: string
  id?: string
  startTime: string
  endTime: string
  note?: string
}

export interface DaySchedule {
  dayOfWeek: number // 0 = CN, 1 = T2, ..., 6 = T7
  dayName: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
  isOff: boolean
  startTime: string
  endTime: string
  breaks: BreakItem[]
}

export interface ExceptionItem {
  _id?: string
  id?: string
  date: string // YYYY-MM-DD
  isFullDayOff: boolean
  customStartTime?: string
  customEndTime?: string
  reason?: string
  createdAt?: string
}

export interface AvailabilitySettings {
  slotDurationMinutes: number
  travelBufferMinutes: number
  isAcceptingBookings: boolean
}

export interface AvailabilityData {
  _id: string
  provider: string
  weeklySchedule: DaySchedule[]
  daysOff: ExceptionItem[]
  settings: AvailabilitySettings
  createdAt?: string
  updatedAt?: string
}

export interface CalculatedSlot {
  startTime: string
  endTime: string
  durationMinutes: number
  isAvailable: boolean
  reason: string
}

export interface SlotCalculationResult {
  providerId: string
  date: string
  dayOfWeek: number
  dayName: string
  isAcceptingBookings: boolean
  isAvailable: boolean
  reason?: string
  workingHours?: {
    startTime: string
    endTime: string
  }
  breaks?: BreakItem[]
  settings?: AvailabilitySettings
  bookingsCount?: number
  bookedSlots?: Array<{
    bookingId: string
    startTime: string
    endTime: string
    status: string
    bufferedEndTime: string
  }>
  availableSlots: CalculatedSlot[]
  allSlots: CalculatedSlot[]
}

/** UC-34 — Availability API Service */
export const availabilityApi = {
  /** Lấy cấu hình lịch của Provider đang đăng nhập */
  getMine: (signal?: AbortSignal) =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine', { signal }),

  /** Cập nhật toàn diện Availability */
  updateMine: (payload: {
    weeklySchedule?: DaySchedule[]
    settings?: Partial<AvailabilitySettings>
    daysOff?: ExceptionItem[]
  }) =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine', {
      method: 'PUT',
      body: payload,
    }),

  /** Cập nhật riêng lịch tuần */
  updateWeeklySchedule: (weeklySchedule: DaySchedule[]) =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine/weekly-schedule', {
      method: 'PUT',
      body: { weeklySchedule },
    }),

  /** Cập nhật riêng cài đặt */
  updateSettings: (settings: Partial<AvailabilitySettings>) =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine/settings', {
      method: 'PATCH',
      body: settings,
    }),

  /** Bật/tắt nhanh nhận việc */
  toggleAccepting: () =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine/toggle-accepting', {
      method: 'PATCH',
    }),

  /** Thêm ngày nghỉ ngoại lệ */
  addException: (payload: {
    date: string
    isFullDayOff: boolean
    customStartTime?: string
    customEndTime?: string
    reason?: string
  }) =>
    apiRequest<ApiEnvelope<AvailabilityData>>('/availability/mine/exceptions', {
      method: 'POST',
      body: payload,
    }),

  /** Xóa ngày nghỉ ngoại lệ */
  removeException: (identifier: string) =>
    apiRequest<ApiEnvelope<AvailabilityData>>(`/availability/mine/exceptions/${identifier}`, {
      method: 'DELETE',
    }),

  /** Tính toán slot trống xem trước cho Provider */
  getMySlots: (date: string, duration?: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({ date })
    if (duration) params.set('duration', String(duration))
    return apiRequest<ApiEnvelope<SlotCalculationResult>>(`/availability/mine/slots?${params}`, {
      signal,
    })
  },

  /** Tính toán slot trống cho Khách hàng */
  getProviderSlots: (providerId: string, date: string, duration?: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({ date })
    if (duration) params.set('duration', String(duration))
    return apiRequest<ApiEnvelope<SlotCalculationResult>>(
      `/availability/providers/${providerId}/slots?${params}`,
      { signal }
    )
  },
}

