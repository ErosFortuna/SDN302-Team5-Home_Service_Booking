'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import { useApp } from '../app-store'

interface ProviderSearchItem {
  providerId: string
  fullName: string
  businessName: string
  avatarUrl?: string | null
  averageRating: number
  reviewCount: number
  completedJobCount: number
  yearsOfExperience: number
  skills: string[]
  city?: string | null
  serviceAreas: string[]
  distanceKm?: number | null
}

interface ProviderSearchResponse {
  success: boolean
  data: ProviderSearchItem[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  message?: string
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5173/api'
).replace(/\/$/, '')

export function ProviderSearchResults() {
  const {
    accessToken,
    serviceCategories,
    serviceSearchKeyword,
    serviceSearchCategoryId,
    setCustomerTab,
    openProviderProfile,
    openAuthModal,
  } = useApp()
  const [keyword, setKeyword] = useState(serviceSearchKeyword)
  const [categoryId, setCategoryId] = useState(serviceSearchCategoryId)
  const [city, setCity] = useState('')
  const [minRating, setMinRating] = useState('')
  const [filters, setFilters] = useState({
    keyword: serviceSearchKeyword,
    categoryId: serviceSearchCategoryId,
    city: '',
    minRating: '',
    page: 1,
  })
  const [providers, setProviders] = useState<ProviderSearchItem[]>([])
  const [pagination, setPagination] = useState<ProviderSearchResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) {
      setProviders([])
      setPagination(null)
      setLoading(false)
      setError('Vui lòng đăng nhập để tìm thợ dịch vụ đã xác minh.')
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: '12',
    })
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.city) params.set('city', filters.city)
    if (filters.minRating) params.set('minRating', filters.minRating)

    setLoading(true)
    setError('')
    fetch(`${API_BASE_URL}/providers/search?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as ProviderSearchResponse
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || 'Không thể tải danh sách thợ.')
        }
        setProviders(result.data)
        setPagination(result.pagination)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Không thể kết nối tới máy chủ.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [accessToken, filters])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilters({
      keyword: keyword.trim(),
      categoryId,
      city: city.trim(),
      minRating,
      page: 1,
    })
  }

  const goToPage = (page: number) => setFilters((current) => ({ ...current, page }))

  return (
    <section className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setCustomerTab('home')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" />
        Quay lại trang chủ
      </button>

      <div className="mb-7 rounded-3xl bg-gradient-to-br from-brand/10 via-background to-emerald-500/10 p-6 sm:p-8">
        <p className="text-sm font-bold text-brand">ĐỐI TÁC ĐÃ XÁC MINH</p>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">Tìm thợ phù hợp</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Xem kinh nghiệm, khu vực phục vụ và đánh giá thực tế trước khi mở hồ sơ hoặc đặt dịch vụ.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form
          onSubmit={applyFilters}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24"
        >
          <div className="mb-5 flex items-center gap-2 font-bold">
            <SlidersHorizontal className="size-4 text-brand" />
            Tìm kiếm & bộ lọc
          </div>

          <label className="mb-4 block text-sm font-semibold">
            Tên thợ hoặc khu vực
            <span className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                maxLength={100}
                placeholder="Tên thợ, nghề, khu vực"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>

          <label className="mb-4 block text-sm font-semibold">
            Nghề / danh mục
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Tất cả ngành nghề</option>
              {serviceCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="mb-4 block text-sm font-semibold">
            Thành phố hoặc quận
            <span className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={100}
                placeholder="Ví dụ: Đà Nẵng"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>

          <label className="mb-5 block text-sm font-semibold">
            Đánh giá tối thiểu
            <select
              value={minRating}
              onChange={(event) => setMinRating(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Tất cả mức đánh giá</option>
              <option value="4">Từ 4 sao</option>
              <option value="4.5">Từ 4.5 sao</option>
            </select>
          </label>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-brand px-4 text-sm font-bold text-brand-foreground transition hover:brightness-105"
          >
            Tìm thợ
          </button>
        </form>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Thợ dịch vụ</h2>
              <p className="text-sm text-muted-foreground">
                {pagination ? `${pagination.totalItems} thợ phù hợp` : 'Danh sách thợ đã được xác minh'}
              </p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:inline-flex">
              <ShieldCheck className="size-4" />
              Hồ sơ đã xác minh
            </span>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center">
              <p className="font-bold">Không tải được danh sách thợ</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              {!accessToken ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
                >
                  Đăng nhập
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current }))}
                  className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
                >
                  Thử lại
                </button>
              )}
            </div>
          ) : providers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-bold">Chưa tìm thấy thợ phù hợp</h2>
              <p className="mt-2 text-sm text-muted-foreground">Thử đổi từ khóa, ngành nghề hoặc khu vực.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {providers.map((provider) => (
                  <article
                    key={provider.providerId}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {provider.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={provider.avatarUrl}
                          alt=""
                          className="size-16 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-lg font-black text-brand">
                          {(provider.businessName || provider.fullName).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-extrabold">{provider.businessName || provider.fullName}</h3>
                          <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Đã xác minh" />
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{provider.fullName}</p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {provider.city || provider.serviceAreas?.[0] || 'Chưa cập nhật khu vực'}
                          {provider.distanceKm != null && ` · ${provider.distanceKm.toFixed(1)} km`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center">
                      <div>
                        <p className="flex items-center justify-center gap-1 font-extrabold">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {provider.averageRating.toFixed(1)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{provider.reviewCount} đánh giá</p>
                      </div>
                      <div>
                        <p className="font-extrabold">{provider.completedJobCount}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">đơn hoàn thành</p>
                      </div>
                      <div>
                        <p className="flex items-center justify-center gap-1 font-extrabold">
                          <BriefcaseBusiness className="size-3.5 text-brand" />
                          {provider.yearsOfExperience}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">năm kinh nghiệm</p>
                      </div>
                    </div>

                    {provider.serviceAreas?.length > 0 && (
                      <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">
                        Khu vực: {provider.serviceAreas.join(', ')}
                      </p>
                    )}
                    {provider.skills?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {provider.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => openProviderProfile(provider.providerId)}
                      className="mt-4 h-10 rounded-lg border border-brand/30 text-sm font-bold text-brand transition hover:bg-brand/5"
                    >
                      Xem hồ sơ & dịch vụ
                    </button>
                  </article>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {pagination.page} / {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => goToPage(pagination.page - 1)}
                      aria-label="Trang trước"
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-card disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!pagination.hasNextPage}
                      onClick={() => goToPage(pagination.page + 1)}
                      aria-label="Trang sau"
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-card disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
