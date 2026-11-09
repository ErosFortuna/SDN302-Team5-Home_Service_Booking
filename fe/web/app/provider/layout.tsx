import type { Metadata } from 'next'
import { ToastProvider } from '@/components/provider-booking/toast'

export const metadata: Metadata = {
  title: 'Home Service Booking',
  description: 'Quản lý và cập nhật tiến độ công việc dành cho thợ.',
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </ToastProvider>
  )
}
