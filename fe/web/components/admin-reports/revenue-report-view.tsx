'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRevenueReport } from '@/hooks/use-revenue-report'
import type { DatePreset } from '@/hooks/use-dashboard'

function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RevenueReportView() {
  const {
    startDate,
    endDate,
    preset,
    granularity,
    timeSeries,
    seriesLoading,
    seriesError,
    providers,
    pagination,
    sortBy,
    order,
    search,
    providersLoading,
    providersError,
    setStartDate,
    setEndDate,
    setGranularity,
    applyPreset,
    setSortBy,
    toggleOrder,
    setSearch,
    setPage,
    reload,
  } = useRevenueReport()

  const summary = timeSeries?.summary
  const seriesData = timeSeries?.data || []

  // Max value for chart bar scaling
  const maxNetValue = Math.max(1, ...seriesData.map((d) => d.netRevenue))

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!providers || providers.length === 0) return

    const headers = [
      'STT',
      'Tên thợ',
      'Doanh nghiệp',
      'Email',
      'Số điện thoại',
      'Số đơn hoàn tất',
      'Đánh giá',
      'Doanh thu gộp (VND)',
      'Tiền hoàn trả (VND)',
      'Doanh thu thuần (VND)',
    ]

    const rows = providers.map((p, idx) => [
      idx + 1,
      `"${p.providerName || ''}"`,
      `"${p.businessName || ''}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      p.completedJobs,
      p.rating,
      p.grossRevenue,
      p.refundedAmount,
      p.netRevenue,
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-doanh-thu-tho-${startDate}-den-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-white/15">
                <BarChart3 className="size-3.5" /> UC-61 • Revenue Reports & Leaderboard
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Báo cáo Doanh thu & Hiệu suất thợ
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
              Nguyên tắc Single Source of Truth: Doanh thu thực nhận được aggregate từ bảng Payment. Tự động khấu trừ các khoản hoàn tiền giao dịch để tránh tính trùng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={providers.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <Download className="size-4" />
              <span>Xuất file Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 ring-1 ring-white/15 transition-all"
            >
              <RefreshCw className={cn('size-4', (seriesLoading || providersLoading) && 'animate-spin')} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Date Filter & Granularity Toolbar */}
        <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex items-center gap-2 text-xs ml-0 sm:ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <span className="text-slate-400">đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Granularity Switcher */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl ring-1 ring-white/15">
            {[
              { key: 'day', label: 'Theo ngày' },
              { key: 'week', label: 'Theo tuần' },
              { key: 'month', label: 'Theo tháng' },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGranularity(g.key as 'day' | 'week' | 'month')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                  granularity === g.key
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Revenue Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Doanh thu thuần thực nhận (Net)
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrencyVND(summary.netRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              = Doanh thu gộp trừ tiền hoàn
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng giá trị dịch vụ (Gross)
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {formatCurrencyVND(summary.grossRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Từ các giao dịch có trạng thái PAID
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Số tiền hoàn trả khách (Refunded)
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrencyVND(summary.refundedAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Do hủy đơn hoặc khiếu nại hoàn tiền
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Số giao dịch thành công
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {summary.paidBookingsCount}{' '}
              <span className="text-sm font-semibold text-slate-400">đơn thanh toán</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Đã xác thực qua cổng thanh toán
            </p>
          </div>
        </div>
      )}

      {/* 3. Visual Revenue Time-Series Chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Biểu đồ doanh thu theo chuỗi thời gian
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhóm theo {granularity === 'day' ? 'từng ngày' : granularity === 'week' ? 'từng tuần' : 'từng tháng'} trong giai đoạn {startDate} đến {endDate}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-emerald-500" />
              <span>Doanh thu thuần (Net)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-rose-400" />
              <span>Hoàn trả (Refunded)</span>
            </div>
          </div>
        </div>

        {seriesLoading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Đang tổng hợp dữ liệu doanh thu...
            </p>
          </div>
        ) : seriesData.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 italic">
            Chưa có giao dịch phát sinh trong giai đoạn này.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Bar Graph */}
            <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              {seriesData.map((item, idx) => {
                const heightPercent = Math.max(8, (item.netRevenue / maxNetValue) * 100)
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[32px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white rounded-xl p-2 text-[10px] whitespace-nowrap shadow-xl z-20">
                      <p className="font-bold">{item.period}</p>
                      <p className="text-emerald-300">
                        Thuần: {formatCurrencyVND(item.netRevenue)}
                      </p>
                      {item.refundedAmount > 0 && (
                        <p className="text-rose-300">
                          Hoàn: -{formatCurrencyVND(item.refundedAmount)}
                        </p>
                      )}
                      <p className="text-slate-400">{item.paidBookingsCount} đơn</p>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        'w-full max-w-[28px] rounded-t-lg transition-all duration-300 group-hover:opacity-80',
                        item.netRevenue > 0
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                          : 'bg-slate-300 dark:bg-slate-700'
                      )}
                    />

                    {/* X-axis label */}
                    <span className="text-[10px] font-bold text-slate-400 mt-2 truncate max-w-[40px] text-center">
                      {item.period.length > 5 ? item.period.slice(-5) : item.period}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Provider Revenue & Performance Leaderboard */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Bảng xếp hạng Doanh thu & Hiệu suất theo Thợ
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xếp hạng theo tổng giá trị công việc hoàn thành và doanh thu thuần đem lại cho nền tảng
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm thợ..."
                className="rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Sort field buttons */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 mr-1 font-semibold">Sắp xếp:</span>
              <button
                type="button"
                onClick={() => setSortBy('netRevenue')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-bold transition',
                  sortBy === 'netRevenue'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                Doanh thu
              </button>
              <button
                type="button"
                onClick={() => setSortBy('completedJobs')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-bold transition',
                  sortBy === 'completedJobs'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                Số đơn
              </button>
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-bold transition',
                  sortBy === 'rating'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                Đánh giá
              </button>
              <button
                type="button"
                onClick={toggleOrder}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                title={`Thứ tự: ${order === 'desc' ? 'Giảm dần' : 'Tăng dần'}`}
              >
                <ArrowUpDown className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {providersLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="size-7 animate-spin text-emerald-600" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Đang tải bảng xếp hạng...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 italic">
            Không tìm thấy thông tin doanh thu của thợ trong giai đoạn này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-3">Thợ / Đơn vị</th>
                  <th className="py-3 px-3 text-center">Đơn hoàn tất</th>
                  <th className="py-3 px-3 text-center">Đánh giá</th>
                  <th className="py-3 px-3 text-right">Doanh thu gộp</th>
                  <th className="py-3 px-3 text-right">Hoàn trả</th>
                  <th className="py-3 px-3 text-right">Doanh thu thuần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {providers.map((p, idx) => (
                  <tr
                    key={p._id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold overflow-hidden">
                          {p.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar} alt="" className="size-full object-cover" />
                          ) : (
                            p.providerName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {p.providerName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {p.businessName || p.email || p.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {p.completedJobs} đơn
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Star className="size-3 fill-current text-amber-500" />
                        {Number(p.rating || 5.0).toFixed(1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrencyVND(p.grossRevenue)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      {p.refundedAmount > 0 ? `-${formatCurrencyVND(p.refundedAmount)}` : '0 đ'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrencyVND(p.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 text-xs font-semibold text-slate-500">
                <span>
                  Trang {pagination.page} / {pagination.totalPages} ({pagination.total} thợ)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
