'use client'

import { useState } from 'react'
import {
  ShieldAlert,
  UserCheck,
  CalendarDays,
  FileBarChart,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Check,
  X,
  Sparkles,
  Phone,
  Mail,
  User,
  Wrench,
  Filter,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { Avatar } from '../shared'
import { cn } from '@/lib/utils'

export function StaffPortalView() {
  const {
    staffTab,
    setStaffTab,
    complaints,
    resolveComplain,
    verifications,
    approveVerification,
    rejectVerification,
    bookings,
    cancelOrRescheduleBooking,
  } = useApp()

  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [refundAmount, setRefundAmount] = useState<number>(0)

  // Reschedule state
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null)
  const [newDateInput, setNewDateInput] = useState('2026-10-02')

  const openComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length
  const pendingVrfCount = verifications.filter((v) => v.status === 'pending').length

  const handleResolveSubmit = (id: string) => {
    if (!resolutionText.trim()) return
    resolveComplain(id, resolutionText, refundAmount > 0 ? refundAmount : undefined)
    setResolvingId(null)
    setResolutionText('')
    setRefundAmount(0)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-blue-600 via-sky-600 to-teal-600 p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Staff Portal · CSKH & Vận Hành
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white/90">
                <ShieldAlert className="size-4" /> Hệ thống giám sát Use Case
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">
              Trung Tâm Hỗ Trợ Khách Hàng & Duyệt Thợ
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              Xử lý khiếu nại, thẩm định hồ sơ thợ đối tác, hỗ trợ hủy/dời lịch hẹn và báo cáo chỉ số vận hành.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[110px]">
              <span className="block text-2xl font-black">{openComplaintsCount}</span>
              <span className="text-[11px] text-white/80 font-medium">Khiếu nại chờ</span>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[110px]">
              <span className="block text-2xl font-black">{pendingVrfCount}</span>
              <span className="text-[11px] text-white/80 font-medium">Hồ sơ chờ duyệt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setStaffTab('complaints')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            staffTab === 'complaints'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <AlertTriangle className="size-4" />
          <span>Xử lý khiếu nại (View/Reply Complain)</span>
          {openComplaintsCount > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">
              {openComplaintsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStaffTab('verifications')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            staffTab === 'verifications'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <UserCheck className="size-4" />
          <span>Duyệt hồ sơ thợ (Verify Providers)</span>
          {pendingVrfCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">
              {pendingVrfCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStaffTab('schedule')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            staffTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <CalendarDays className="size-4" />
          <span>Hỗ trợ đơn & Lịch hẹn (Cancel/Reschedule)</span>
        </button>

        <button
          onClick={() => setStaffTab('reports')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            staffTab === 'reports'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <FileBarChart className="size-4" />
          <span>Báo cáo vận hành (Report/Dashboard)</span>
        </button>
      </div>

      {/* ────────────────── 1. COMPLAINTS VIEW ────────────────── */}
      {staffTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">
              Danh sách khiếu nại dịch vụ ({complaints.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Phân loại theo Use Case: View Complain & Reply Complain
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {complaints.map((c) => {
              const isResolved = c.status === 'resolved'
              const isInvestigating = c.status === 'investigating'
              return (
                <div
                  key={c.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex size-10 items-center justify-center rounded-2xl font-bold text-white',
                          isResolved
                            ? 'bg-emerald-500'
                            : isInvestigating
                            ? 'bg-amber-500'
                            : 'bg-rose-500',
                        )}
                      >
                        <AlertTriangle className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">
                            {c.title}
                          </h3>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase',
                              isResolved
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : isInvestigating
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600',
                            )}
                          >
                            {isResolved
                              ? 'Đã xử lý'
                              : isInvestigating
                              ? 'Đang xác minh'
                              : 'Chờ tiếp nhận'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Mã đơn: <span className="font-semibold">{c.bookingId}</span> · Khách:{' '}
                          <span className="font-semibold text-foreground">{c.customerName}</span> · Thợ:{' '}
                          <span className="font-semibold text-foreground">{c.providerName}</span> ·{' '}
                          {c.createdAt}
                        </p>
                      </div>
                    </div>

                    {!isResolved && (
                      <button
                        onClick={() => {
                          setResolvingId(c.id)
                          setResolutionText('')
                          setRefundAmount(0)
                        }}
                        className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all shrink-0"
                      >
                        Phản hồi & Giải quyết
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-2xl p-4">
                    &ldquo;{c.content}&rdquo;
                  </p>

                  {/* Resolution details if already resolved */}
                  {isResolved && c.resolution && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                        <CheckCircle2 className="size-4" />
                        <span>Kết quả xử lý từ CSKH:</span>
                      </div>
                      <p className="text-foreground/90">{c.resolution}</p>
                      {c.refundAmount && (
                        <p className="mt-1 font-bold text-emerald-600">
                          Đã hoàn trả khách: {formatVND(c.refundAmount)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply Dialog Inline */}
                  {resolvingId === c.id && (
                    <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 animate-in fade-in">
                      <h4 className="text-xs font-extrabold text-blue-700 dark:text-blue-400">
                        Nhập phản hồi xử lý khiếu nại (Reply Complain):
                      </h4>
                      <textarea
                        rows={3}
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="vd: Đã liên hệ thợ giải trình, đồng ý cử thợ khác xử lý miễn phí và hoàn trả phí phát sinh..."
                        className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-blue-500"
                      />
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span>Số tiền bồi thường / hoàn trả (VNĐ):</span>
                          <input
                            type="number"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(Number(e.target.value))}
                            className="w-32 rounded-xl border border-border bg-background p-2 text-xs font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setResolvingId(null)}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleResolveSubmit(c.id)}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                          >
                            Xác nhận hoàn tất khiếu nại
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ────────────────── 2. VERIFY PROVIDERS VIEW ────────────────── */}
      {staffTab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">
              Hồ sơ thợ đối tác đăng ký mới ({verifications.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Thẩm định thông tin CCCD, bằng nghề theo Use Case: Verify Providers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifications.map((v) => {
              const isApproved = v.status === 'approved'
              const isRejected = v.status === 'rejected'
              return (
                <div
                  key={v.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 font-extrabold text-base">
                        <Wrench className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-foreground">
                          {v.providerName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {v.category} · {v.experienceYears} năm kinh nghiệm
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase',
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : isRejected
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-amber-500/10 text-amber-600',
                      )}
                    >
                      {isApproved
                        ? 'Đã duyệt'
                        : isRejected
                        ? 'Đã từ chối'
                        : 'Chờ xét duyệt'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Số CCCD:</span>
                      <span className="font-bold text-foreground">{v.identityCard}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Tài liệu gửi kèm:</span>
                      <span className="font-bold text-foreground">{v.documentsCount} tệp đính kèm</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-border/60">
                      <span className="text-muted-foreground block text-[11px]">Liên hệ:</span>
                      <span className="font-medium text-foreground">{v.phone} · {v.email}</span>
                    </div>
                  </div>

                  {v.status === 'pending' ? (
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => rejectVerification(v.id)}
                        className="flex-1 rounded-xl border border-destructive/30 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Từ chối hồ sơ
                      </button>
                      <button
                        onClick={() => approveVerification(v.id)}
                        className="flex-[1.5] rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Check className="size-4" />
                        Phê duyệt trở thành Thợ
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      Hồ sơ đã được xử lý lúc {v.submittedAt}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ────────────────── 3. SCHEDULE & BOOKINGS VIEW ────────────────── */}
      {staffTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">
              Quản lý Lịch hẹn & Hủy / Đổi lịch ({bookings.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Theo Use Case: Cancel / Reschedule Booking
            </span>
          </div>

          <div className="divide-y divide-border rounded-3xl border border-border bg-card overflow-hidden">
            {bookings.map((b) => (
              <div key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{b.title}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-brand">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Khách: <span className="font-semibold text-foreground">{b.customerName}</span> · Lịch hiện tại:{' '}
                    <span className="font-semibold text-foreground">{b.date} ({b.time})</span> · Địa chỉ: {b.address}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {b.status !== 'cancelled' ? (
                    <>
                      <button
                        onClick={() => setReschedulingBookingId(b.id)}
                        className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Calendar className="size-3.5 text-blue-600" />
                        Dời ngày hẹn
                      </button>
                      <button
                        onClick={() => cancelOrRescheduleBooking(b.id, 'cancel')}
                        className="rounded-xl border border-destructive/40 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Hủy lịch đơn
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground font-semibold">
                      Đơn đã bị hủy
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {reschedulingBookingId && (
            <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-blue-700 dark:text-blue-400">
                  Chọn ngày mới cho đơn #{reschedulingBookingId}:
                </p>
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="mt-1 rounded-xl border border-border bg-background p-2 text-xs font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReschedulingBookingId(null)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    cancelOrRescheduleBooking(reschedulingBookingId, 'reschedule', newDateInput)
                    setReschedulingBookingId(null)
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Lưu ngày mới
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── 4. STAFF REPORTS VIEW ────────────────── */}
      {staffTab === 'reports' && (
        <div className="space-y-6">
          <h2 className="text-lg font-black text-foreground">
            Báo Cáo Hoạt Động & Hiệu Suất CSKH
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tổng đơn hoàn thành</span>
              <p className="text-2xl font-black text-foreground mt-2">1,420</p>
              <span className="text-[11px] text-emerald-600 font-semibold">↑ 12% so với tháng trước</span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tỷ lệ giải quyết khiếu nại</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">96.8%</p>
              <span className="text-[11px] text-muted-foreground">Mục tiêu: {'>'}95%</span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Thời gian phản hồi TB</span>
              <p className="text-2xl font-black text-blue-600 mt-2">4.5 phút</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Đạt chuẩn SLA cấp 1</span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Thợ đang hoạt động</span>
              <p className="text-2xl font-black text-amber-600 mt-2">328 thợ</p>
              <span className="text-[11px] text-muted-foreground">Trên toàn TP.HCM & Hà Nội</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
