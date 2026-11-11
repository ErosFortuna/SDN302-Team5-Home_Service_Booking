import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HomeHero — Dịch vụ tại nhà',
  description:
    'Đặt dịch vụ tại nhà đáng tin cậy: điện nước, điện lạnh, dọn dẹp và sửa chữa.',
  icons: {
    icon: '/Logo%20Home%20Service%20Booking%20(1).png',
    apple: '/Logo%20Home%20Service%20Booking%20(1).png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
