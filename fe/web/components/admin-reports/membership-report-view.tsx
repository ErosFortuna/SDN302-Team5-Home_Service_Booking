'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { reportsApi, type MembershipPaymentReport } from '@/lib/api/reports'
import { getErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type DatePreset = '7d' | '30d' | 'thisMonth' | 'custom'

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrencyVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

const PAYMENT_STATUS_LABEL: Record<MembershipPaymentReport['transactions'][number]['status'], string> = {
  PENDING: 'Đang chờ',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  FAILED: 'Thất bại',
}

export function MembershipReportView() {
  const today = new Date()
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [startDate, setStartDate] = useState(
    formatDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000))
  )
  const [endDate, setEndDate] = useState(formatDate(today))
  const [page, setPage] = useState(1)
  const [reloadCount, setReloadCount] = useState(0)
  const [report, setReport] = useState<MembershipPaymentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    reportsApi.getMembershipTransactions(
      { startDate, endDate, page, limit: 10 },
      controller.signal
    ).then((response) => {
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải giao dịch thành viên.')
      }
      setReport(response.data)
    }).catch((requestError) => {
      if ((requestError as Error).name !== 'AbortError') {
        setError(getErrorMessage(requestError))
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [startDate, endDate, page, reloadCount])

  const applyPreset = (nextPreset: Exclude<DatePreset, 'custom'>) => {
    const now = new Date()
    const end = formatDate(now)
    const start = nextPreset === 'thisMonth'
      ? formatDate(new Date(now.getFullYear(), now.getMonth(), 1))
      : formatDate(new Date(now.getTime() - (nextPreset === '7d' ? 6 : 29) * 24 * 60 * 60 * 1000))
    setPreset(nextPreset)
    setStartDate(start)
    setEndDate(end)
    setPage(1)
  }

  const exportCsv = () => {
    const transactions = report?.transactions || []
    if (transactions.length === 0) return
    const headers = ['Mã giao dịch', 'Nhà cung cấp', 'Email', 'Gói thành viên', 'Số tiền (VND)', 'Trạng thái', 'Ngày tạo', 'Ngày thanh toán']
    const rows = transactions.map((item) => [
      item.orderCode,
      `"${item.providerName.replaceAll('"', '""')}"`,
      `"${item.providerEmail.replaceAll('"', '""')}"`,
      `"${item.planName.replaceAll('"', '""')}"`,
      item.amount,
      PAYMENT_STATUS_LABEL[item.status],
      item.createdAt,
      item.paidAt || '',
    ])
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `giao-dich-thanh-vien-${startDate}-den-${endDate}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const transactions = report?.transactions || []
  const series = report?.timeSeries || []
  const maxAmount = Math.max(1, ...series.map((item) => item.amount))

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <BarChart3 className="size-4" /> GIAO DỊCH THÀNH VIÊN PROVIDER
            </span>
            <h2 className="mt-3 text-3xl font-black">Thống kê đăng ký thành viên</h2>
            <p className="mt-2 text-sm text-slate-300">
              Tổng hợp giao dịch mua gói thành viên của nhà cung cấp; doanh thu chỉ tính giao dịch đã thanh toán.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} disabled={transactions.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50">
              <Download className="size-4" /> Xuất CSV
            </button>
            <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} /> Làm mới
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
          {([
            ['7d', '7 ngày qua'],
            ['30d', '30 ngày qua'],
            ['thisMonth', 'Tháng này'],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => applyPreset(key)} className={cn('rounded-xl px-3 py-2 text-xs font-bold', preset === key ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20')}>
              {label}
            </button>
          ))}
          <input aria-label="Từ ngày" type="date" value={startDate} onChange={(event) => {
            setPreset('custom')
            setPage(1)
            setStartDate(event.target.value)
          }} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white" />
          <span className="text-xs text-slate-400">đến</span>
          <input aria-label="Đến ngày" type="date" value={endDate} onChange={(event) => {
            setPreset('custom')
            setPage(1)
            setEndDate(event.target.value)
          }} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white" />
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

      {loading && !report ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Đang tải thống kê giao dịch...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Tổng tiền đã thu</p>
              <p className="mt-2 text-2xl font-black text-emerald-600">{formatCurrencyVND(report?.summary.paidAmount || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Chỉ tính giao dịch thành công</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Giao dịch thành công</p>
              <p className="mt-2 text-2xl font-black text-indigo-600">{report?.summary.paidTransactions || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Đã thanh toán gói thành viên</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Tổng giao dịch</p>
              <p className="mt-2 text-2xl font-black">{report?.summary.totalTransactions || 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Bao gồm mọi trạng thái thanh toán</p>
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">Tiền đăng ký thành viên đã thu theo ngày</h3>
            {series.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Chưa có giao dịch thành công trong giai đoạn này.</p>
            ) : (
              <div className="mt-5 flex h-56 items-end gap-3 overflow-x-auto border-b border-border px-2">
                {series.map((item) => (
                  <div key={item.period} className="group relative flex h-full min-w-10 flex-1 flex-col items-center justify-end">
                    <div className="pointer-events-none absolute -top-14 z-10 rounded-lg bg-slate-900 p-2 text-[10px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                      {item.period}: {formatCurrencyVND(item.amount)} ({item.transactionCount})
                    </div>
                    <div style={{ height: `${Math.max(6, item.amount / maxAmount * 100)}%` }} className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400" />
                    <span className="my-2 text-[10px] text-muted-foreground">{item.period.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <div>
                <h3 className="font-bold">Lịch sử giao dịch thành viên</h3>
                <p className="text-xs text-muted-foreground">Lọc theo ngày tạo giao dịch</p>
              </div>
              <span className="text-xs text-muted-foreground">{report?.pagination.total || 0} giao dịch</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Mã giao dịch</th>
                    <th className="px-5 py-3">Nhà cung cấp</th>
                    <th className="px-5 py-3">Gói thành viên</th>
                    <th className="px-5 py-3 text-right">Số tiền</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-5 py-3 font-semibold">{transaction.orderCode}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{transaction.providerName}</p>
                        <p className="text-xs text-muted-foreground">{transaction.providerEmail || transaction.providerPhone}</p>
                      </td>
                      <td className="px-5 py-3">{transaction.planName}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatCurrencyVND(transaction.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', transaction.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                          {transaction.status === 'PAID' && <CheckCircle2 className="size-3.5" />}
                          {PAYMENT_STATUS_LABEL[transaction.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transaction.createdAt))}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Không có giao dịch trong khoảng thời gian này.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border p-4">
              <button type="button" aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span className="text-xs text-muted-foreground">Trang {report?.pagination.page || 1} / {report?.pagination.totalPages || 1}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= (report?.pagination.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
