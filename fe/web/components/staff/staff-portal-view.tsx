'use client'

import { useState, useEffect } from 'react'
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
  MapPin,
  Star,
  Award,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/utils'
import { Avatar } from '../shared'
import { cn } from '@/lib/utils'
import {
  getDispatchRequests,
  getDispatchRecommendedProviders,
  dispatchAssignProvider,
  parseRequestTitleAndDesc,
  type DispatchServiceRequestItem,
  type RecommendedProviderItem,
} from '@/lib/api/service-requests'

export function StaffPortalView() {
  const {
    staffTab,
    setStaffTab,
    focusedVerificationId,
    clearFocusedVerification,
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
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (staffTab !== 'verifications' || !focusedVerificationId) return
    if (!verifications.some((verification) => verification.id === focusedVerificationId)) return

    const frame = requestAnimationFrame(() => {
      document.getElementById(`verification-${focusedVerificationId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      clearFocusedVerification()
    })

    return () => cancelAnimationFrame(frame)
  }, [staffTab, focusedVerificationId, verifications, clearFocusedVerification])

  // Reschedule state
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null)
  const [newDateInput, setNewDateInput] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0])

  // Dispatch / Assign Provider State
  const [dispatchRequests, setDispatchRequests] = useState<DispatchServiceRequestItem[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<DispatchServiceRequestItem | null>(null)
  const [recommendedProviders, setRecommendedProviders] = useState<RecommendedProviderItem[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [assigningProviderId, setAssigningProviderId] = useState<string | null>(null)
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null)
  const [dispatchErrorMsg, setDispatchErrorMsg] = useState<string | null>(null)
  const [customStartTime, setCustomStartTime] = useState<string>('')
  const [searchFilter, setSearchFilter] = useState('')

  const openComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length
  const pendingVrfCount = verifications.filter((v) => v.status === 'pending').length
  const openRequestsCount = dispatchRequests.filter((r) => r.status === 'OPEN').length

  const fetchRequests = async () => {
    setIsLoadingRequests(true)
    try {
      const res = await getDispatchRequests({ status: 'OPEN' })
      setDispatchRequests(res.requests || [])
    } catch {
      setDispatchRequests([])
    } finally {
      setIsLoadingRequests(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleOpenDispatchModal = async (req: DispatchServiceRequestItem) => {
    setSelectedRequest(req)
    setDispatchSuccessMsg(null)
    setDispatchErrorMsg(null)
    setCustomStartTime(req.preferredStartAt ? new Date(req.preferredStartAt).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16))
    setIsLoadingRecommendations(true)
    try {
      const providers = await getDispatchRecommendedProviders(req.id)
      setRecommendedProviders(providers || [])
    } catch {
      setRecommendedProviders([])
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const handleAssignProvider = async (provider: RecommendedProviderItem) => {
    if (!selectedRequest) return
    setAssigningProviderId(provider.providerId)
    setDispatchErrorMsg(null)
    try {
      await dispatchAssignProvider(selectedRequest.id, provider.providerId, customStartTime || undefined)
      setDispatchSuccessMsg(`Đã phân công thành công thợ ${provider.fullName} cho đơn dịch vụ!`)
      setDispatchRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id))
      setTimeout(() => {
        setSelectedRequest(null)
        setDispatchSuccessMsg(null)
      }, 1500)
    } catch (err: any) {
      setDispatchErrorMsg(err.message || 'Lỗi khi điều phối thợ')
    } finally {
      setAssigningProviderId(null)
    }
  }

  const handleResolveSubmit = async (id: string) => {
    if (!resolutionText.trim()) return
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await resolveComplain(id, resolutionText.trim())
      setActionSuccess('Đã xử lý và lưu kết quả giải quyết khiếu nại thành công!')
      setResolvingId(null)
      setResolutionText('')
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi giải quyết khiếu nại. Thao tác không thành công trên máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveVerification = async (id: string) => {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await approveVerification(id)
      setActionSuccess('Đã thẩm định và phê duyệt hồ sơ thợ thành công!')
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi phê duyệt hồ sơ thợ. Thao tác không thành công trên máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectVerification = async (id: string) => {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await rejectVerification(id)
      setActionSuccess('Đã từ chối hồ sơ thợ.')
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi từ chối hồ sơ thợ. Thao tác không thành công trên máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelBooking = async (id: string) => {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await cancelOrRescheduleBooking(id, 'cancel')
      setActionSuccess('Đã hủy lịch đơn dịch vụ thành công!')
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi hủy lịch hẹn. Thao tác không thành công trên máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRescheduleBooking = async (id: string, date: string) => {
    setIsSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await cancelOrRescheduleBooking(id, 'reschedule', date)
      setActionSuccess('Đã cập nhật ngày hẹn mới thành công!')
      setReschedulingBookingId(null)
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi dời lịch hẹn. Thao tác không thành công trên máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRequests = dispatchRequests.filter((r) => {
    const text = `${r.service?.name || ''} ${r.description || ''} ${typeof r.customer === 'object' ? r.customer?.fullName : ''} ${r.address?.addressLine || ''}`.toLowerCase()
    return text.includes(searchFilter.toLowerCase())
  })

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
                <ShieldAlert className="size-4" /> Hệ thống điều phối trung tâm
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">
              Trung Tâm Hỗ Trợ Khách Hàng & Điều Phối Thợ
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              Điều phối thợ theo thuật toán matching, xử lý khiếu nại, thẩm định hồ sơ thợ đối tác và giám sát vận hành.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[110px]">
              <span className="block text-2xl font-black">{openRequestsCount}</span>
              <span className="text-[11px] text-white/80 font-medium">Đơn chờ gán thợ</span>
            </div>
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

      {/* Operation Feedback Banner */}
      {actionError && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="rounded-lg p-1 hover:bg-destructive/20 text-destructive transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="rounded-lg p-1 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setStaffTab('dispatch')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            staffTab === 'dispatch'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Sparkles className="size-4" />
          <span>Điều phối thợ (Assign Provider)</span>
          {openRequestsCount > 0 && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-white">
              {openRequestsCount}
            </span>
          )}
        </button>

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

      {/* ────────────────── 0. DISPATCH / ASSIGN PROVIDER VIEW ────────────────── */}
      {staffTab === 'dispatch' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <span>Hàng Đợi Yêu Cầu Chờ Điều Phối</span>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  {openRequestsCount} yêu cầu đang mở
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Khách hàng đã gửi yêu cầu. Nhân viên CSKH đối chiếu gợi ý thuật toán matching và phân bổ thợ uy tín.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo dịch vụ, khách hàng, địa chỉ..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="rounded-2xl border border-border bg-card pl-9 pr-4 py-2 text-xs font-medium w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchRequests}
                disabled={isLoadingRequests}
                className="rounded-2xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Làm mới danh sách"
              >
                <RotateCcw className={cn("size-4", isLoadingRequests && "animate-spin")} />
              </button>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground">Không có yêu cầu nào cần điều phối</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả các yêu cầu dịch vụ đã được phân công thợ hoặc đang được xử lý.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRequests.map((req) => {
                const customerName = typeof req.customer === 'object' && req.customer?.fullName
                  ? req.customer.fullName
                  : req.address?.recipientName || 'Khách hàng'
                const customerPhone = typeof req.customer === 'object' && req.customer?.phone
                  ? req.customer.phone
                  : req.address?.phone || 'Chưa cung cấp'
                const formattedDate = req.preferredStartAt
                  ? new Date(req.preferredStartAt).toLocaleDateString('vi-VN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Thời gian thỏa thuận'

                return (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded-full bg-blue-500/10 text-blue-600 px-2.5 py-0.5 text-[11px] font-bold">
                            #{req.id.slice(-6)} · {req.service?.category?.name || 'Dịch vụ'}
                          </span>
                          {(() => {
                            const parsed = parseRequestTitleAndDesc(req.description, req.service?.name || 'Yêu cầu dịch vụ tại nhà');
                            return (
                              <>
                                <h3 className="text-base font-extrabold text-foreground mt-1.5">
                                  {parsed.title}
                                </h3>
                                {req.service?.name && req.service.name !== parsed.title && (
                                  <p className="text-[11px] text-brand font-medium">
                                    Dịch vụ: {req.service.name}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <span className="rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-1 text-xs font-bold shrink-0">
                          Chờ điều phối
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {parseRequestTitleAndDesc(req.description).description || req.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="size-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-foreground">{customerName}</span>
                          <span className="text-[11px]">({customerPhone})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground sm:col-span-2">
                          <MapPin className="size-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{req.address?.addressLine}, {req.address?.city}</span>
                        </div>
                      </div>

                      {req.budgetMin && req.budgetMax && (
                        <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-3 py-2 text-xs">
                          <span className="text-muted-foreground font-medium">Ngân sách dự kiến:</span>
                          <span className="font-bold text-foreground">
                            {formatVND(req.budgetMin)} - {formatVND(req.budgetMax)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Giá sàn dịch vụ: {formatVND(req.service?.basePrice || 200000)}
                      </span>
                      <button
                        onClick={() => handleOpenDispatchModal(req)}
                        className="rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Xem gợi ý & Gán thợ</span>
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal / Overlay for Provider Assignment */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Phân công thợ
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Yêu cầu #{selectedRequest.id.slice(-6)}
                      </span>
                    </div>
                    {(() => {
                      const parsed = parseRequestTitleAndDesc(selectedRequest.description, selectedRequest.service?.name);
                      return (
                        <>
                          <h3 className="text-xl font-black text-foreground mt-1">
                            {parsed.title}
                          </h3>
                          {selectedRequest.service?.name && selectedRequest.service.name !== parsed.title && (
                            <p className="text-xs font-semibold text-brand mt-0.5">
                              Dịch vụ: {selectedRequest.service.name}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Khách: {typeof selectedRequest.customer === 'object' && selectedRequest.customer?.fullName ? selectedRequest.customer.fullName : selectedRequest.address?.recipientName} · {selectedRequest.address?.addressLine}, {selectedRequest.address?.city}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-2xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Time picker adjustment */}
                <div className="bg-muted/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Khung giờ thực hiện dịch vụ:
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Có thể điều chỉnh lịch hẹn nếu đã thỏa thuận trước với khách
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {dispatchSuccessMsg && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{dispatchSuccessMsg}</span>
                  </div>
                )}

                {dispatchErrorMsg && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive font-bold text-xs flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{dispatchErrorMsg}</span>
                  </div>
                )}

                {/* Recommended Providers List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      <Award className="size-4 text-amber-500" />
                      <span>Danh sách thợ tối ưu (Thuật toán Matching)</span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Lọc theo Kỹ năng · Lịch trống · Đánh giá · Khoảng cách
                    </span>
                  </div>

                  {isLoadingRecommendations ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-blue-600" />
                      <span className="text-xs font-medium">Đang chạy thuật toán tìm thợ phù hợp nhất...</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-2xl bg-card overflow-hidden">
                      {recommendedProviders.map((provider) => {
                        const isAssigning = assigningProviderId === provider.providerId

                        return (
                          <div
                            key={provider.providerId}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start gap-3.5">
                              <Avatar
                                initials={provider.fullName.slice(0, 2).toUpperCase()}
                                className="size-12 shrink-0 border border-border"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-foreground">
                                    {provider.fullName}
                                  </span>
                                  {provider.score && (
                                    <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-extrabold">
                                      ★ {provider.score}% Khớp
                                    </span>
                                  )}
                                  <span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[10px] font-bold">
                                    Đã xác thực
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="size-3.5 fill-amber-500" />
                                    {provider.averageRating?.toFixed(1) || '5.0'}
                                    <span className="text-muted-foreground font-normal">
                                      ({provider.reviewCount || 0} đánh giá)
                                    </span>
                                  </span>
                                  <span>·</span>
                                  <span>{provider.completedJobCount || 0} đơn đã làm</span>
                                  {provider.distanceKm != null && (
                                    <>
                                      <span>·</span>
                                      <span className="text-blue-600 font-semibold">
                                        Cách {provider.distanceKm.toFixed(1)} km
                                      </span>
                                    </>
                                  )}
                                </div>

                                {provider.reasons && provider.reasons.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {provider.reasons.map((r, idx) => (
                                      <span
                                        key={idx}
                                        className="rounded-lg bg-secondary/60 text-secondary-foreground px-2 py-0.5 text-[10px] font-medium"
                                      >
                                        ✓ {r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                              <div className="text-right hidden sm:block">
                                <span className="text-[10px] text-muted-foreground block font-medium">Giá tiêu chuẩn</span>
                                <span className="text-xs font-bold text-foreground">
                                  {formatVND(provider.basePrice || selectedRequest.service?.basePrice || 200000)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleAssignProvider(provider)}
                                disabled={isAssigning}
                                className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isAssigning ? (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>Đang gán thợ...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="size-3.5" />
                                    <span>Gán thợ này</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-2xl border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Đóng cửa sổ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                        placeholder="Nội dung giải quyết hỗ trợ khách hàng và thợ đối tác..."
                        className="w-full rounded-xl border border-border bg-background p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-2">
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
                  id={`verification-${v.id}`}
                  className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4"
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
                        disabled={isSubmitting}
                        onClick={() => handleRejectVerification(v.id)}
                        className="flex-1 rounded-xl border border-destructive/30 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Từ chối hồ sơ
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={() => handleApproveVerification(v.id)}
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
                        disabled={isSubmitting}
                        onClick={() => handleCancelBooking(b.id)}
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
                    handleRescheduleBooking(reschedulingBookingId, newDateInput)
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Báo Cáo Hoạt Động & Hiệu Suất CSKH
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Số liệu được tính toán trực tiếp từ dữ liệu vận hành thực tế trên hệ thống
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
              <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
              Dữ liệu trực tiếp (Live Operations)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tổng đơn hoàn thành</span>
              <p className="text-2xl font-black text-foreground mt-2">
                {bookings.filter((b) => b.status === 'completed').length}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {bookings.length} đơn</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold">Theo dữ liệu đơn đặt thực tế</span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tỷ lệ giải quyết khiếu nại</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {complaints.length > 0
                  ? Math.round((complaints.filter((c) => c.status === 'resolved').length / complaints.length) * 100) + '%'
                  : '100%'}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {complaints.filter((c) => c.status === 'resolved').length}/{complaints.length} khiếu nại đã giải quyết
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Hồ sơ thợ đã thẩm định</span>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {verifications.filter((v) => v.status === 'approved').length}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {verifications.length} hồ sơ</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {pendingVrfCount > 0 ? pendingVrfCount + ' hồ sơ đang chờ duyệt' : 'Đã duyệt toàn bộ hồ sơ'}
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Yêu cầu chờ điều phối</span>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {openRequestsCount} đơn
              </p>
              <span className="text-[11px] text-muted-foreground">Cần nhân viên CSKH matching thợ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}