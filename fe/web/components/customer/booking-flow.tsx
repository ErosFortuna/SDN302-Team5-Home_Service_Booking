'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ImagePlus,
  Check,
  ChevronLeft,
  Wallet,
  Loader2,
} from 'lucide-react'
import { useApp } from '../app-store'
import { formatVND } from '@/lib/data'
import { CategoryIcon, CtaButton, BrandButton } from '../shared'
import type { ServiceCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { uploadRequestImages } from '@/lib/api/service-requests'

const TIME_SLOTS = ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM']
const DATES = [
  { label: 'Today', sub: 'Sep 23' },
  { label: 'Tomorrow', sub: 'Sep 24' },
  { label: 'Fri', sub: 'Sep 25' },
  { label: 'Sat', sub: 'Sep 26' },
]
const STEPS = ['Service', 'Schedule', 'Details', 'Review']

export function BookingFlow() {
  const {
    bookingFlowOpen,
    closeBookingFlow,
    presetCategory,
    presetService,
    submitBooking,
    serviceCategories,
    serviceCategoriesLoading,
    serviceCategoriesError,
    isLoggedIn,
    openAuthModal,
  } = useApp()

  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<ServiceCategory>(presetCategory ?? '')
  const [title, setTitle] = useState(presetService?.name ?? '')
  const [description, setDescription] = useState(presetService?.description ?? '')
  const [dateIdx, setDateIdx] = useState(0)
  const [time, setTime] = useState(TIME_SLOTS[1])
  const [address, setAddress] = useState('12 Nguyen Hue, District 1, HCMC')
  const [photos, setPhotos] = useState(0)
  const [attachments, setAttachments] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [budget, setBudget] = useState(500000)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset when opening
  const [wasOpen, setWasOpen] = useState(false)
  if (bookingFlowOpen && !wasOpen) {
    setWasOpen(true)
    setStep(0)
    setCategory(presetCategory ?? '')
    setTitle(presetService?.name ?? '')
    setDescription(presetService?.description ?? '')
    setDateIdx(0)
    setTime(TIME_SLOTS[1])
    setPhotos(0)
    setAttachments([])
    setIsUploadingImages(false)
    setBudget(500000)
    setIsSubmitting(false)
    setSubmitError(null)
  }
  if (!bookingFlowOpen && wasOpen) setWasOpen(false)

  useEffect(() => {
    if (
      serviceCategories.length > 0 &&
      !serviceCategories.some((item) => item.name === category)
    ) {
      setCategory(serviceCategories[0].name)
    }
  }, [category, serviceCategories])

  if (!bookingFlowOpen) return null

  const canNext =
    step === 0
      ? category.length > 0 && title.trim().length > 0
      : step === 1
        ? !!time
        : true

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remaining = 5 - attachments.length
    if (remaining <= 0) return

    const filesToUpload = Array.from(files).slice(0, remaining)
    setIsUploadingImages(true)
    setSubmitError(null)

    try {
      const urls = await uploadRequestImages(filesToUpload)
      setAttachments((prev) => [...prev, ...urls].slice(0, 5))
      setPhotos((p) => Math.min(5, p + urls.length))
    } catch (err: any) {
      setSubmitError(err.message || 'Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.')
    } finally {
      setIsUploadingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setPhotos((p) => Math.max(0, p - 1))
  }

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      closeBookingFlow()
      openAuthModal('login')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await submitBooking({
        category,
        title: title.trim() || `${category} service`,
        description: description.trim(),
        date: `${DATES[dateIdx].sub}, 2026`,
        time,
        address,
        budget,
        photos: attachments.length,
        attachments,
      })
    } catch (err: any) {
      setSubmitError(err.message || 'Không thể tạo yêu cầu dịch vụ. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
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
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {serviceCategories.map((c) => (
                    <button
                      key={c.id}
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
                  {serviceCategories.length === 0 && (
                    <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                      {serviceCategoriesLoading
                        ? 'Loading categories...'
                        : serviceCategoriesError || 'No active categories available.'}
                    </p>
                  )}
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
                  Ảnh đính kèm sự cố{' '}
                  <span className="font-normal text-muted-foreground">
                    (tối đa 5 ảnh qua Cloudinary)
                  </span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="grid grid-cols-4 gap-2">
                  {attachments.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Attachment ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {attachments.length < 5 && (
                    <button
                      type="button"
                      disabled={isUploadingImages}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      {isUploadingImages ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-brand" />
                          <span className="text-[10px] font-semibold text-brand">Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-5" />
                          <span className="text-[10px] font-semibold">Thêm ảnh</span>
                        </>
                      )}
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
                {attachments.length} ảnh đính kèm
              </ReviewRow>
              {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {attachments.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="size-14 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              )}
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
          {submitError && (
            <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive">
              {submitError}
            </div>
          )}
          {step < 3 ? (
            <BrandButton
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="w-full py-3"
            >
              Continue
            </BrandButton>
          ) : (
            <CtaButton
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3"
            >
              <Check className="size-4" />
              {isSubmitting ? 'Đang gửi yêu cầu...' : 'Submit Request'}
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
