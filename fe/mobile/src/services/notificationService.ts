import { apiRequest } from './apiClient';

export type NotificationType =

  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_STATUS_UPDATED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: 'REQUEST' | 'BOOKING';
  resourceId?: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function getMyNotifications(page = 1, limit = 20): Promise<NotificationPage> {
  const response = await apiRequest<AppNotification[]>(
    `/notifications?page=${page}&limit=${limit}`,
    { method: 'GET' },
  );
  const pagination = response.pagination as NotificationPage['pagination'] | undefined;

  return {
    notifications: response.data || [],
    pagination: pagination || {
      page,
      limit,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiRequest<{ unreadCount: number }>('/notifications/unread-count', {
    method: 'GET',
  });
  return response.data?.unreadCount ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<{ readAt?: string }> {
  const response = await apiRequest<{ id: string; readAt: string }>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH' },
  );
  return response.data || {};
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiRequest<{ modifiedCount: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
  return response.data?.modifiedCount ?? 0;
}
