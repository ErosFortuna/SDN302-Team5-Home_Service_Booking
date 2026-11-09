'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  providerProfileApi,
  type PublicProviderProfile,
  type ReviewItem,
  type RatingSummary,
  type ReviewFilterQuery,
} from '@/lib/api/provider-profile'
import { ApiError } from '@/lib/api/client'

export function useProviderProfile(providerId: string) {
  const [profile, setProfile] = useState<PublicProviderProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Review states (UC-15)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(5)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null)

  // Fetch Public Profile
  const fetchProfile = useCallback(
    async (signal?: AbortSignal) => {
      if (!providerId) return
      setLoadingProfile(true)
      setProfileError(null)

      try {
        const data = await providerProfileApi.getPublicProfile(providerId, signal)
        setProfile(data)
        if (data.ratings) {
          setRatingSummary(data.ratings)
        }
      } catch (err: unknown) {
        if (signal?.aborted) return
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Không thể tải hồ sơ thợ dịch vụ.'
        setProfileError(message)
      } finally {
        if (!signal?.aborted) {
          setLoadingProfile(false)
        }
      }
    },
    [providerId]
  )

  // Fetch Reviews with filters & pagination
  const fetchReviews = useCallback(
    async (targetPage: number = page, signal?: AbortSignal) => {
      if (!providerId) return
      setLoadingReviews(true)
      setReviewsError(null)

      try {
        const query: ReviewFilterQuery = {
          page: targetPage,
          limit,
          rating: ratingFilter,
          sortBy,
        }
        const data = await providerProfileApi.getProviderReviews(providerId, query, signal)
        setReviews(data.reviews)
        setPagination(data.pagination)
        if (data.summary) {
          setRatingSummary(data.summary)
        }
      } catch (err: unknown) {
        if (signal?.aborted) return
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Không thể tải danh sách đánh giá.'
        setReviewsError(message)
      } finally {
        if (!signal?.aborted) {
          setLoadingReviews(false)
        }
      }
    },
    [providerId, page, limit, ratingFilter, sortBy]
  )

  // Initial load
  useEffect(() => {
    const controller = new AbortController()
    fetchProfile(controller.signal)
    return () => controller.abort()
  }, [fetchProfile])

  // Reload reviews when filters or page changes
  useEffect(() => {
    const controller = new AbortController()
    fetchReviews(page, controller.signal)
    return () => controller.abort()
  }, [fetchReviews, page])

  // Change rating filter resets page to 1
  const handleRatingFilterChange = (filter: number | 'all') => {
    setRatingFilter(filter)
    setPage(1)
  }

  // Change sort option resets page to 1
  const handleSortChange = (newSort: 'newest' | 'highest' | 'lowest') => {
    setSortBy(newSort)
    setPage(1)
  }

  return {
    profile,
    loadingProfile,
    profileError,
    reloadProfile: fetchProfile,

    // Reviews (UC-15)
    reviews,
    loadingReviews,
    reviewsError,
    ratingFilter,
    setRatingFilter: handleRatingFilterChange,
    sortBy,
    setSortBy: handleSortChange,
    page,
    setPage,
    pagination,
    ratingSummary,
    reloadReviews: () => fetchReviews(page),
  }
}

