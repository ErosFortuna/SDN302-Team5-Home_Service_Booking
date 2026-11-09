'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, MessageSquareReply, Star } from 'lucide-react'
import {
  providerProfileApi,
  type PaginatedReviewsData,
  type ReviewItem,
} from '@/lib/api/provider-profile'
import { getErrorMessage } from '@/lib/api/client'

const PAGE_SIZE = 10

export function ProviderReviewsView({ providerId }: { providerId: string }) {
  const [result, setResult] = useState<PaginatedReviewsData | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadReviews = useCallback(async (signal?: AbortSignal) => {
    setError('')
    try {
      const data = await providerProfileApi.getProviderReviews(
        providerId,
        { page, limit: PAGE_SIZE, sortBy: 'newest' },
        signal,
      )
      setResult(data)
      setDrafts((current) => {
        const next = { ...current }
        data.reviews.forEach((review) => {
          if (!(review.id in next)) next[review.id] = review.response ?? ''
        })
        return next
      })
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') return
      setError(getErrorMessage(loadError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, providerId])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void loadReviews(controller.signal)
    return () => controller.abort()
  }, [loadReviews])

  const submitResponse = async (event: FormEvent<HTMLFormElement>, review: ReviewItem) => {
    event.preventDefault()
    const response = (drafts[review.id] ?? '').trim()
    if (!response || savingReviewId) return

    setSavingReviewId(review.id)
    setError('')
    try {
      await providerProfileApi.respondToReview(review.id, response)
      setResult((current) => current && ({
        ...current,
        reviews: current.reviews.map((item) =>
          item.id === review.id ? { ...item, response } : item,
        ),
      }))
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSavingReviewId(null)
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Phản hồi khách hàng</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Đánh giá của tôi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cảm ơn khách hàng và phản hồi trực tiếp về trải nghiệm dịch vụ.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {(result?.summary.average ?? 0).toFixed(1)}
            <span className="font-medium text-muted-foreground">/ 5</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {result?.summary.total ?? 0} đánh giá
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải đánh giá...
        </div>
      ) : result?.reviews.length ? (
        <div className="space-y-4">
          {result.reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{review.customer.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.serviceName || 'Dịch vụ'} · {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                  <Star className="size-3.5 fill-current" />
                  {review.rating}/5
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/85">
                {review.comment || 'Khách hàng không để lại nhận xét.'}
              </p>

              {review.response && (
                <div className="mt-4 rounded-xl border border-brand/15 bg-brand/5 p-3.5">
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-bold text-brand">
                    <MessageSquareReply className="size-3.5" />
                    Phản hồi của bạn
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/80">{review.response}</p>
                </div>
              )}

              <form onSubmit={(event) => void submitResponse(event, review)} className="mt-4 border-t border-border pt-4">
                <label htmlFor={`review-response-${review.id}`} className="mb-2 block text-sm font-bold">
                  {review.response ? 'Chỉnh sửa phản hồi' : 'Viết phản hồi'}
                </label>
                <textarea
                  id={`review-response-${review.id}`}
                  value={drafts[review.id] ?? ''}
                  onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                  maxLength={2000}
                  rows={3}
                  placeholder="Viết lời cảm ơn hoặc phản hồi tới khách hàng..."
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/30"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {(drafts[review.id] ?? '').length}/2000 ký tự
                  </span>
                  <button
                    type="submit"
                    disabled={!drafts[review.id]?.trim() || savingReviewId !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquareReply className="size-4" />
                    {savingReviewId === review.id ? 'Đang gửi...' : review.response ? 'Cập nhật phản hồi' : 'Gửi phản hồi'}
                  </button>
                </div>
              </form>
            </article>
          ))}

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Trang {result.pagination.page}/{result.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={!result.pagination.hasPrev}
                aria-label="Trang trước"
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!result.pagination.hasNext}
                aria-label="Trang sau"
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Star className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-bold">Chưa có đánh giá</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Đánh giá của khách sẽ xuất hiện tại đây sau khi hoàn thành dịch vụ.
          </p>
        </div>
      )}
    </section>
  )
}
