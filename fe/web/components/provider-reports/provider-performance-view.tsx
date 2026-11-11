'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarRange, Clock3, RefreshCw, Wallet } from 'lucide-react'
import { formatVND } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/client'
import { providerReportsApi, type ProviderPerformanceReport } from '@/lib/api/provider-reports'
import { cn } from '@/lib/utils'

type RevenuePeriod = 'day' | 'week' | 'month'
type RequestPeriod = 'day' | 'week'

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayPeriod(period: string, granularity: RevenuePeriod | RequestPeriod) {
  if (granularity === 'week') return period.replace('-W', ' · Tuần ')
  if (granularity === 'month') {
    const [year, month] = period.split('-')
    return `Tháng ${month}/${year}`
  }
  const [, month, day] = period.split('-')
  return `${day}/${month}`
}

function StatCard({ title, value, hint, icon: Icon }: { title: string; value: string; hint: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-bold">{title}</span>
        <Icon className="size-4 text-brand" />
      </div>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      <span className="mt-2 block text-[11px] text-muted-foreground">{hint}</span>
    </div>
  )
}

export function ProviderPerformanceView() {
  const today = useMemo(() => new Date(), [])
  const [startDate, setStartDate] = useState(() => toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(() => toDateInput(today))
  const [granularity, setGranularity] = useState<RevenuePeriod>('day')
  const [requestGranularity, setRequestGranularity] = useState<RequestPeriod>('day')
  const [report, setReport] = useState<ProviderPerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    providerReportsApi.performance({ startDate, endDate, granularity, requestGranularity }, controller.signal)
      .then((response) => setReport(response.data))
      .catch((cause: unknown) => {
        if (!(cause instanceof Error) || cause.name !== 'AbortError') setError(getErrorMessage(cause))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [startDate, endDate, granularity, requestGranularity])

  const maxRevenue = Math.max(1, ...(report?.revenueSeries.map((item) => item.revenue) ?? []))
  const maxRequests = Math.max(1, ...(report?.requestSeries.map((item) => item.bookingCount) ?? []))
  const averageResponse = report?.summary.averageResponseMinutes
  const responseText = averageResponse == null
    ? 'Chưa có phản hồi'
    : averageResponse < 60
      ? `${Math.round(averageResponse)} phút`
      : `${(averageResponse / 60).toFixed(1)} giờ`

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand"><BarChart3 className="size-5" /><span className="text-xs font-black uppercase tracking-wide">Hiệu quả hoạt động</span></div>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Doanh thu & phản hồi</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Doanh thu được tính từ giá thực tế của các booking đã hoàn tất trong khoảng thời gian đã chọn.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
          <label className="text-xs font-bold text-muted-foreground">Từ ngày<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="text-xs font-bold text-muted-foreground">Đến ngày<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
        </div>
      </div>

      {error && <div role="alert" className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><span>{error}</span><button className="inline-flex items-center gap-1 font-bold" onClick={() => setEndDate(toDateInput(new Date()))}><RefreshCw className="size-4" /> Tải lại</button></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Doanh thu thực tế" value={loading ? 'Đang tải…' : formatVND(report?.summary.totalRevenue ?? 0)} hint="Từ finalPrice của booking hoàn tất" icon={Wallet} />
        <StatCard title="Booking hoàn tất" value={loading ? '…' : String(report?.summary.completedBookings ?? 0)} hint="Có ghi nhận giá cuối cùng" icon={CalendarRange} />
        <StatCard title="Tỷ lệ phản hồi" value={loading ? '…' : `${report?.summary.responseRate ?? 0}%`} hint={`${report?.summary.respondedRequests ?? 0} / ${report?.summary.totalRequests ?? 0} booking đã phản hồi`} icon={BarChart3} />
        <StatCard title="Thời gian phản hồi TB" value={loading ? 'Đang tải…' : responseText} hint="Từ lúc nhận booking đến xác nhận hoặc từ chối" icon={Clock3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h3 className="font-black">Doanh thu theo thời gian</h3><p className="mt-1 text-xs text-muted-foreground">Nhóm theo ngày hoàn tất booking</p></div>
            <div className="flex rounded-xl bg-muted/60 p-1">{(['day', 'week', 'month'] as const).map((period) => <button key={period} onClick={() => setGranularity(period)} className={cn('rounded-lg px-3 py-1.5 text-xs font-bold', granularity === period ? 'bg-card text-brand shadow-xs' : 'text-muted-foreground')}>{period === 'day' ? 'Ngày' : period === 'week' ? 'Tuần' : 'Tháng'}</button>)}</div>
          </div>
          {loading ? <div className="mt-8 h-48 animate-pulse rounded-2xl bg-muted" /> : report?.revenueSeries.length ? <div className="mt-6 flex h-56 items-end gap-2 overflow-x-auto border-b border-border pb-2">{report.revenueSeries.map((item) => <div key={item.period} className="group flex min-w-8 flex-1 flex-col items-center justify-end gap-2" title={`${displayPeriod(item.period, granularity)}: ${formatVND(item.revenue)}`}><span className="hidden whitespace-nowrap text-[10px] font-bold text-muted-foreground group-hover:block">{formatVND(item.revenue)}</span><div className="w-full max-w-12 rounded-t-lg bg-brand transition-all group-hover:bg-cta" style={{ height: `${Math.max(4, (item.revenue / maxRevenue) * 165)}px` }} /><span className="whitespace-nowrap text-[10px] text-muted-foreground">{displayPeriod(item.period, granularity)}</span></div>)}</div> : <EmptyChart label="Chưa có doanh thu trong khoảng thời gian này" />}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h3 className="font-black">Tỷ lệ có booking</h3><p className="mt-1 text-xs text-muted-foreground">Số booking nhận được và tỷ trọng theo kỳ</p></div>
            <div className="flex rounded-xl bg-muted/60 p-1">{(['day', 'week'] as const).map((period) => <button key={period} onClick={() => setRequestGranularity(period)} className={cn('rounded-lg px-3 py-1.5 text-xs font-bold', requestGranularity === period ? 'bg-card text-brand shadow-xs' : 'text-muted-foreground')}>{period === 'day' ? 'Theo ngày' : 'Theo tuần'}</button>)}</div>
          </div>
          {loading ? <div className="mt-8 h-48 animate-pulse rounded-2xl bg-muted" /> : report?.requestSeries.length ? <div className="mt-6 space-y-3">{report.requestSeries.map((item) => <div key={item.period}><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="font-semibold">{displayPeriod(item.period, requestGranularity)}</span><span className="text-muted-foreground">{item.bookingCount} booking · {item.sharePercent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-cta transition-all" style={{ width: `${Math.max(item.bookingCount ? 2 : 0, (item.bookingCount / maxRequests) * 100)}%` }} /></div></div>)}</div> : <EmptyChart label="Chưa có booking trong khoảng thời gian này" />}
        </div>
      </div>
    </section>
  )
}

function EmptyChart({ label }: { label: string }) {
  return <div className="mt-6 flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-center"><BarChart3 className="size-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold text-muted-foreground">{label}</p></div>
}
