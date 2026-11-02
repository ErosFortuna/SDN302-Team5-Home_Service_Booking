'use client'

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useDashboard, type DatePreset } from '@/hooks/use-dashboard'

function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DashboardView() {
  const {
    data,
    loading,
    error,
    startDate,
    endDate,
    preset,
    setStartDate,
    setEndDate,
    applyPreset,
    reload,
  } = useDashboard()

  const kpi = data?.kpi
  const status = data?.statusBreakdown
  const op = data?.operationalQuality

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-300 ring-1 ring-white/15">
                <LayoutDashboard className="size-3.5" /> UC-53 • Admin Dashboard Overview
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Bảng điều khiển Quản trị & Vận hành
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
              Theo dõi toàn diện các chỉ số KPI, hiệu suất dịch vụ, chất lượng vận hành và doanh thu thực nhận của nền tảng Home Service Booking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/30 transition-all"
            >
              <BarChart3 className="size-4" />
              <span>Xem báo cáo doanh thu chi tiết (UC-61)</span>
            </Link>

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 ring-1 ring-white/15 transition-all"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Date Filter Toolbar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mr-1">
              <Calendar className="size-3.5" /> Mốc thời gian:
            </span>
            {[
              { key: '7d', label: '7 ngày qua' },
              { key: '30d', label: '30 ngày qua' },
              { key: 'thisMonth', label: 'Tháng này' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key as DatePreset)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  preset === p.key
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center p-20 rounded-3xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="size-10 animate-spin text-indigo-600" />
          <p className="mt-4 font-bold text-slate-700 dark:text-slate-300">
            Đang tính toán các chỉ số thống kê & doanh thu...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {data && kpi && (
        <>
          {/* 2. KPI Summary Cards (6 chỉ số chính theo SRS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Doanh thu thuần (Net Revenue) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Doanh thu thuần (Net Revenue)
                </span>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <DollarSign className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCurrencyVND(kpi.netRevenue)}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-bold">
                    {kpi.netGrowthPercent >= 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <ArrowUpRight className="size-3.5" /> +{kpi.netGrowthPercent}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                        <ArrowDownRight className="size-3.5" /> {kpi.netGrowthPercent}%
                      </span>
                    )}
                    <span className="text-slate-400 font-normal">so với kỳ trước</span>
                  </div>

                  <span className="text-slate-400">
                    Gộp: {formatCurrencyVND(kpi.grossRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Dịch vụ hoàn thành (Completed Services) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dịch vụ đã hoàn tất
                </span>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <CheckCircle2 className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.completedServices}{' '}
                  <span className="text-sm font-semibold text-slate-400">đơn</span>
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Tổng phát sinh trong kỳ:</span>
                  <b className="text-slate-900 dark:text-white">{kpi.totalBookings} đơn</b>
                </div>
              </div>
            </div>

            {/* Card 3: Tỷ lệ hủy đơn (Cancellation Rate) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tỷ lệ hủy đơn (Cancellation)
                </span>
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-2xl',
                    kpi.cancellationRate > 15
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  )}
                >
                  <BadgePercent className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.cancellationRate}%
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Mức chuẩn an toàn:</span>
                  <span className="font-semibold text-emerald-600">&lt; 10%</span>
                  {kpi.refundedAmount > 0 && (
                    <span className="ml-auto text-rose-500 font-medium">
                      Hoàn: {formatCurrencyVND(kpi.refundedAmount)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Tổng đơn đặt (Total Bookings) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tổng đơn đặt lịch
                </span>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Briefcase className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.totalBookings}{' '}
                  <span className="text-sm font-semibold text-slate-400">booking</span>
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Đang xử lý trong kỳ:</span>
                  <b className="text-blue-600">{status?.inProgress || 0} đơn</b>
                </div>
              </div>
            </div>

            {/* Card 5: Thợ đang hoạt động (Active Providers) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Thợ sẵn sàng nhận việc
                </span>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <ShieldCheck className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.activeProviders}{' '}
                  <span className="text-sm font-semibold text-slate-400">thợ đã duyệt</span>
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Đạt chuẩn kiểm duyệt hồ sơ UC-56</span>
                </div>
              </div>
            </div>

            {/* Card 6: Tổng người dùng hệ thống (Total Users) */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tổng tài khoản người dùng
                </span>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Users className="size-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  {kpi.totalUsers}{' '}
                  <span className="text-sm font-semibold text-slate-400">khách hàng & thợ</span>
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span>Đang hoạt động trên nền tảng</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Operational Performance & Service Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Category Breakdown & Booking Status */}
            <div className="lg:col-span-7 space-y-6">
              {/* Category Breakdown */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="size-5 text-indigo-600" />
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Phân bổ đơn & Giá trị theo Danh mục dịch vụ
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {data.categoriesBreakdown.length} danh mục
                  </span>
                </div>

                {data.categoriesBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-6 text-center">
                    Chưa có đơn phát sinh trong khoảng thời gian này.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.categoriesBreakdown.map((cat, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800 dark:text-slate-200">
                            {cat.categoryName}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">
                              {cat.bookingsCount} đơn ({cat.percentage}%)
                            </span>
                            <span className="text-indigo-600 font-black">
                              {formatCurrencyVND(cat.totalValue)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, cat.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking Status Breakdown */}
              {status && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="font-black text-base text-slate-900 dark:text-white mb-4">
                    Tỷ lệ trạng thái tiến độ đơn ({status.total} đơn)
                  </h3>

                  {/* Multi-segmented bar */}
                  <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    {status.total > 0 ? (
                      <>
                        <div
                          style={{ width: `${(status.completed / status.total) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Hoàn thành: ${status.completed}`}
                        />
                        <div
                          style={{ width: `${(status.inProgress / status.total) * 100}%` }}
                          className="bg-blue-500 h-full"
                          title={`Đang xử lý: ${status.inProgress}`}
                        />
                        <div
                          style={{ width: `${(status.pending / status.total) * 100}%` }}
                          className="bg-amber-400 h-full"
                          title={`Chờ xác nhận: ${status.pending}`}
                        />
                        <div
                          style={{ width: `${(status.cancelled / status.total) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Đã hủy: ${status.cancelled}`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-200 h-full" />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Hoàn thành</p>
                        <p className="text-slate-500">{status.completed} đơn</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-blue-500 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Đang thực hiện</p>
                        <p className="text-slate-500">{status.inProgress} đơn</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-amber-400 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Chờ xác nhận</p>
                        <p className="text-slate-500">{status.pending} đơn</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Đã hủy / Vắng mặt</p>
                        <p className="text-slate-500">{status.cancelled} đơn</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Quality & Operational Highlights */}
            {op && (
              <div className="lg:col-span-5 space-y-6">
                {/* Average Handling Time */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Clock className="size-4 text-indigo-600" />
                    Thời gian xử lý trung bình (Average Handling Time)
                  </div>

                  <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">
                    {op.avgHandlingMinutes}{' '}
                    <span className="text-lg font-bold text-slate-400">phút / dịch vụ</span>
                  </p>

                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Tính toán từ thời điểm thợ bắt đầu ca làm đến khi bàn giao và kết thúc booking.
                  </p>

                  <div className="mt-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                    <span>Mục tiêu vận hành chuẩn:</span>
                    <span className="font-black">60 - 90 phút</span>
                  </div>
                </div>

                {/* Rating & Complaints Summary */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Chất lượng dịch vụ & Khiếu nại
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-md">
                        <Star className="size-6 fill-current" />
                      </div>
                      <div>
                        <p className="font-black text-2xl text-slate-900 dark:text-white">
                          {op.systemAvgRating} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Điểm đánh giá trung bình ({op.totalReviews} lượt đánh giá)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Open Complaints */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md">
                        <ShieldAlert className="size-6" />
                      </div>
                      <div>
                        <p className="font-black text-2xl text-slate-900 dark:text-white">
                          {op.openComplaintsCount}{' '}
                          <span className="text-sm font-normal text-slate-400">khiếu nại</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Đang mở / cần phân công điều tra
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-black',
                        op.openComplaintsCount === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {op.openComplaintsCount === 0 ? 'An toàn' : 'Cần xử lý'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
