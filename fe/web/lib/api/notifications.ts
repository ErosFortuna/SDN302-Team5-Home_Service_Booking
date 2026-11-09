import { apiRequest } from './client'

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_PAYMENT_CONFIRMED'
  | 'BOOKING_STATUS_UPDATED'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  resourceType?: 'REQUEST' | 'BOOKING'
  resourceId?: string
  readAt: string | null
  createdAt: string
}

interface NotificationPage {
  success: boolean
  data: AppNotification[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface UnreadCount {
  unreadCount: number
}

interface ReadResult {
  id?: string
  readAt?: string
  modifiedCount?: number
}

export async function getMyNotifications(page = 1, limit = 10) {
  const response = await apiRequest<AppNotification[]>(
    `/notifications?page=${page}&limit=${limit}`,
  )

  return {
    notifications: response.data ?? [],
    pagination: response.pagination as NotificationPage['pagination'] | undefined,
  }
}

export async function getUnreadNotificationCount() {
  const response = await apiRequest<UnreadCount>('/notifications/unread-count')
  return response.data?.unreadCount ?? 0
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiRequest<ReadResult>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH' },
  )
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await apiRequest<ReadResult>('/notifications/read-all', {
    method: 'PATCH',
  })
  return response.data?.modifiedCount ?? 0
}
