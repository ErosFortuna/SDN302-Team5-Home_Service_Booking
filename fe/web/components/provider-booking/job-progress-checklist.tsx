'use client'

import { useState, useRef, useEffect } from 'react'
import {
  CircleCheck,
  Check,
  Navigation,
  MapPin,
  Wrench,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  X,
  TriangleAlert,
  Calendar,
  Clock,
  User,
  Phone,
  PartyPopper,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatVND } from '@/lib/utils'
import type { BookingStatus as BackendBookingStatus } from '@/lib/api/bookings'
import { uploadRequestImages } from '@/lib/api/service-requests'

export type ProcessStepKey =
  | 'CONFIRMED'
  | 'PROVIDER_ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export interface ProcessStepDef {
  key: ProcessStepKey
  stepNumber: number
  title: string
  subtitle: string
  actionLabel: string
  actionHint: string
  icon: LucideIcon
}

export const PROCESS_STEPS: ProcessStepDef[] = [
  {
    key: 'CONFIRMED',
    stepNumber: 1,
    title: 'Tiếp nhận đơn & Chốt lịch',
    subtitle: 'Xác nhận tiếp nhận yêu cầu từ khách hàng và chuẩn bị đồ nghề.',
    actionLabel: 'Nhận đơn (Xác nhận lịch)',
    actionHint: 'Đồng ý nhận việc theo lịch hẹn của khách hàng',
    icon: CircleCheck,
  },
  {
    key: 'PROVIDER_ON_THE_WAY',
    stepNumber: 2,
    title: 'Bắt đầu di chuyển',
    subtitle: 'Xuất phát đến địa chỉ khách hàng. Khách có thể thấy bạn đang đến.',
    actionLabel: '✓ Bắt đầu di chuyển',
    actionHint: 'Thông báo cho khách bạn đã khởi hành',
    icon: Navigation,
  },
  {
    key: 'ARRIVED',
    stepNumber: 3,
    title: 'Đã có mặt tại địa chỉ',
    subtitle: 'Có mặt tại nhà khách hàng, kiểm tra hiện trường & chuẩn bị thi công.',
    actionLabel: '✓ Đã đến nơi (Check-in)',
    actionHint: 'Xác nhận bạn đã tới địa chỉ làm việc',
    icon: MapPin,
  },
  {
    key: 'IN_PROGRESS',
    stepNumber: 4,
    title: 'Tiến hành thi công & Sửa chữa',
    subtitle: 'Bắt đầu sửa chữa, thay thế linh kiện hoặc thực hiện dịch vụ.',
    actionLabel: '✓ Bắt đầu thi công',
    actionHint: 'Bắt đầu tính thời gian thực hiện dịch vụ',
    icon: Wrench,
  },
  {
    key: 'COMPLETED',
    stepNumber: 5,
    title: 'Nghiệm thu & Hoàn thành',
    subtitle: 'Khách hàng kiểm tra chất lượng, nghiệm thu và kết thúc dịch vụ.',
    actionLabel: '✓ Hoàn tất & Nghiệm thu dịch vụ',
    actionHint: 'Chụp ảnh nghiệm thu, ghi chú và hoàn thành đơn hàng',
    icon: Sparkles,
  },
]

export function normalizeStatusToStep(rawStatus?: string | null): number {
  if (!rawStatus) return 0
  const upper = rawStatus.toUpperCase()
  if (upper === 'PENDING_CONFIRMATION' || upper === 'PENDING') return 0 // Before step 1 confirmed
  if (upper === 'CONFIRMED') return 1 // Step 1 done, next is step 2
  if (upper === 'PROVIDER_ON_THE_WAY' || upper === 'ON_THE_WAY') return 2 // Step 2 done, next is step 3
  if (upper === 'ARRIVED') return 3 // Step 3 done, next is step 4
  if (upper === 'IN_PROGRESS' || upper === 'AWAITING_APPROVAL') return 4 // Step 4 done, next is step 5
  if (upper === 'COMPLETED') return 5 // All 5 steps completed
  return 0
}

