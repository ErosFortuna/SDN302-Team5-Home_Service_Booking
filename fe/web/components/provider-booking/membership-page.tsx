'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import {
  createMembershipCheckout,
  cancelPendingMembershipCheckout,
  formatMembershipDate,
  formatMembershipPrice,
  getMembershipPlans,
  getMyMembershipPayments,
  getMySubscription,
  syncMembershipPayment,
  type MembershipPayment,
  type MembershipPlan,
  type ProviderSubscription,
} from '@/lib/api/membership'
import { getErrorMessage } from '@/lib/api/client'
import { providerVerificationApi } from '@/lib/api/verification'
import { getMyProviderProfile } from '@/lib/api/provider-profile'

type MembershipPageProps = {
  paymentResult?: 'success' | 'cancelled'
  onGoToProfile?: () => void
  isVerified?: boolean
}

const PAYMENT_STATUS: Record<MembershipPayment['status'], string> = {
  PENDING: 'Đang chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  FAILED: 'Thất bại',
}

export function MembershipPage({ paymentResult, onGoToProfile, isVerified: propIsVerified }: MembershipPageProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subscription, setSubscription] = useState<ProviderSubscription | null>(null)
  const [payments, setPayments] = useState<MembershipPayment[]>([])
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null)
  const [cancellingPending, setCancellingPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSuccessNotice, setIsSuccessNotice] = useState(false)

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [availablePlans, currentSubscription, paymentHistory, verificationRes, profileRes] = await Promise.all([
        getMembershipPlans(),
        getMySubscription(),
        getMyMembershipPayments(),
        providerVerificationApi.getMyStatus().catch(() => null),
        getMyProviderProfile().catch(() => null),
      ])
      setPlans(availablePlans)
      setSubscription(currentSubscription)
      setPayments(paymentHistory.payments)

      const statusFromApi = verificationRes?.data?.verificationStatus || profileRes?.verificationStatus
      if (statusFromApi) {
        setVerificationStatus(statusFromApi)
      } else if (verificationRes?.data?.exists || profileRes) {
        setVerificationStatus('VERIFIED')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Auto-sync payment on return from PayOS gateway
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const orderCodeParam = params.get('orderCode')
    const statusParam = params.get('status')
    const codeParam = params.get('code')
    const isCancelled = params.get('cancel') === 'true' || paymentResult === 'cancelled'

    if (isCancelled) {
      setNotice('Bạn đã rời trang thanh toán PayOS. Giao dịch chưa được hoàn tất.')
      setIsSuccessNotice(false)
      return
    }

    if (paymentResult === 'success' || statusParam === 'PAID' || codeParam === '00' || orderCodeParam) {
      const orderCode = orderCodeParam ? Number(orderCodeParam) : undefined
      setNotice('PayOS đã chuyển bạn về ứng dụng. Đang tự động kiểm tra và kích hoạt gói thành viên…')
      setIsSuccessNotice(false)
      setSyncingOrderId(orderCode || 1)

      syncMembershipPayment(orderCode)
        .then((res) => {
          if (res.status === 'PAID') {
            setNotice('🎉 Thanh toán thành công! Gói thành viên của bạn đã được kích hoạt thành công.')
            setIsSuccessNotice(true)
          } else if (res.status === 'CANCELLED') {
            setNotice('Giao dịch đã bị hủy trên cổng PayOS.')
            setIsSuccessNotice(false)
          } else {
            setNotice('Giao dịch đang chờ xác nhận từ ngân hàng.')
            setIsSuccessNotice(false)
          }
          void refresh()
        })
        .catch((err) => {
          setNotice(`Không thể đồng bộ tự động với PayOS: ${getErrorMessage(err)}. Vui lòng bấm "Kiểm tra lại".`)
          setIsSuccessNotice(false)
          void refresh()
        })
        .finally(() => {
          setSyncingOrderId(null)
        })
    }
  }, [paymentResult, refresh])

  const handleCheckout = async (plan: MembershipPlan) => {
    setCheckoutPlanId(plan.id)
    setError('')
    try {
      const checkout = await createMembershipCheckout(plan.id)
      window.location.assign(checkout.checkoutUrl)
    } catch (err) {
      setError(getErrorMessage(err))
      setCheckoutPlanId(null)
    }
  }

  const handleSyncPayment = async (orderCode?: number, simulateSuccess = false) => {
    if (orderCode) setSyncingOrderId(orderCode)
    setError('')
    try {
      const res = await syncMembershipPayment(orderCode, simulateSuccess)
      if (res.status === 'PAID') {
        setNotice('🎉 Thanh toán thành công! Gói thành viên đã được kích hoạt.')
        setIsSuccessNotice(true)
      } else {
        setNotice(`Trạng thái giao dịch từ PayOS: ${PAYMENT_STATUS[res.status] || res.status}`)
        setIsSuccessNotice(false)
      }
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (orderCode) setSyncingOrderId(null)
    }
  }

  const handleCancelPending = async () => {
    setCancellingPending(true)
    setError('')
    try {
      await cancelPendingMembershipCheckout()
      setNotice('Đã hủy các giao dịch chờ thanh toán. Bạn có thể chọn gói mới.')
      setIsSuccessNotice(false)
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCancellingPending(false)
    }
  }

  const activeSubscription =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date())

  const isVerified =
    Boolean(propIsVerified) ||
    verificationStatus === 'VERIFIED' ||
    verificationStatus === 'APPROVED'

  const pendingPayments = payments.filter((p) => p.status === 'PENDING')
  const latestPending = pendingPayments[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Onboarding steps for providers */}
      <div className="mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-black text-xs">
            ✓
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">1. Đăng ký tài khoản</p>
            <p className="text-[11px] text-muted-foreground">Tài khoản thợ đã sẵn sàng</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onGoToProfile) {
              onGoToProfile()
            } else if (typeof window !== 'undefined') {
              window.location.href = '/'
            }
          }}
          className="flex items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-full font-black text-xs ${
              isVerified
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-blue-500/10 text-blue-600'
            }`}
          >
            {isVerified ? '✓' : '2'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-foreground">2. Hồ sơ & Xác minh CCCD</p>
              {isVerified && (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600">
                  Đã xác minh
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isVerified
                ? 'Hồ sơ & CCCD đã được duyệt'
                : verificationStatus === 'UNDER_REVIEW'
                ? 'Đang xem xét duyệt CCCD'
                : verificationStatus === 'PENDING'
                ? 'Đang chờ duyệt'
                : 'Điền thông tin và giấy tờ hành nghề'}
            </p>
          </div>
        </button>

        <div
          className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 transition-colors sm:items-center ${
            activeSubscription
              ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
              : 'border-brand/20 bg-brand/[0.05]'
          }`}
        >
          <div
            className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full font-black text-sm shadow-sm sm:mt-0 ${
              activeSubscription
                ? 'bg-emerald-600 text-white'
                : 'bg-brand text-brand-foreground'
            }`}
          >
            {activeSubscription ? '✓' : '3'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Bước 3 <span className="px-1 text-border">/</span> Gói thành viên
              </p>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${
                  activeSubscription
                    ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-brand/10 text-brand'
                }`}
              >
                {activeSubscription && <CheckCircle2 className="size-3" />}
                {activeSubscription ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
              </span>
            </div>
            <p
              className={`mt-1 break-words text-sm font-extrabold leading-snug ${
                activeSubscription ? 'text-emerald-800 dark:text-emerald-300' : 'text-foreground'
              }`}
            >
              {activeSubscription ? (subscription?.plan?.name || 'Gói đang hoạt động') : 'Chọn gói thành viên'}
            </p>
            <p
              className={`mt-0.5 text-xs leading-relaxed ${
                activeSubscription
                  ? 'text-emerald-600/80 dark:text-emerald-400/80'
                  : 'text-muted-foreground'
              }`}
            >
              {activeSubscription
                ? 'Quyền nhận việc ưu tiên đã được kích hoạt'
                : 'Kích hoạt gói để nhận việc ưu tiên'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Dành cho thợ</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Gói thành viên</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Duy trì quyền nhận đơn và hiển thị ưu tiên tại khu vực của bạn. Khách hàng vẫn thanh toán tiền dịch vụ trực tiếp cho bạn sau khi hoàn thành công việc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {notice && (
        <div
          className={`mt-6 rounded-2xl border p-4 text-sm font-semibold transition-all ${
            isSuccessNotice
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-brand/20 bg-brand/5 text-foreground'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isSuccessNotice ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : syncingOrderId ? (
                <LoaderCircle className="size-5 shrink-0 animate-spin text-brand" />
              ) : null}
              <p>{notice}</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-extrabold text-brand hover:underline"
            >
              Kiểm tra lại
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{error}</p>
            {error.includes('pending') && (
              <button
                type="button"
                onClick={handleCancelPending}
                disabled={cancellingPending}
                className="rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground hover:opacity-90"
              >
                {cancellingPending ? 'Đang hủy...' : 'Hủy đơn chờ cũ để chọn lại'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending payment banner if exists */}
      {latestPending && !activeSubscription && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-extrabold text-amber-950 dark:text-amber-200">
                Bạn đang có đơn thanh toán chờ xử lý (Mã #{latestPending.orderCode} · {formatMembershipPrice(latestPending.amount)})
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-400">
                Nếu bạn đã chuyển khoản trên PayOS, hãy bấm &quot;Đồng bộ PayOS&quot; để hệ thống cập nhật kích hoạt gói ngay.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSyncPayment(latestPending.orderCode)}
                disabled={syncingOrderId === latestPending.orderCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-60"
              >
                {syncingOrderId === latestPending.orderCode ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Đồng bộ PayOS
              </button>
              {/* Dev simulation button */}
              <button
                type="button"
                title="Mô phỏng thanh toán thành công (Môi trường phát triển)"
                onClick={() => void handleSyncPayment(latestPending.orderCode, true)}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white/80 px-2.5 py-2 text-xs font-bold text-amber-900 hover:bg-white dark:bg-amber-900/40 dark:text-amber-200"
              >
                <Zap className="size-3 text-amber-600" />
                Giả lập PayOS trả về 00
              </button>
              <button
                type="button"
                onClick={handleCancelPending}
                disabled={cancellingPending}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-2 text-xs font-semibold hover:bg-muted"
              >
                <RotateCcw className="size-3" />
                Hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="size-7 animate-spin text-brand" />
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                  activeSubscription
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-brand/10 text-brand'
                }`}
              >
                {activeSubscription ? (
                  <BadgeCheck className="size-5" />
                ) : (
                  <CalendarClock className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-lg">Trạng thái gói thành viên</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      activeSubscription
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : subscription?.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {activeSubscription
                      ? 'ĐANG HOẠT ĐỘNG'
                      : subscription?.status === 'PENDING'
                      ? 'CHỜ KÍCH HOẠT'
                      : 'CHƯA ĐĂNG KÝ / HẾT HẠN'}
                  </span>
                </div>

                {subscription ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.plan?.name ?? 'Gói thành viên'} ·{' '}
                      {activeSubscription
                        ? 'Bạn đang hưởng đầy đủ đặc quyền nhận việc không giới hạn.'
                        : 'Vui lòng hoàn tất thanh toán để kích hoạt quyền nhận việc.'}
                    </p>
                    {subscription.currentPeriodEnd && (
                      <p className="mt-2 text-xs font-semibold text-foreground">
                        Thời hạn sử dụng đến:{' '}
                        <span className="font-extrabold text-brand">
                          {formatMembershipDate(subscription.currentPeriodEnd)}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bạn chưa có gói thành viên. Hãy chọn gói bên dưới để bắt đầu nhận đơn từ khách hàng.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-black">Chọn gói thành viên theo tháng</h2>
                <p className="text-xs text-muted-foreground">
                  Thanh toán qua cổng PayOS (hỗ trợ quét mã VietQR ngân hàng, Vietcombank, Techcombank, MB, Momo...)
                </p>
              </div>
            </div>

            {plans.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Hiện chưa có gói thành viên nào được mở bán.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrentPlan = activeSubscription && subscription?.plan?.id === plan.id
                  return (
                    <article
                      key={plan.id}
                      className={`flex flex-col rounded-3xl border bg-card p-5 shadow-sm transition-all ${
                        isCurrentPlan
                          ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-border hover:border-brand/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black">{plan.name}</h3>
                        {isCurrentPlan && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            Đang dùng
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-2xl font-black text-brand">
                        {formatMembershipPrice(plan.monthlyPrice)}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">/ tháng</p>

                      <ul className="my-5 flex-1 space-y-2.5">
                        {plan.benefits.map((benefit) => (
                          <li key={benefit} className="flex gap-2 text-sm text-muted-foreground">
                            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand" /> {benefit}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={checkoutPlanId !== null || isCurrentPlan}
                        onClick={() => void handleCheckout(plan)}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-md transition-all ${
                          isCurrentPlan
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-brand text-brand-foreground shadow-brand/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
                        }`}
                      >
                        {checkoutPlanId === plan.id ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : isCurrentPlan ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <CreditCard className="size-4" />
                        )}
                        {isCurrentPlan ? 'Gói hiện tại (Gia hạn thêm)' : 'Thanh toán với PayOS'}
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Lịch sử thanh toán</h2>
              <span className="text-xs text-muted-foreground">20 giao dịch gần nhất</span>
            </div>
            {payments.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Chưa có giao dịch membership nào.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <p className="font-bold">{payment.planName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mã đơn #{payment.orderCode} · {formatMembershipDate(payment.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-extrabold">{formatMembershipPrice(payment.amount)}</p>
                          <p
                            className={`mt-0.5 text-xs font-bold ${
                              payment.status === 'PAID'
                                ? 'text-emerald-600'
                                : payment.status === 'PENDING'
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {PAYMENT_STATUS[payment.status]}
                          </p>
                        </div>

                        {payment.status === 'PENDING' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleSyncPayment(payment.orderCode)}
                              disabled={syncingOrderId === payment.orderCode}
                              title="Kiểm tra trạng thái từ cổng PayOS"
                              className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-bold hover:bg-muted"
                            >
                              {syncingOrderId === payment.orderCode ? (
                                <LoaderCircle className="size-3 animate-spin" />
                              ) : (
                                'Đồng bộ PayOS'
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <p className="mt-6 text-xs text-muted-foreground">
            Thanh toán được xử lý trực tiếp qua cổng thanh toán bảo mật PayOS.{' '}
            <ExternalLink className="inline size-3" />{' '}
            <Link href="/" className="font-bold text-brand hover:underline">
              Về trang chủ nhận việc
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
