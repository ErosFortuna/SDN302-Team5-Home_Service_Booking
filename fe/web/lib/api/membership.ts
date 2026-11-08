import { apiRequest } from '@/lib/api/client'

export interface MembershipPlan {
  id: string
  name: string
  slug: string
  monthlyPrice: number
  currency: 'VND'
  billingPeriod: 'MONTH'
  benefits: string[]
}

export interface ProviderSubscription {
  id: string
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  plan: Pick<MembershipPlan, 'id' | 'name' | 'slug' | 'monthlyPrice' | 'benefits'> | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
}

export interface MembershipPayment {
  id: string
  planName: string
  planVersion: number
  amount: number
  currency: 'VND'
  orderCode: number
  paymentLinkId: string | null
  checkoutUrl?: string | null
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
  paidAt: string | null
  expiresAt: string
  createdAt: string
}

interface PaymentPage {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

function requireData<T>(data: T | undefined, resource: string): T {
  if (data === undefined) {
    throw new Error(`Máy chủ không trả về dữ liệu ${resource}.`)
  }
  return data
}

export async function getMembershipPlans() {
  const response = await apiRequest<MembershipPlan[]>('/membership/plans')
  return requireData(response.data, 'gói thành viên')
}

export async function getMySubscription() {
  const response = await apiRequest<ProviderSubscription | null>('/provider/subscription/me')
  return requireData(response.data, 'gói đăng ký')
}

export async function getMyMembershipPayments() {
  const response = await apiRequest<MembershipPayment[]>('/provider/subscription/payments?page=1&limit=20')
  return {
    payments: requireData(response.data, 'lịch sử thanh toán'),
    pagination: response.pagination as PaymentPage | undefined,
  }
}

export async function createMembershipCheckout(planId: string) {
  const response = await apiRequest<{
    paymentId: string
    orderCode: number
    amount: number
    currency: 'VND'
    status: 'PENDING'
    checkoutUrl: string
    expiresAt: string
  }>('/provider/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  })
  const checkout = requireData(response.data, 'thanh toán')
  if (!checkout.checkoutUrl.startsWith('https://')) {
    throw new Error('Liên kết thanh toán PayOS không hợp lệ.')
  }
  return checkout
}

export async function syncMembershipPayment(orderCode?: number, simulateSuccess?: boolean) {
  const response = await apiRequest<{
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
    alreadyApplied: boolean
    orderCode: number
    subscription?: ProviderSubscription
  }>('/provider/subscription/sync', {
    method: 'POST',
    body: JSON.stringify({
      ...(orderCode ? { orderCode } : {}),
      ...(simulateSuccess ? { simulateSuccess: true } : {}),
    }),
  })
  return requireData(response.data, 'kết quả đồng bộ thanh toán')
}

export async function cancelPendingMembershipCheckout() {
  const response = await apiRequest<{ success: boolean; message: string }>(
    '/provider/subscription/cancel-pending',
    {
      method: 'POST',
    },
  )
  return response
}

export const formatMembershipPrice = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatMembershipDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
    : '—'
