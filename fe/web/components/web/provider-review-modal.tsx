'use client'

import { useEffect, useState } from 'react'
import { MapPin, ShieldCheck, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProvider } from '@/lib/data'
import { fetchProviderReviews } from '@/lib/reviews'
import { cn } from '@/lib/utils'
import { useApp } from '../app-store'
import type { Review } from '@/lib/types'

export function ProviderReviewModal() {
  const { providerReviewId, closeProviderReview } = useApp()
  const provider = providerReviewId ? getProvider(providerReviewId) : null
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!providerReviewId) return

    let active = true
    setLoading(true)

    fetchProviderReviews(providerReviewId)
      .then((payload) => {
        if (!active) return
        setReviews(payload.reviews)
        setAverageRating(payload.averageRating)
        setReviewCount(payload.reviewCount)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [providerReviewId])

  if (!providerReviewId || !provider) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div aria-label="Close provider review dialog" className="absolute inset-0" onClick={closeProviderReview} />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-sm font-black text-secondary-foreground">
              {provider.avatar}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-black text-foreground">{provider.name}</h3>
                {provider.verified && <ShieldCheck className="size-4 text-brand" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{provider.tagline}</p>
            </div>
          </div>

          <button
            onClick={closeProviderReview}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Close provider review"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Đánh giá</p>
                <div className="mt-2 flex items-center gap-2 text-2xl font-black text-foreground">
                  <Star className="size-5 fill-amber-400 text-amber-400" />
                  {averageRating.toFixed(1)}
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tổng lượt</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{reviewCount}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-brand" />
              {provider.distanceKm} km · {provider.category}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <h4 className="text-sm font-black text-foreground">Nhận xét gần đây</h4>

            {loading && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Đang tải đánh giá...
              </div>
            )}

            {!loading && reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Chưa có đánh giá nào cho thợ này.
              </div>
            )}

            {!loading && reviews.length > 0 && reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{review.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">{review.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={`${review.id}-${index}`}
                        className={cn(
                          'size-3.5',
                          index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">“{review.comment}”</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card px-5 py-3">
          <Button onClick={closeProviderReview} className="w-full rounded-xl bg-brand font-bold text-brand-foreground">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
