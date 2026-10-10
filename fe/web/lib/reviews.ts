import type { Review } from './types'
import { PROVIDERS } from './data'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api'

const DEFAULT_REVIEWS: Record<string, Review[]> = {
  p1: [
    { id: 'r_p1_1', customerName: 'Lan Anh', rating: 5, comment: 'Dọn nhà rất sạch sẽ, nhân viên chu đáo và đúng giờ.', createdAt: '2 ngày trước' },
    { id: 'r_p1_2', customerName: 'Minh', rating: 4, comment: 'Nhân viên làm việc cẩn thận, giá hợp lý.', createdAt: '1 tuần trước' },
  ],
  p2: [
    { id: 'r_p2_1', customerName: 'Tùng', rating: 5, comment: 'Sửa điện nhanh, giải thích rõ ràng và an toàn.', createdAt: '3 ngày trước' },
  ],
  p3: [
    { id: 'r_p3_1', customerName: 'Hương', rating: 4, comment: 'Ống nước được sửa xong, thợ nhiệt tình.', createdAt: '5 ngày trước' },
    { id: 'r_p3_2', customerName: 'Doanh', rating: 5, comment: 'Hài lòng với chất lượng và thái độ làm việc.', createdAt: '2 tuần trước' },
  ],
  p4: [
    { id: 'r_p4_1', customerName: 'Bảo', rating: 5, comment: 'Máy lạnh hoạt động tốt sau khi vệ sinh.', createdAt: '1 ngày trước' },
    { id: 'r_p4_2', customerName: 'Trúc', rating: 4, comment: 'Thợ đến đúng hẹn, tư vấn rõ ràng.', createdAt: '6 ngày trước' },
  ],
  p5: [
    { id: 'r_p5_1', customerName: 'Duy', rating: 4, comment: 'Sơn đẹp, tuy nhiên thời gian hoàn thành hơi dài.', createdAt: '1 tháng trước' },
  ],
}

function normalizeReview(raw: Partial<Review> & { customer?: { fullName?: string } | string; createdAt?: string }): Review {
  const customerName =
    typeof raw.customer === 'string'
      ? raw.customer
      : raw.customer?.fullName || raw.customerName || 'Khách hàng'

  return {
    id: String(raw.id ?? `${raw.providerId ?? 'review'}-${Date.now()}`),
    providerId: raw.providerId ?? 'unknown',
    customerName,
    rating: Number(raw.rating ?? 5),
    comment: raw.comment ?? 'Dịch vụ rất tốt.',
    createdAt: raw.createdAt ?? 'Vừa xong',
  }
}

export async function fetchProviderReviews(providerId: string) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/providers/${providerId}/reviews?page=1&limit=20`,
      { cache: 'no-store' },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    if (json?.success && Array.isArray(json?.data?.reviews)) {
      const reviews = json.data.reviews.map((item: any) => normalizeReview({ ...item, providerId }))
      return {
        reviews,
        averageRating: Number(json.data.averageRating ?? 0),
        reviewCount: Number(json.data.reviewCount ?? reviews.length),
      }
    }
  } catch (error) {
    // Ignore and fallback to local mock data when backend is not ready.
  }

  const providerReviews = DEFAULT_REVIEWS[providerId] ?? [
    { id: `${providerId}-default`, providerId, customerName: 'Khách hàng', rating: 5, comment: 'Dịch vụ tốt, đáng tin cậy.', createdAt: 'Vừa xong' },
  ]

  const total = providerReviews.reduce((sum, review) => sum + review.rating, 0)
  const averageRating = providerReviews.length ? total / providerReviews.length : 0

  return {
    reviews: providerReviews,
    averageRating,
    reviewCount: providerReviews.length,
  }
}

export async function submitReviewToBackend({
  bookingId,
  rating,
  comment,
}: {
  bookingId: string
  rating: number
  comment: string
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN ?? ''}`,
      },
      body: JSON.stringify({ rating, comment }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.message ?? 'Review API request failed')
    }

    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function getProviderReviewSnapshot(providerId: string) {
  const provider = PROVIDERS.find((item) => item.id === providerId)
  const reviews = DEFAULT_REVIEWS[providerId] ?? []
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  const averageRating = reviews.length ? total / reviews.length : provider?.rating ?? 0
  const reviewCount = reviews.length > 0 ? reviews.length : provider?.reviews ?? 0

  return {
    averageRating,
    reviewCount,
    reviews,
  }
}
