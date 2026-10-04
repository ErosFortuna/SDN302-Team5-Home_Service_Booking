'use client'

import { useState } from 'react'
import { X, Send, Wallet } from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { CtaButton } from '../shared'

const ARRIVAL_OPTIONS = [
  'Today, ASAP',
  'Today, afternoon',
  'Tomorrow morning',
  'Tomorrow afternoon',
]

export function QuoteSubmit() {
  const { quoteRequestId, closeQuoteSubmit, jobRequests, submitProviderQuote } =
    useApp()

  const request = jobRequests.find((r) => r.id === quoteRequestId)
  const [labor, setLabor] = useState(250000)
  const [material, setMaterial] = useState(120000)
  const [arrival, setArrival] = useState(ARRIVAL_OPTIONS[0])

  // reset when a new request opens
  const [openedId, setOpenedId] = useState<string | null>(null)
  if (quoteRequestId && quoteRequestId !== openedId) {
    setOpenedId(quoteRequestId)
    setLabor(250000)
    setMaterial(120000)
    setArrival(ARRIVAL_OPTIONS[0])
  }

  if (!quoteRequestId || !request) return null

  const total = labor + material

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeQuoteSubmit}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-md flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h2 className="text-base font-extrabold">Send a Quote</h2>
            <p className="text-xs text-muted-foreground">{request.title}</p>
          </div>
          <button
            onClick={closeQuoteSubmit}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-3">
          <MoneyField
            label="Labor fee"
            value={labor}
            onChange={setLabor}
            step={50000}
          />
          <MoneyField
            label="Material fee"
            value={material}
            onChange={setMaterial}
            step={20000}
          />

          <div>
            <label className="mb-2 block text-sm font-bold">Arrival time</label>
            <div className="grid grid-cols-2 gap-2">
              {ARRIVAL_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => setArrival(a)}
                  className={
                    'rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ' +
                    (arrival === a
                      ? 'border-brand bg-secondary text-brand'
                      : 'border-border bg-card')
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary-foreground">
              <Wallet className="size-4" />
              Total quote
            </span>
            <span className="text-xl font-extrabold text-brand">
              {formatVND(total)}
            </span>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <CtaButton
            onClick={() =>
              submitProviderQuote(request.id, {
                laborFee: labor,
                materialFee: material,
                arrival,
              })
            }
            className="w-full py-3"
          >
            <Send className="size-4" />
            Submit Quote
          </CtaButton>
        </div>
      </div>
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-muted-foreground transition-colors hover:bg-muted"
        >
          −
        </button>
        <div className="flex-1 rounded-xl border border-border bg-card py-2.5 text-center text-sm font-bold">
          {formatVND(value)}
        </div>
        <button
          onClick={() => onChange(value + step)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-muted-foreground transition-colors hover:bg-muted"
        >
          +
        </button>
      </div>
    </div>
  )
}
