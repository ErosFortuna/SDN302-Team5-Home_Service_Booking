'use client'

import {
  Sparkles,
  Sun,
  Moon,
  PlusCircle,
  Briefcase,
  User,
  ClipboardList,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Crown,
  AlertTriangle,
  UserCheck,
  CalendarDays,
  FileBarChart,
  Users,
  FileText,
  Layers,
  Star,
  LogIn,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '../app-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function WebHeader() {
  const {
    role,
    setRole,
    currentUser,
    isLoggedIn,
    logout,
    openAuthModal,
    customerTab,
    setCustomerTab,
    providerTab,
    setProviderTab,
    staffTab,
    setStaffTab,
    adminTab,
    setAdminTab,
    theme,
    toggleTheme,
    openBookingFlow,
    bookings,
    jobRequests,
    quotedRequestIds,
    complaints,
    verifications,
  } = useApp()

  const activeBookingsCount = bookings.filter((b) =>
    ['pending', 'quoted', 'in_progress'].includes(b.status),
  ).length

  const newRequestsCount = jobRequests.filter(
    (r) => !quotedRequestIds.includes(r.id),
  ).length

  const openComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length
  const pendingVrfCount = verifications.filter((v) => v.status === 'pending').length

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' }
      case 'staff':
        return { label: 'Staff CSKH', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' }
      case 'provider':
        return { label: 'Thợ', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' }
      default:
        return { label: 'Khách', color: 'bg-teal-500/15 text-teal-600 border-teal-500/30' }
    }
  }

  const roleBadge = getRoleBadge()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand logo & role indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (role === 'customer') setCustomerTab('home')
              else if (role === 'provider') setProviderTab('dashboard')
              else if (role === 'staff') setStaffTab('complaints')
              else setAdminTab('dashboard')
            }}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-teal-400 text-brand-foreground shadow-md shadow-brand/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight">HomeHero</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-extrabold border',
                    roleBadge.color,
                  )}
                >
                  {roleBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Nền tảng đặt dịch vụ gia đình tiện lợi
              </p>
            </div>
          </button>
        </div>

        {/* Center navigation links based on Role (No tin nhắn on tab bar!) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* CUSTOMER TABS */}
          {role === 'customer' && (
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
            </>
          )}

          {/* PROVIDER TABS */}
          {role === 'provider' && (
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
            </>
          )}

          {/* STAFF TABS */}
          {role === 'staff' && (
            <>
              <button
                onClick={() => setStaffTab('complaints')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  staffTab === 'complaints'
                    ? 'bg-blue-600/10 text-blue-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Khiếu nại</span>
                {openComplaintsCount > 0 && (
                  <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                    {openComplaintsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStaffTab('verifications')}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  staffTab === 'verifications'
                    ? 'bg-blue-600/10 text-blue-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <UserCheck className="h-4 w-4" />
                <span>Duyệt thợ</span>
                {pendingVrfCount > 0 && (
                  <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
                    {pendingVrfCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStaffTab('schedule')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all hidden md:flex',
                  staffTab === 'schedule'
                    ? 'bg-blue-600/10 text-blue-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Lịch hẹn</span>
              </button>
            </>
          )}

          {/* ADMIN TABS */}
          {role === 'admin' && (
            <>
              <button
                onClick={() => setAdminTab('dashboard')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  adminTab === 'dashboard'
                    ? 'bg-purple-600/10 text-purple-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard & AI</span>
              </button>
              <button
                onClick={() => setAdminTab('users')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                  adminTab === 'users'
                    ? 'bg-purple-600/10 text-purple-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <Users className="h-4 w-4" />
                <span>Người dùng</span>
              </button>
              <button
                onClick={() => setAdminTab('policies')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all hidden lg:flex',
                  adminTab === 'policies'
                    ? 'bg-purple-600/10 text-purple-600 font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <FileText className="h-4 w-4" />
                <span>Chính sách</span>
              </button>
            </>
          )}
        </nav>

        {/* Right side controls: Role switch, Auth button, Book button, theme toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Login / Role Switcher Modal Button */}
          {!isLoggedIn && (
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-brand transition-all shadow-xs"
              title="Đăng nhập hoặc đổi vai trò (Customer, Provider, Staff, Admin)"
            >
              <LogIn className="size-3.5 text-brand" />
              <span className="hidden sm:inline">Đăng nhập / Vai trò</span>
            </button>
          )}

          {/* Quick Book Button (Customer mode) */}
          {role === 'customer' && (
            <Button
              onClick={() => openBookingFlow()}
              className="rounded-xl bg-cta font-bold text-cta-foreground shadow-sm hover:brightness-105 active:scale-95 hidden sm:flex"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Đặt thợ ngay
            </Button>
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
          {isLoggedIn && currentUser ? (
            <div className="flex items-center gap-2 pl-1">
              <div
                onClick={() => openAuthModal('login')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-bold text-brand text-xs ring-2 ring-border cursor-pointer hover:ring-brand transition-all"
                title={`${currentUser.name} (${role})`}
              >
                {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <p className="font-bold flex items-center gap-1 text-foreground truncate max-w-[130px]">
                  {currentUser.name}
                  <ShieldCheck className="h-3.5 w-3.5 text-brand shrink-0" />
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {role === 'customer'
                    ? 'Khách hàng'
                    : role === 'provider'
                    ? 'Thợ đối tác'
                    : role === 'staff'
                    ? 'Nhân viên CSKH'
                    : 'Quản trị viên'}
                </p>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground shadow-xs hover:brightness-110"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
