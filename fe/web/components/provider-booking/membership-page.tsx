'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, CalendarClock, CreditCard, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import {
  createMembershipCheckout,
  formatMembershipDate,
  formatMembershipPrice,
  getMembershipPlans,
  getMyMembershipPayments,
  getMySubscription,
  type MembershipPayment,
  type MembershipPlan,
  type ProviderSubscription,
} from '@/lib/api/membership'
import { getErrorMessage } from '@/lib/api/client'

type MembershipPageProps = {
  paymentResult?: 'success' | 'cancelled'
}

const PAYMENT_STATUS: Record<MembershipPayment['status'], string> = {
  PENDING: 'Đang chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  FAILED: 'Thất bại',
}

export function MembershipPage({ paymentResult }: MembershipPageProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subscription, setSubscription] = useState<ProviderSubscription | null>(null)
  const [payments, setPayments] = useState<MembershipPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [availablePlans, currentSubscription, paymentHistory] = await Promise.all([
        getMembershipPlans(),
        getMySubscription(),
        getMyMembershipPayments(),
      ])
      setPlans(availablePlans)
      setSubscription(currentSubscription)
      setPayments(paymentHistory.payments)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (paymentResult === 'cancelled') {
      setNotice('Bạn đã rời trang thanh toán. Gói thành viên chưa được kích hoạt.')
    } else if (paymentResult === 'success') {
      setNotice('PayOS đã chuyển bạn về ứng dụng. Đang kiểm tra trạng thái thanh toán từ máy chủ…')
    }
  }, [paymentResult])

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

  const activeSubscription =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date())

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Dành cho thợ</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Gói thành viên</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Duy trì quyền sử dụng nền tảng theo tháng. Khách hàng vẫn thanh toán tiền dịch vụ trực tiếp cho bạn.
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
        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm font-semibold text-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{notice}</p>
            <button type="button" onClick={() => void refresh()} className="font-extrabold text-brand hover:underline">
              Kiểm tra lại
            </button>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="size-7 animate-spin text-brand" /></div>
      ) : (
        <>
          <section className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                {activeSubscription ? <BadgeCheck className="size-5" /> : <CalendarClock className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-black">Trạng thái hiện tại</h2>
                {subscription ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.plan?.name ?? 'Gói thành viên'} ·{' '}
                      {activeSubscription ? 'Đang hoạt động' : subscription.status === 'PENDING' ? 'Chưa kích hoạt' : 'Đã hết hạn'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Thời hạn đến {formatMembershipDate(subscription.currentPeriodEnd)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Bạn chưa có gói thành viên.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-black">Chọn gói theo tháng</h2>
            {plans.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Hiện chưa có gói thành viên nào được mở bán.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => (
                  <article key={plan.id} className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <h3 className="text-lg font-black">{plan.name}</h3>
                    <p className="mt-3 text-2xl font-black text-brand">{formatMembershipPrice(plan.monthlyPrice)}</p>
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
                      disabled={checkoutPlanId !== null}
                      onClick={() => void handleCheckout(plan)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkoutPlanId === plan.id ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                      Thanh toán với PayOS
                    </button>
                  </article>
                ))}
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
                Chưa có giao dịch membership.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-bold">{payment.planName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mã đơn {payment.orderCode} · {formatMembershipDate(payment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold">{formatMembershipPrice(payment.amount)}</p>
                        <p className={`mt-1 text-xs font-bold ${payment.status === 'PAID' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {PAYMENT_STATUS[payment.status]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <p className="mt-6 text-xs text-muted-foreground">
            Thanh toán được xử lý an toàn qua PayOS. <ExternalLink className="inline size-3" />{' '}
            <Link href="/provider/bookings" className="font-bold text-brand hover:underline">Quay lại công việc</Link>
          </p>
        </>
      )}
    </div>
  )
}