export interface StepProgressInfo {
  step: number
  percent: number
  badgeText: string
  isCompleted: boolean
  isCancelled: boolean
}

export function getStepProgressInfo(rawStatus?: string | null): StepProgressInfo {
  const upper = String(rawStatus || '').toUpperCase()
  if (upper === 'CANCELLED') {
    return {
      step: 0,
      percent: 0,
      badgeText: 'Đã hủy đơn',
      isCompleted: false,
      isCancelled: true,
    }
  }

  const step = normalizeStatusToStep(upper)
  switch (step) {
    case 5: // COMPLETED
      return {
        step: 5,
        percent: 100,
        badgeText: 'Hoàn thành 100%',
        isCompleted: true,
        isCancelled: false,
      }
    case 4: // IN_PROGRESS
      return {
        step: 4,
        percent: 85,
        badgeText: 'Bước 5/5: Nghiệm thu',
        isCompleted: false,
        isCancelled: false,
      }
    case 3: // ARRIVED
      return {
        step: 3,
        percent: 65,
        badgeText: 'Bước 4/5: Đang thi công',
        isCompleted: false,
        isCancelled: false,
      }
    case 2: // PROVIDER_ON_THE_WAY
      return {
        step: 2,
        percent: 45,
        badgeText: 'Bước 3/5: Có mặt tại nơi',
        isCompleted: false,
        isCancelled: false,
      }
    case 1: // CONFIRMED
      return {
        step: 1,
        percent: 25,
        badgeText: 'Bước 2/5: Bắt đầu di chuyển',
        isCompleted: false,
        isCancelled: false,
      }
    case 0: // PENDING_CONFIRMATION
    default:
      return {
        step: 0,
        percent: 10,
        badgeText: 'Bước 1/5: Chờ nhận việc',
        isCompleted: false,
        isCancelled: false,
      }
  }
}

export function getStepActionInfo(rawStatus?: string | null): { label: string; stepNumber: number } {
  const step = normalizeStatusToStep(rawStatus)
  switch (step) {
    case 0:
      return { label: 'Xác nhận nhận đơn', stepNumber: 1 }
    case 1:
      return { label: 'Bắt đầu di chuyển', stepNumber: 2 }
    case 2:
      return { label: 'Đã đến nơi (Check-in)', stepNumber: 3 }
    case 3:
      return { label: 'Bắt đầu thi công', stepNumber: 4 }
    case 4:
      return { label: 'Nghiệm thu hoàn tất', stepNumber: 5 }
    case 5:
    default:
      return { label: 'Xem chi tiết nghiệm thu', stepNumber: 5 }
  }
}

interface Props {
  jobId: string
  rawStatus?: string
  allowedTransitions?: string[]
  scheduledStartAt?: string
  scheduledEndAt?: string
  address?: string | Record<string, string>
  customerName?: string
  customerPhone?: string
  serviceName?: string
  categoryName?: string
  price?: number
  finalPrice?: number
  completionNote?: string
  proofPhotos?: string[]
  onConfirm?: () => Promise<boolean | void>
  onDecline?: (reasonCode: string, note?: string) => Promise<boolean | void>
  onUpdateStatus: (payload: {
    status: BackendBookingStatus
    note?: string
    confirmCompletion?: boolean
    photos?: string[]
    finalPrice?: number
  }) => Promise<boolean | void>
  isBusy?: boolean
  pendingAction?: string | null
  className?: string
}

