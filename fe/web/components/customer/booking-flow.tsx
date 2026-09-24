'use client'

import { useState } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ImagePlus,
  Check,
  ChevronLeft,
  Wallet,
} from 'lucide-react'
import { useApp } from '../app-store'
import { CATEGORIES, formatVND } from '@/lib/data'
import { CategoryIcon, CtaButton, BrandButton } from '../shared'
import type { ServiceCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const TIME_SLOTS = ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM']
const DATES = [
  { label: 'Today', sub: 'Sep 23' },
  { label: 'Tomorrow', sub: 'Sep 24' },
  { label: 'Fri', sub: 'Sep 25' },
  { label: 'Sat', sub: 'Sep 26' },
]
const STEPS = ['Service', 'Schedule', 'Details', 'Review']

export function BookingFlow() {
  const { bookingFlowOpen, closeBookingFlow, presetCategory, submitBooking } =
    useApp()

  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<ServiceCategory>(
    presetCategory ?? 'Cleaning',
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateIdx, setDateIdx] = useState(0)
  const [time, setTime] = useState(TIME_SLOTS[1])
  const [address, setAddress] = useState('12 Nguyen Hue, District 1, HCMC')
  const [photos, setPhotos] = useState(0)
  const [budget, setBudget] = useState(500000)

  // Reset when opening
  const [wasOpen, setWasOpen] = useState(false)
  if (bookingFlowOpen && !wasOpen) {
    setWasOpen(true)
    setStep(0)
    setCategory(presetCategory ?? 'Cleaning')
    setTitle('')
    setDescription('')
    setDateIdx(0)
    setTime(TIME_SLOTS[1])
    setPhotos(0)
    setBudget(500000)
  }
  if (!bookingFlowOpen && wasOpen) setWasOpen(false)

  if (!bookingFlowOpen) return null

  const canNext =
    step === 0 ? title.trim().length > 0 : step === 1 ? !!time : true

  const handleSubmit = () => {
    submitBooking({
      category,
      title: title.trim() || `${category} service`,
      description: description.trim(),
      date: `${DATES[dateIdx].sub}, 2026`,
      time,
      address,
      budget,
      photos,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Close"
        onClick={closeBookingFlow}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-xl max-h-[90vh] flex-col rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <div className="size-8" />
          )}
          <div className="mx-auto -mt-1 h-1 w-10 rounded-full bg-border" />
          <button
            onClick={closeBookingFlow}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col gap-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  i <= step ? 'bg-brand' : 'bg-muted',
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-semibold',
                  i <= step ? 'text-brand' : 'text-muted-foreground',
                )}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {step === 0 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Select a service
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setCategory(c.name)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all',
                        category === c.name
                          ? 'border-brand bg-secondary'
                          : 'border-border bg-card hover:border-brand/40',
                      )}
                    >
                      <CategoryIcon category={c.name} className="size-9" />
                      <span className="text-[11px] font-semibold">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  What do you need?
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fix leaking kitchen sink"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Describe the problem
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add details so pros can give accurate quotes..."
                  className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Calendar className="size-4 text-brand" />
                  Select a date
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DATES.map((d, i) => (
                    <button
                      key={d.sub}
                      onClick={() => setDateIdx(i)}
                      className={cn(
                        'flex flex-col items-center rounded-xl border py-2.5 transition-all',
                        dateIdx === i
                          ? 'border-brand bg-secondary text-brand'
                          : 'border-border bg-card',
                      )}
                    >
                      <span className="text-xs font-bold">{d.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Clock className="size-4 text-brand" />
                  Preferred time
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(
                        'rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                        time === t
                          ? 'border-brand bg-secondary text-brand'
                          : 'border-border bg-card',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <MapPin className="size-4 text-brand" />
                  Service address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
                  <MapPin className="mr-1.5 size-4 text-brand" />
                  Map preview
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4 py-1">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Add photos{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: photos }).map((_, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-teal-400/40 to-sky-400/40"
                    >
                      <button
                        onClick={() => setPhotos((p) => p - 1)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {photos < 4 && (
                    <button
                      onClick={() => setPhotos((p) => p + 1)}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                    >
                      <ImagePlus className="size-5" />
                      <span className="text-[10px] font-semibold">Add</span>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                  <Wallet className="size-4 text-brand" />
                  Estimated budget
                </label>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-center text-2xl font-extrabold text-brand">
                    {formatVND(budget)}
                  </p>
                  <input
                    type="range"
                    min={100000}
                    max={2000000}
                    step={50000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="mt-3 w-full accent-[var(--brand)]"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>100k ₫</span>
                    <span>2,000k ₫</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <CategoryIcon category={category} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {title || `${category} service`}
                  </p>
                  <p className="text-xs text-muted-foreground">{category}</p>
                </div>
              </div>
              <ReviewRow icon={Calendar} label="When">
                {DATES[dateIdx].sub}, 2026 · {time}
              </ReviewRow>
              <ReviewRow icon={MapPin} label="Where">
                {address}
              </ReviewRow>
              <ReviewRow icon={ImagePlus} label="Photos">
                {photos} attached
              </ReviewRow>
              <ReviewRow icon={Wallet} label="Budget">
                {formatVND(budget)}
              </ReviewRow>
              {description && (
                <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {step < 3 ? (
            <BrandButton
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-3"
            >
              Continue
            </BrandButton>
          ) : (
            <CtaButton onClick={handleSubmit} className="w-full py-3">
              <Check className="size-4" />
              Submit Request
            </CtaButton>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <Icon className="size-4 shrink-0 text-brand" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="ml-auto text-right text-xs font-semibold">
        {children}
      </span>
    </div>
  )
}
