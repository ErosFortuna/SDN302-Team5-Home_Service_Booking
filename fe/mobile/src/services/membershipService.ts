import { apiRequest } from './apiClient';

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  currency: 'VND';
  billingPeriod: 'MONTH';
  benefits: string[];
}

export interface ProviderSubscription {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  plan: Pick<MembershipPlan, 'id' | 'name' | 'slug' | 'monthlyPrice' | 'benefits'> | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface MembershipPayment {
  id: string;
  planName: string;
  planVersion: number;
  amount: number;
  currency: 'VND';
  orderCode: number;
  paymentLinkId: string | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

function requireData<T>(data: T | undefined, resource: string): T {
  if (data === undefined) {
    throw new Error(`Máy chủ không trả về dữ liệu ${resource}.`);
  }
  return data;
}

export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const response = await apiRequest<MembershipPlan[]>('/membership/plans');
  return requireData(response.data, 'gói thành viên');
}

export async function getMySubscription(): Promise<ProviderSubscription | null> {
  const response = await apiRequest<ProviderSubscription | null>('/provider/subscription/me');
  return requireData(response.data, 'gói đăng ký');
}

export async function getMyMembershipPayments(): Promise<MembershipPayment[]> {
  const response = await apiRequest<MembershipPayment[]>('/provider/subscription/payments?page=1&limit=20');
  return requireData(response.data, 'lịch sử thanh toán');
}

export async function createMembershipCheckout(planId: string) {
  const response = await apiRequest<{
    paymentId: string;
    orderCode: number;
    amount: number;
    currency: 'VND';
    status: 'PENDING';
    checkoutUrl: string;
    expiresAt: string;
  }>('/provider/subscription/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
  const checkout = requireData(response.data, 'thanh toán');
  if (!checkout.checkoutUrl.startsWith('https://')) {
    throw new Error('Liên kết thanh toán PayOS không hợp lệ.');
  }
  return checkout;
}

export const formatMembershipPrice = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatMembershipDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';
