'use client'

import { Package, Trash2, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MATERIAL_APPROVAL_META, formatVND } from '@/lib/booking-status'
import type { BookingMaterial } from '@/lib/api/bookings'
import { Card } from './ui'

interface Props {
  materials: BookingMaterial[]
  canRemove: boolean
  pendingAction: string | null
  onRemove: (materialId: string) => void
}

export function MaterialsTable({ materials, canRemove, pendingAction, onRemove }: Props) {
  return (
    <Card
      title="Vật tư & chi phí phát sinh"
      icon={<Package className="size-4" />}
      action={<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{materials.length} mục</span>}
    >
      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-8 text-center">
          <Package className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-muted-foreground">Chưa có vật tư hay chi phí phát sinh</p>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 pb-2 font-bold">Hạng mục</th>
                <th className="px-2 pb-2 text-right font-bold">SL</th>
                <th className="px-2 pb-2 text-right font-bold">Đơn giá</th>
                <th className="px-2 pb-2 text-right font-bold">Thành tiền</th>
                <th className="px-2 pb-2 font-bold">Trạng thái</th>
                {canRemove && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materials.map((m) => {
                const meta = MATERIAL_APPROVAL_META[m.approvalStatus]
                const removing = pendingAction === `materials:remove:${m.id}`
                return (
                  <tr key={m.id} className={cn('transition-opacity', m.approvalStatus === 'REJECTED' && 'opacity-60')}>
                    <td className="px-2 py-2.5 font-semibold">{m.name}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{m.quantity}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{formatVND(m.price)}</td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums">{formatVND(m.lineTotal ?? m.quantity * m.price)}</td>
                    <td className="px-2 py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', meta.badge)}>{meta.label}</span>
                    </td>
                    {canRemove && (
                      <td className="px-1 py-2.5 text-right">
                        {m.approvalStatus === 'PENDING' && (
                          <button
                            onClick={() => onRemove(m.id)}
                            disabled={pendingAction !== null}
                            aria-label={`Xóa ${m.name}`}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          >
                            {removing ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
