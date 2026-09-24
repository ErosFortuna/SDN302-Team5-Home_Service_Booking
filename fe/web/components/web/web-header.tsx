'use client'

import {
  Sparkles,
  Sun,
  Moon,
  PlusCircle,
  Briefcase,
  User,
  MessageSquare,
  ClipboardList,
  Compass,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../app-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function WebHeader() {
  const {
    role,
    setRole,
    customerTab,
    setCustomerTab,
    providerTab,
    setProviderTab,
    theme,
    toggleTheme,
    openBookingFlow,
    bookings,
    jobRequests,
    quotedRequestIds,
  } = useApp()

  const activeBookingsCount = bookings.filter((b) =>
    ['pending', 'quoted', 'in_progress'].includes(b.status),
  ).length

  const newRequestsCount = jobRequests.filter(
    (r) => !quotedRequestIds.includes(r.id),
  ).length

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand logo & role indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (role === 'customer') setCustomerTab('home')
              else setProviderTab('dashboard')
            }}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-teal-400 text-brand-foreground shadow-md shadow-brand/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight">HomeHero</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                  Web
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Nền tảng đặt dịch vụ gia đình tiện lợi
              </p>
            </div>
          </button>
        </div>

        {/* Center navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {role === 'customer' ? (
            <>
              <button
                onClick={() => setCustomerTab('home')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  customerTab === 'home'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Khám phá</span>
              </button>
              <button
                onClick={() => setCustomerTab('bookings')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  customerTab === 'bookings'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Đơn của tôi</span>
                {activeBookingsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-[11px] font-extrabold text-cta-foreground">
                    {activeBookingsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCustomerTab('chat')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  customerTab === 'chat'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Tin nhắn</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setProviderTab('dashboard')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  providerTab === 'dashboard'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Tổng quan</span>
              </button>
              <button
                onClick={() => setProviderTab('jobs')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  providerTab === 'jobs'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <Briefcase className="h-4 w-4" />
                <span>Sàn việc mới</span>
                {newRequestsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-[11px] font-extrabold text-cta-foreground">
                    {newRequestsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setProviderTab('chat')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  providerTab === 'chat'
                    ? 'bg-secondary text-brand font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Khách hàng</span>
              </button>
            </>
          )}
        </nav>

        {/* Right side controls: Role switch, Book button, theme toggle, avatar */}
        <div className="flex items-center gap-2.5">
          {/* Role switcher pill */}
          <div className="hidden lg:flex items-center rounded-2xl border border-border/80 bg-muted/60 p-1">
            <button
              onClick={() => setRole('customer')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                role === 'customer'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User className="h-3.5 w-3.5" />
              Khách hàng
            </button>
            <button
              onClick={() => setRole('provider')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                role === 'provider'
                  ? 'bg-card text-brand shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Chế độ Thợ
            </button>
          </div>

          {/* Quick Book Button (Customer mode) or Switch to Pro (mobile) */}
          {role === 'customer' ? (
            <Button
              onClick={() => openBookingFlow()}
              className="rounded-xl bg-cta font-bold text-cta-foreground shadow-sm hover:brightness-105 active:scale-95"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Đặt thợ ngay
            </Button>
          ) : (
            <button
              onClick={() => setRole('customer')}
              className="lg:hidden rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground"
            >
              Về Khách hàng
            </button>
          )}

          {/* Dark / Light toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* User profile avatar badge */}
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground text-xs ring-2 ring-border">
              {role === 'customer' ? 'AT' : 'JD'}
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight">
              <p className="font-bold flex items-center gap-1">
                {role === 'customer' ? 'Alex Tran' : 'Jayden Pro'}
                <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              </p>
              <p className="text-[10px] text-muted-foreground">
                {role === 'customer' ? 'Khách hàng cá nhân' : 'Đối tác sửa chữa'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