export function JobProgressChecklist({
  jobId,
  rawStatus = 'PENDING_CONFIRMATION',
  allowedTransitions = [],
  scheduledStartAt,
  address,
  customerName,
  customerPhone,
  serviceName,
  price,
  finalPrice,
  completionNote,
  proofPhotos = [],
  onConfirm,
  onDecline,
  onUpdateStatus,
  isBusy = false,
  pendingAction = null,
  className,
}: Props) {
  const currentStep = normalizeStatusToStep(rawStatus)
  const isCancelled = rawStatus?.toUpperCase() === 'CANCELLED'
  const progressInfo = getStepProgressInfo(rawStatus)

  // Completion form states
  const [photos, setPhotos] = useState<string[]>(proofPhotos)
  const [note, setNote] = useState<string>(completionNote || '')
  const [finalPriceInput, setFinalPriceInput] = useState<string>(
    finalPrice != null ? String(finalPrice) : price != null ? String(price) : ''
  )

  useEffect(() => {
    if (proofPhotos && proofPhotos.length > 0) {
      setPhotos(proofPhotos)
    }
  }, [proofPhotos])

  useEffect(() => {
    if (completionNote) {
      setNote(completionNote)
    }
  }, [completionNote])

  useEffect(() => {
    if (finalPrice != null) {
      setFinalPriceInput(String(finalPrice))
    }
  }, [finalPrice])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setIsUploading(true)
    setUploadError(null)
    try {
      let urls: string[] = []
      try {
        urls = await uploadRequestImages(files)
      } catch {
        urls = files.map((f) => URL.createObjectURL(f))
      }
      setPhotos((prev) => [...prev, ...urls])
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Tải ảnh thất bại.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepAction = async (targetStepKey: ProcessStepKey) => {
    if (isBusy) return

    if (targetStepKey === 'COMPLETED') {
      const parsedPrice = finalPriceInput.trim() ? Number(finalPriceInput.trim()) : undefined
      await onUpdateStatus({
        status: 'COMPLETED',
        confirmCompletion: true,
        note: note.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        finalPrice: parsedPrice && Number.isSafeInteger(parsedPrice) ? parsedPrice : undefined,
      })
    } else {
      await onUpdateStatus({
        status: targetStepKey,
        photos: photos.length > 0 ? photos : undefined,
      })
    }
  }

  const progressPercent = Math.min(100, Math.round((currentStep / 5) * 100))

  return (
    <div className={cn('rounded-3xl border border-border bg-card p-5 shadow-xs space-y-6', className)}>
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground leading-snug">
              Quy trình thi công & Cập nhật tiến độ
            </h2>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full px-2.5 py-1 text-xs font-black leading-none shadow-2xs',
                progressInfo.isCompleted
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'bg-brand/10 text-brand ring-1 ring-brand/20'
              )}
            >
              {progressInfo.isCompleted ? (
                <>
                  <Check className="size-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                  <span>Hoàn thành 100%</span>
                </>
              ) : (
                <span>{progressInfo.badgeText}</span>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bấm check theo từng bước để đồng bộ tức thì với khách hàng.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-44 bg-muted/40 border border-border/60 rounded-2xl px-3 py-2 self-end sm:self-center">
          <div className="relative h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                progressInfo.isCompleted
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-brand to-emerald-500'
              )}
              style={{ width: `${progressInfo.percent}%` }}
            />
          </div>
          <span
            className={cn(
              'text-xs font-black tabular-nums whitespace-nowrap',
              progressInfo.isCompleted
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground'
            )}
          >
            {progressInfo.percent}%
          </span>
        </div>
      </div>

      {/* Cancelled Notice */}
      {isCancelled && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm">Công việc này đã bị hủy</p>
            <p className="mt-0.5">Không thể thực hiện các bước cập nhật tiến độ tiếp theo.</p>
          </div>
        </div>
      )}

      {/* Success Banner if Completed */}
      {currentStep === 5 && (
        <div className="flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-500/30 p-4 animate-in fade-in duration-300">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <PartyPopper className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
              Công việc đã hoàn tất 100%
            </h4>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
              Cảm ơn bạn đã hoàn thành dịch vụ xuất sắc và nghiệm thu cùng khách hàng.
            </p>
          </div>
        </div>
      )}

      {/* Sequential Process Checklist */}
      <div className="space-y-3">
        {PROCESS_STEPS.map((step) => {
          const stepIdx = step.stepNumber
          const isDone = currentStep >= stepIdx
          const isActive = currentStep === stepIdx - 1 && !isCancelled
          const isUpcoming = currentStep < stepIdx - 1
          const StepIcon = step.icon

          return (
            <div
              key={step.key}
              className={cn(
                'group relative rounded-2xl border transition-all duration-200 overflow-hidden',
                isDone && 'border-emerald-500/30 bg-emerald-500/[0.04]',
                isActive && 'border-brand bg-brand/[0.03] ring-2 ring-brand/15 shadow-sm',
                isUpcoming && 'border-border/60 bg-muted/20 opacity-60'
              )}
            >
              <div className="p-4 sm:p-4.5">
                <div className="flex items-start gap-3.5">
                  {/* Step Status Badge / Number */}
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all',
                      isDone && 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
                      isActive && 'bg-brand text-brand-foreground ring-4 ring-brand/20 shadow-sm shadow-brand/30',
                      isUpcoming && 'bg-muted text-muted-foreground border border-border'
                    )}
                  >
                    {isDone ? (
                      <Check className="size-5 stroke-[2.5]" />
                    ) : (
                      <span>{step.stepNumber}</span>
                    )}
                  </div>

                  {/* Step Title & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          'text-sm font-extrabold leading-snug',
                          isDone && 'text-foreground',
                          isActive && 'text-brand dark:text-brand font-black',
                          isUpcoming && 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </h3>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-none">
                          <Check className="size-3" /> Đã hoàn thành
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-black text-brand leading-none animate-pulse">
                          <span className="size-1.5 rounded-full bg-brand" /> Bước cần làm
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {step.subtitle}
                    </p>

                    {/* Step 1 Pending Actions */}
                    {step.stepNumber === 1 && isActive && rawStatus === 'PENDING_CONFIRMATION' && (
                      <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => onConfirm?.()}
                          disabled={isBusy}
                          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {pendingAction === 'confirm' ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CircleCheck className="size-4" />
                          )}
                          <span>Xác nhận nhận đơn ngay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeclineDialogOpen(true)}
                          disabled={isBusy}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-background px-3.5 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          <X className="size-3.5" /> Từ chối đơn
                        </button>
                      </div>
                    )}

                    {/* Step 2, 3 Active Action Buttons (1-Click Advance) */}
                    {isActive && (step.stepNumber === 2 || step.stepNumber === 3) && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleStepAction(step.key)}
                          disabled={isBusy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {isBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <StepIcon className="size-4" />
                          )}
                          <span>{step.actionLabel}</span>
                        </button>
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          {step.actionHint}
                        </span>
                      </div>
                    )}

                    {/* Step 4 Active: Start Service + Photo documentation */}
                    {isActive && step.stepNumber === 4 && (
                      <div className="mt-3.5 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleStepAction(step.key)}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                          >
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <StepIcon className="size-4" />
                            )}
                            <span>{step.actionLabel}</span>
                          </button>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            {step.actionHint}
                          </span>
                        </div>

                        {/* Optional photo documentation during inspection/repair */}
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                              <Camera className="size-3.5 text-brand" />
                              Ảnh hiện trường trước/trong thi công ({photos.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || isBusy}
                              className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
                            >
                              <Upload className="size-3" />
                              <span>{isUploading ? 'Đang tải...' : 'Chụp/Tải ảnh'}</span>
                            </button>
                          </div>
                          {photos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pt-2">
                              {photos.map((url, i) => (
                                <div key={i} className="relative size-12 shrink-0 rounded-lg overflow-hidden border border-border">
                                  <img src={url} alt="" className="size-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(i)}
                                    className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                                  >
                                    <X className="size-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 5: Active Completion Workspace */}
                    {step.stepNumber === 5 && isActive && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-inner">
                        {/* Photo proof upload */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                              <Camera className="size-4 text-brand" />
                              Ảnh chụp hiện trường & nghiệm thu ({photos.length})
                            </label>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || isBusy}
                              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline disabled:opacity-50"
                            >
                              {isUploading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Upload className="size-3.5" />
                              )}
                              <span>{isUploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                            </button>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />

                          {uploadError && (
                            <p className="text-xs font-medium text-destructive">{uploadError}</p>
                          )}

                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {photos.map((url, i) => (
                              <div
                                key={i}
                                className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40"
                              >
                                <img
                                  src={url}
                                  alt={`Nghiệm thu ${i + 1}`}
                                  className="size-full object-cover transition-transform group-hover:scale-105"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(i)}
                                  title="Xóa ảnh"
                                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/75 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || isBusy}
                              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-all hover:border-brand hover:bg-secondary/40 hover:text-brand"
                            >
                              {isUploading ? (
                                <Loader2 className="size-5 animate-spin text-brand" />
                              ) : (
                                <Camera className="size-5" />
                              )}
                              <span className="text-[10px] font-bold">
                                {isUploading ? 'Đang tải' : 'Chụp/Tải ảnh'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Completion note */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Ghi chú nghiệm thu (tùy chọn)
                          </label>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="vd: Đã sửa xong thiết bị, khách hàng đã kiểm tra và hài lòng..."
                            className="w-full resize-none rounded-xl border border-border bg-card p-2.5 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                          />
                        </div>

                        {/* Final price if negotiated */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            Chi phí thực tế đã thỏa thuận (VNĐ, tùy chọn)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder={price != null ? `Mặc định: ${formatVND(price)}` : 'Thỏa thuận trực tiếp'}
                            value={finalPriceInput}
                            onChange={(e) => setFinalPriceInput(e.target.value)}
                            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-mono"
                          />
                        </div>

                        {/* Main Completion CTA Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleStepAction('COMPLETED')}
                            disabled={isBusy}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cta py-3 text-xs sm:text-sm font-black text-cta-foreground shadow-md shadow-cta/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all"
                          >
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                            <span>Xác nhận nghiệm thu & Hoàn thành dịch vụ</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Completed state details */}
                    {step.stepNumber === 5 && isDone && (
                      <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 text-xs">
                        {completionNote && (
                          <p className="text-muted-foreground italic">
                            &ldquo;{completionNote}&rdquo;
                          </p>
                        )}
                        {proofPhotos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pt-1">
                            {proofPhotos.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Ảnh nghiệm thu ${i + 1}`}
                                className="size-14 rounded-lg object-cover border border-border shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Decline Dialog Modal */}
      {declineDialogOpen && (
        <DeclineDialog
          loading={isBusy}
          onClose={() => setDeclineDialogOpen(false)}
          onDecline={async (reasonCode, declineNote) => {
            const ok = await onDecline?.(reasonCode, declineNote)
            if (ok !== false) setDeclineDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

function DeclineDialog({
  loading,
  onClose,
  onDecline,
}: {
  loading: boolean
  onClose: () => void
  onDecline: (reasonCode: string, note?: string) => void
}) {
  const [reasonCode, setReasonCode] = useState('BUSY')
  const [declineNote, setDeclineNote] = useState('')

  const REASONS = [
    { code: 'BUSY', label: 'Bận lịch / Trùng lịch' },
    { code: 'TOO_FAR', label: 'Quá xa khu vực nhận việc' },
    { code: 'OUT_OF_SKILL', label: 'Không đúng chuyên môn' },
    { code: 'PRICE_ISSUE', label: 'Không thỏa thuận được chi phí' },
    { code: 'OTHER', label: 'Lý do khác' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={loading ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>

        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <TriangleAlert className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-black tracking-tight">Từ chối đơn đặt lịch?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Đơn này sẽ được chuyển lại hệ thống để phân bổ thợ phù hợp khác.
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-bold">Lý do từ chối</label>
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r.code}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all',
                  reasonCode === r.code
                    ? 'border-brand bg-brand/10 font-bold text-brand'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                )}
              >
                <input
                  type="radio"
                  name="declineReason"
                  value={r.code}
                  checked={reasonCode === r.code}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="accent-[var(--brand)]"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <label className="text-xs font-bold">Ghi chú bổ sung (tùy chọn)</label>
          <textarea
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            rows={2}
            placeholder="Ghi chú thêm nếu cần..."
            className="w-full resize-none rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => onDecline(reasonCode, declineNote.trim() || undefined)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>Xác nhận từ chối</span>
          </button>
        </div>
      </div>
    </div>
  )
}
