'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, LoaderCircle } from 'lucide-react'
import { useApp } from '../app-store'
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/api/notifications'

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function NotificationCenter({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const {
    role,
    focusBooking,
    focusRequest,
    focusVerification,
    setProviderTab,
    setStaffTab,
    setAdminTab,
  } = useApp()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async (includeList = open) => {
    if (!enabled) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      setError('')
      const [count, page] = await Promise.all([
        getUnreadNotificationCount(),
        includeList ? getMyNotifications() : Promise.resolve(null),
      ])
      setUnreadCount(count)
      if (page) setNotifications(page.notifications)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải thông báo.')
    }
  }, [enabled, open])

  useEffect(() => {
    if (!enabled) return
    void refresh(false)
    const timer = window.setInterval(() => void refresh(false), 60_000)
    return () => window.clearInterval(timer)
  }, [enabled, refresh])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void refresh(true).finally(() => setLoading(false))
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleMarkRead = async (item: AppNotification) => {
    if (item.readAt) return
    try {
      const result = await markNotificationRead(item.id)
      const readAt = result?.readAt ?? new Date().toISOString()
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, readAt } : notification,
        ),
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật thông báo.')
    }
  }

  const handleNotificationClick = async (item: AppNotification) => {
    await handleMarkRead(item)
    setOpen(false)

    if (item.resourceType === 'BOOKING' && item.resourceId) {
      if (role === 'provider') {
        router.push(`/provider/bookings/${encodeURIComponent(item.resourceId)}`)
      } else if (role === 'customer') {
        focusBooking(item.resourceId)
      } else if (role === 'staff') {
        setStaffTab('schedule')
      } else {
        setAdminTab('dashboard')
      }
      return
    }

    if (item.resourceType === 'REQUEST' && item.resourceId) {
      if (role === 'customer') {
        focusRequest(item.resourceId)
      } else if (role === 'provider') {
        setProviderTab('jobs')
      } else if (role === 'staff') {
        focusVerification(item.resourceId)
      }
      return
    }

    if (role === 'staff' && item.type === 'BOOKING_STATUS_UPDATED') {
      setStaffTab('verifications')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      const readAt = new Date().toISOString()
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })),
      )
      setUnreadCount(0)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật thông báo.')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Danh sách thông báo"
          className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-bold">Thông báo</h2>
              <p className="text-xs text-muted-foreground">{unreadCount} chưa đọc</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </button>
          </div>

          {error && <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Đang tải thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Bạn chưa có thông báo nào.
            </p>
          ) : (
            <ul className="max-h-[min(70vh,28rem)] overflow-y-auto">
              {notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void handleNotificationClick(item)}
                    className={`flex w-full gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-muted/70 ${
                      item.readAt ? '' : 'bg-secondary/40'
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.readAt ? 'bg-transparent' : 'bg-brand'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.message}</span>
                      <time className="mt-1 block text-xs text-muted-foreground">
                        {formatNotificationTime(item.createdAt)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
