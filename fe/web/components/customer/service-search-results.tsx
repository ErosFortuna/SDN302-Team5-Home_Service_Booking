'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useApp } from '../app-store'
import type { ServiceItem } from '@/lib/types'

interface ServiceSearchFilters {
  keyword: string
  categoryId: string
  minPrice: string
  maxPrice: string
  pricingType: string
  sortBy: string
  sortOrder: string
  page: number
}

interface ServiceSearchResponse {
  success: boolean
  data: ServiceItem[]
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

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

function formatPrice(service: ServiceItem) {
  if (service.pricingType === 'QUOTE_REQUIRED') return 'Báo giá theo yêu cầu'
  const amount = `${service.basePrice.toLocaleString('vi-VN')} đ`
  return service.pricingType === 'FROM' ? `Từ ${amount}` : amount
}

export function ServiceSearchResults() {
  const {
    serviceCategories,
    serviceSearchKeyword,
    serviceSearchCategoryId,
    setCustomerTab,
  } = useApp()
  const [keyword, setKeyword] = useState(serviceSearchKeyword)
  const [categoryId, setCategoryId] = useState(serviceSearchCategoryId)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [pricingType, setPricingType] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filters, setFilters] = useState<ServiceSearchFilters>({
    keyword: serviceSearchKeyword,
    categoryId: serviceSearchCategoryId,
    minPrice: '',
    maxPrice: '',
    pricingType: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
  })
  const [services, setServices] = useState<ServiceItem[]>([])
  const [pagination, setPagination] = useState<ServiceSearchResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: '9',
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
    if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim())
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.pricingType) params.set('pricingType', filters.pricingType)

    setLoading(true)
    setError('')
    fetch(`${API_BASE_URL}/services?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as ServiceSearchResponse
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Không thể tải danh sách dịch vụ.')
        }
        setServices(result.data)
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
  }, [filters])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilters({
      keyword: keyword.trim(),
      categoryId,
      minPrice,
      maxPrice,
      pricingType,
      sortBy,
      sortOrder,
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

      <div className="mb-6">
        <p className="text-sm font-bold text-brand">DỊCH VỤ TẠI NHÀ</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Kết quả tìm kiếm</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pagination ? `${pagination.totalItems} dịch vụ phù hợp` : 'Tìm dịch vụ phù hợp với nhu cầu của bạn'}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <form
          onSubmit={applyFilters}
          className="rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24"
        >
          <div className="mb-5 flex items-center gap-2 font-bold">
            <SlidersHorizontal className="size-4 text-brand" />
            Tìm kiếm & bộ lọc
          </div>

          <label className="mb-4 block text-sm font-semibold">
            Từ khóa
            <span className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                maxLength={100}
                placeholder="Ví dụ: vệ sinh máy lạnh"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>

          <label className="mb-4 block text-sm font-semibold">
            Danh mục
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Tất cả danh mục</option>
              {serviceCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <fieldset className="mb-4">
            <legend className="mb-1.5 text-sm font-semibold">Khoảng giá (đ)</legend>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Từ"
                aria-label="Giá thấp nhất"
                className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Đến"
                aria-label="Giá cao nhất"
                className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </fieldset>

          <label className="mb-4 block text-sm font-semibold">
            Hình thức giá
            <select
              value={pricingType}
              onChange={(event) => setPricingType(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Tất cả hình thức</option>
              <option value="FIXED">Giá cố định</option>
              <option value="FROM">Giá từ</option>
              <option value="QUOTE_REQUIRED">Cần báo giá</option>
            </select>
          </label>

          <label className="mb-5 block text-sm font-semibold">
            Sắp xếp theo
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(event) => {
                const [nextSortBy, nextSortOrder] = event.target.value.split(':')
                setSortBy(nextSortBy)
                setSortOrder(nextSortOrder)
              }}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="createdAt:desc">Mới nhất</option>
              <option value="basePrice:asc">Giá thấp đến cao</option>
              <option value="basePrice:desc">Giá cao đến thấp</option>
              <option value="name:asc">Tên A đến Z</option>
            </select>
          </label>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-brand px-4 text-sm font-bold text-brand-foreground transition hover:brightness-105"
          >
            Áp dụng bộ lọc
          </button>
        </form>

        <div className="min-w-0">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải dịch vụ">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-card px-6 py-12 text-center">
              <p className="font-bold">Không tải được kết quả</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current }))}
                className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
              >
                Thử lại
              </button>
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
              <Search className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-bold">Chưa tìm thấy dịch vụ phù hợp</h2>
              <p className="mt-2 text-sm text-muted-foreground">Thử đổi từ khóa hoặc nới rộng bộ lọc.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <article key={service.id} className="flex min-h-52 flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <span className="max-w-[75%] truncate rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                        {service.category?.name || 'Dịch vụ'}
                      </span>
                      <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Đang hoạt động" />
                    </div>
                    <h2 className="text-base font-extrabold">{service.name}</h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {service.description || 'Dịch vụ chuyên nghiệp tại nhà.'}
                    </p>
                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
                      <p className="text-sm font-extrabold text-brand">{formatPrice(service)}</p>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {service.estimatedDurationMinutes} phút
                      </span>
                    </div>
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
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!pagination.hasNextPage}
                      onClick={() => goToPage(pagination.page + 1)}
                      aria-label="Trang sau"
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
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