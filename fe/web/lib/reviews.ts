import type { Review } from './types'
import { getStoredToken } from './api/client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5000/api'

function normalizeReview(raw: {
  id?: string
  _id?: string
  providerId?: string
  customer?: { fullName?: string } | string
  customerName?: string
  rating?: number
  comment?: string
  createdAt?: string
}): Review {
  const customerName =
    typeof raw.customer === 'string'
      ? raw.customer
      : raw.customer?.fullName || raw.customerName || 'Khách hàng'

  return {
    id: String(raw.id || raw._id || `${raw.providerId ?? 'review'}-${Date.now()}`),
    providerId: raw.providerId ?? 'unknown',
    customerName,
    rating: Number(raw.rating ?? 5),
    comment: raw.comment ?? '',
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
      const reviews = json.data.reviews.map((item: any) =>
        normalizeReview({ ...item, providerId }),
      )
      return {
        reviews,
        averageRating: Number(json.data.averageRating ?? 0),
        reviewCount: Number(json.data.reviewCount ?? reviews.length),
      }
    }
  } catch (error) {
    console.warn(`Could not load reviews for provider ${providerId}:`, error)
  }

  return {
    reviews: [] as Review[],
    averageRating: 0,
    reviewCount: 0,
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
    const token = getStoredToken()
    if (!token) {
      return {
        success: false,
        message: 'Vui lòng đăng nhập để gửi đánh giá.',
      }
    }

    const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getProviderReviewSnapshot(_providerId: string) {
  return {
    averageRating: 0,
    reviewCount: 0,
    reviews: [] as Review[],
  }
}
