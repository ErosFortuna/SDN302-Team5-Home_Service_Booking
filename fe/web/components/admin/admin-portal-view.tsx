'use client'

import {
  Crown,
  Users,
  Layers,
  Star,
  BarChart3,
  Wrench,
} from 'lucide-react'
import { useApp } from '../app-store'
import { ToastProvider } from '@/components/provider-booking/toast'
import { UserManagementPage } from '@/components/admin-users/user-management-page'
import { CategoryManagementPage } from '@/components/admin-categories/category-management-page'
import { ServiceManagementPage } from '@/components/admin-services/service-management-page'
import { DashboardView } from '@/components/admin-reports/dashboard-view'
import { useDashboard } from '@/hooks/use-dashboard'
import { formatVND, cn } from '@/lib/utils'

export function AdminPortalView() {
  const {
    adminTab,
    setAdminTab,
    usersList,
  } = useApp()

  const { data: dashboardData } = useDashboard()
  const grossRevenue = dashboardData?.kpi?.grossRevenue ?? 0
  const totalUsersCount = dashboardData?.kpi?.totalUsers ?? usersList.length
  const avgRating = dashboardData?.operationalQuality?.systemAvgRating ?? 5.0
  const totalReviews = dashboardData?.operationalQuality?.totalReviews ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Admin Control Center · Quản Trị Hệ Thống
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white/90">
                <Crown className="size-4" /> Toàn quyền hệ thống
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">
              Bảng Điều Hành Trung Tâm & Báo Cáo
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              Quản trị người dùng, danh mục dịch vụ, phân tích đánh giá và sinh báo cáo kinh doanh từ MongoDB.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[120px]">
              <span className="block text-2xl font-black">{formatVND(grossRevenue)}</span>
              <span className="text-[11px] text-white/80 font-medium">Doanh thu tổng</span>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[110px]">
              <span className="block text-2xl font-black">{totalUsersCount}</span>
              <span className="text-[11px] text-white/80 font-medium">Tài khoản</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'dashboard'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <BarChart3 className="size-4" />
          <span>Dashboard & Báo cáo</span>
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Users className="size-4" />
          <span>Quản lý người dùng</span>
        </button>

        <button
          onClick={() => setAdminTab('categories')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'categories'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Layers className="size-4" />
          <span>Danh mục dịch vụ</span>
        </button>

        <button
          onClick={() => setAdminTab('services')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'services'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Wrench className="size-4" />
          <span>Quản lý dịch vụ</span>
        </button>

        <button
          onClick={() => setAdminTab('reviews')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'reviews'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Star className="size-4" />
          <span>Phân tích đánh giá (Analyze Reviews)</span>
        </button>
      </div>

      {/* ────────────────── 1. DASHBOARD OVERVIEW ────────────────── */}
      {adminTab === 'dashboard' && (
        <DashboardView />
      )}

      {/* ────────────────── 2. CRUD USERS VIEW ────────────────── */}
      {adminTab === 'users' && (
        <ToastProvider>
          <UserManagementPage embedded />
        </ToastProvider>
      )}

      {/* ────────────────── 3. CATEGORIES VIEW ────────────────── */}
      {adminTab === 'categories' && (
        <ToastProvider>
          <CategoryManagementPage embedded />
        </ToastProvider>
      )}

      {adminTab === 'services' && (
        <ToastProvider>
          <ServiceManagementPage embedded />
        </ToastProvider>
      )}

      {/* ────────────────── 4. ANALYZE REVIEWS VIEW ────────────────── */}
      {adminTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Phân Tích Đánh Giá & Mức Độ Hài Lòng
              </h2>
              <p className="text-xs text-muted-foreground">
                Chỉ số đánh giá từ dữ liệu đánh giá thực tế của hệ thống
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-2">
              <span className="text-xs text-muted-foreground font-bold">Điểm hài lòng trung bình</span>
              <p className="text-4xl font-black text-amber-500">{avgRating.toFixed(2)} / 5.0</p>
              <div className="flex justify-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      'size-5',
                      s <= Math.round(avgRating) ? 'fill-current' : 'text-muted/40',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Tổng cộng {totalReviews} đánh giá đã ghi nhận
              </p>
            </div>

            <div className="col-span-2 rounded-3xl border border-border bg-card p-6 space-y-3">
              <h3 className="text-sm font-black text-foreground">
                Độ hài lòng của khách hàng
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">Đánh giá tích cực ({'>='} 4 sao)</span>
                    <span className="font-bold text-emerald-600">
                      {totalReviews > 0 ? `${Math.round((avgRating / 5) * 100)}%` : '100%'}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${totalReviews > 0 ? Math.round((avgRating / 5) * 100) : 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Dữ liệu được tổng hợp trực tiếp từ bảng đánh giá khách hàng trên cơ sở dữ liệu MongoDB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
