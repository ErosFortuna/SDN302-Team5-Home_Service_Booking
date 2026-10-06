'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, LoaderCircle, PackagePlus, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatVND } from '@/lib/booking-status'
import type { MaterialInput } from '@/lib/api/bookings'
import { Card } from './ui'

interface Row {
  key: number
  name: string
  quantity: string
  price: string
}

const PRESETS = [
  { name: 'Phí công phát sinh', price: 100000 },
  { name: 'Phí di chuyển thêm', price: 50000 },
]
const MAX_ROWS = 10

let rowSeq = 0
const emptyRow = (name = '', price = ''): Row => ({ key: ++rowSeq, name, quantity: '1', price })

function validateRow(row: Row): string | null {
  const qty = Number(row.quantity)
  const price = Number(row.price)
  if (!row.name.trim()) return 'Nhập tên vật tư'
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return 'Số lượng 1–1000'
  if (row.price === '' || !Number.isFinite(price) || price < 0) return 'Đơn giá không hợp lệ'
  return null
}

interface Props {
  submitting: boolean
  onSubmit: (items: MaterialInput[]) => Promise<boolean>
}

/** Only rendered while the booking is IN_PROGRESS. */
export function MaterialFeeForm({ submitting, onSubmit }: Props) {
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()])
  const [touched, setTouched] = useState(false)

  const errors = useMemo(() => rows.map(validateRow), [rows])
  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0)
  const hasErrors = errors.some(Boolean)

  const update = (key: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const addRow = (name?: string, price?: number) =>
    setRows((list) => {
      if (list.length >= MAX_ROWS) return list
      // Fill the single blank row instead of appending another one.
      if (name && list.length === 1 && !list[0].name && !list[0].price) return [emptyRow(name, String(price))]
      return [...list, emptyRow(name, price !== undefined ? String(price) : '')]
    })

  const removeRow = (key: number) => setRows((list) => (list.length === 1 ? [emptyRow()] : list.filter((r) => r.key !== key)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hasErrors) return

    const ok = await onSubmit(
      rows.map((r) => ({ name: r.name.trim(), quantity: Number(r.quantity), price: Number(r.price) })),
    )
    if (ok) {
      setRows([emptyRow()])
      setTouched(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20'

  return (
    <Card title="Thêm vật tư & chi phí phát sinh" icon={<PackagePlus className="size-4" />}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <Zap className="size-3" /> Thêm nhanh:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => addRow(p.name, p.price)}
              className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="hidden grid-cols-[1fr_80px_130px_36px] gap-2 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Tên vật tư / chi phí</span>
          <span>SL</span>
          <span>Đơn giá (VND)</span>
          <span />
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => {
            const err = touched ? errors[i] : null
            return (
              <div key={row.key}>
                <div className="grid grid-cols-[1fr_70px] gap-2 sm:grid-cols-[1fr_80px_130px_36px]">
                  <input
                    id={`material-name-${i}`}
                    aria-label="Tên vật tư"
                    value={row.name}
                    maxLength={120}
                    onChange={(e) => update(row.key, { name: e.target.value })}
                    placeholder="vd: Ống nước PVC Ø21"
                    className={cn(inputCls, err && !row.name.trim() ? 'border-destructive' : 'border-border')}
                  />
                  <input
                    id={`material-qty-${i}`}
                    aria-label="Số lượng"
                    type="number"
                    min={1}
                    max={1000}
                    value={row.quantity}
                    onChange={(e) => update(row.key, { quantity: e.target.value })}
                    className={cn(inputCls, 'border-border')}
                  />
                  <input
                    id={`material-price-${i}`}
                    aria-label="Đơn giá"
                    type="number"
                    min={0}
                    step={1000}
                    value={row.price}
                    onChange={(e) => update(row.key, { price: e.target.value })}
                    placeholder="0"
                    className={cn(inputCls, 'border-border')}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label="Xóa dòng"
                    className="flex items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {err && <p className="mt-1 px-1 text-[11px] font-semibold text-destructive">{err}</p>}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => addRow()}
          disabled={rows.length >= MAX_ROWS}
          className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-brand hover:underline disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Thêm dòng
        </button>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tạm tính: <span className="text-base font-black text-foreground">{formatVND(total)}</span>
          </p>
          <button
            id="submit-materials-button"
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ghi nhận chi phí
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Các hạng mục mới sẽ ở trạng thái <b>Chờ duyệt</b>. Hãy bấm &ldquo;Gửi chi phí phát sinh để duyệt&rdquo; để khách xác nhận.
        </p>
      </form>
    </Card>
  )
}
