'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, ListChecks, RotateCw } from 'lucide-react'
import { useApp } from '../app-store'
import type { ServiceItem } from '@/lib/types'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

interface ServiceDetailResponse {
  success: boolean
  data?: ServiceItem
  message?: string
}

function formatServicePrice(service: ServiceItem) {
  if (service.pricingType === 'QUOTE_REQUIRED') return 'Báo giá theo yêu cầu'
  const amount = `${service.basePrice.toLocaleString('vi-VN')} đ`
  return service.pricingType === 'FROM' ? `Từ ${amount}` : amount
}

export function ServiceDetailScreen() {
  const { selectedServiceId, setCustomerTab, openBookingFlow } = useApp()
  const [service, setService] = useState<ServiceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!selectedServiceId) {
      setError('Không tìm thấy dịch vụ cần xem.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`${API_BASE_URL}/services/${selectedServiceId}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as ServiceDetailResponse
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || 'Không thể tải thông tin dịch vụ.')
        }
        setService(result.data)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Không thể kết nối tới máy chủ.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [selectedServiceId, reloadKey])

  return (
    <section className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setCustomerTab('search')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách dịch vụ
      </button>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-label="Đang tải dịch vụ">
          <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card px-6 py-12 text-center">
          <h1 className="font-bold">Không tải được dịch vụ</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
          >
            <RotateCw className="size-4" />
            Thử lại
          </button>
        </div>
      ) : service ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-brand">{service.category?.name || 'DỊCH VỤ TẠI NHÀ'}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{service.name}</h1>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {service.description || 'Dịch vụ chuyên nghiệp, thực hiện tại nhà theo lịch hẹn của bạn.'}
            </p>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-4 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Clock3 className="size-4 text-brand" />
                Ước tính {service.estimatedDurationMinutes} phút
              </span>
              <span className="font-extrabold text-brand">{formatServicePrice(service)}</span>
            </div>

            {service.requirements && service.requirements.length > 0 && (
              <div className="mt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <ListChecks className="size-4 text-brand" />
                  Thông tin cần chuẩn bị
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {service.requirements.map((requirement, index) => (
                    <li key={`${requirement}-${index}`} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          <aside className="rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-semibold text-muted-foreground">Giá dịch vụ</p>
            <p className="mt-1 text-xl font-black text-brand">{formatServicePrice(service)}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Thời lượng dự kiến: {service.estimatedDurationMinutes} phút
            </p>
            <button
              type="button"
              onClick={() => openBookingFlow(service.category?.name, service)}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 text-sm font-bold text-cta-foreground transition hover:brightness-105"
            >
              Đặt dịch vụ
              <ArrowRight className="size-4" />
            </button>
          </aside>
        </div>
      ) : null}
    </section>
  )
}