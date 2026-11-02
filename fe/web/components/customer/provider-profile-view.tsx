'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Briefcase,
  Wrench,
  Phone,
  Mail,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCw,
  Coffee,
  Sparkles,
  ArrowLeft,
  BadgeCheck,
} from 'lucide-react'
import { useProviderProfile } from '@/hooks/use-provider-profile'
import type {
  ProviderServiceItem,
  ProviderCategorySkill,
  DaySchedule,
  ReviewItem,
} from '@/lib/api/provider-profile'

interface ProviderProfileViewProps {
  providerId: string
  onBack?: () => void
  onBookService?: (service: ProviderServiceItem) => void
}

const VI_DAYS: Record<string, string> = {
  monday: 'Thứ Hai',
  tuesday: 'Thứ Ba',
  wednesday: 'Thứ Tư',
  thursday: 'Thứ Năm',
  friday: 'Thứ Sáu',
  saturday: 'Thứ Bảy',
  sunday: 'Chủ Nhật',
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('vi-VN')} đ`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted/30 text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

export function ProviderProfileView({
  providerId,
  onBack,
  onBookService,
}: ProviderProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'schedule' | 'reviews'>('services')

  const {
    profile,
    loadingProfile,
    profileError,
    reloadProfile,
    reviews,
    loadingReviews,
    reviewsError,
    ratingFilter,
    setRatingFilter,
    sortBy,
    setSortBy,
    page,
    setPage,
    pagination,
    ratingSummary,
    reloadReviews,
  } = useProviderProfile(providerId)

  // Loading skeleton
  if (loadingProfile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="w-24 h-24 rounded-full bg-muted shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-7 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (profileError || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Hồ sơ thợ không khả dụng</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {profileError ||
              'Hồ sơ thợ không tồn tại, chưa được quản trị viên duyệt hoặc hiện đang tạm ngưng nhận dịch vụ.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Về trang chủ
            </Link>
          )}
          <button
            onClick={() => reloadProfile()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
          >
            <RotateCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  const currentDayIndex = new Date().getDay()
  const todaySchedule = profile.availability.weeklySchedule.find(
    (s) => s.dayOfWeek === currentDayIndex
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      {/* Back button */}
      <div>
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại tìm kiếm
          </button>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Trang chủ dịch vụ
          </Link>
        )}
      </div>

      {/* Hero / Header Card */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Top accent cover bar */}
        <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-primary" />

        <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 -mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Avatar */}
              <div className="relative">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-card shadow-md bg-muted"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-card shadow-md bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                    {profile.fullName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {profile.isVerified && (
                  <div
                    className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow-md border-2 border-card"
                    title="Đã xác thực hồ sơ & chuyên môn"
                  >
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {profile.fullName}
                  </h1>
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Thợ đã xác minh
                    </span>
                  )}
                </div>

                {profile.businessName && (
                  <p className="text-base font-medium text-muted-foreground">
                    {profile.businessName}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    Tham gia {formatDate(profile.memberSince)}
                  </span>
                  {profile.yearsOfExperience > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-primary" />
                      {profile.yearsOfExperience} năm kinh nghiệm
                    </span>
                  )}
                  {profile.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-primary" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Availability status badge */}
            <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
              {profile.availability.isAcceptingBookings ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sẵn sàng nhận việc
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Tạm ngưng nhận lịch
                </div>
              )}

              {todaySchedule && !todaySchedule.isOff ? (
                <span className="text-xs text-muted-foreground">
                  Hôm nay: {todaySchedule.startTime} - {todaySchedule.endTime}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Hôm nay: Nghỉ định kỳ</span>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
            {/* Rating */}
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 flex items-center gap-3 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground flex items-center gap-1">
                  {profile.stats.averageRating > 0 ? profile.stats.averageRating.toFixed(1) : '5.0'}
                  <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {profile.stats.totalReviews} đánh giá
                </div>
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 flex items-center gap-3 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {profile.stats.completedJobs}
                </div>
                <div className="text-xs text-muted-foreground">Công việc hoàn thành</div>
              </div>
            </div>

            {/* Experience */}
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 flex items-center gap-3 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {profile.yearsOfExperience > 0 ? `${profile.yearsOfExperience} năm` : 'Chuyên nghiệp'}
                </div>
                <div className="text-xs text-muted-foreground">Kinh nghiệm nghề</div>
              </div>
            </div>

            {/* Service Areas Count */}
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 flex items-center gap-3 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {profile.serviceAreas.length > 0 ? `${profile.serviceAreas.length} khu vực` : 'Toàn thành phố'}
                </div>
                <div className="text-xs text-muted-foreground">Phạm vi nhận việc</div>
              </div>
            </div>
          </div>

          {/* Service Areas Tags */}
          {profile.serviceAreas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-muted-foreground font-medium">Khu vực phục vụ:</span>
              {profile.serviceAreas.map((area, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/60"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-border">
        <nav className="flex space-x-6 sm:space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              activeTab === 'services'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Dịch vụ & Năng lực ({profile.services.length})
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            Lịch làm việc trong tuần
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Đánh giá & Nhận xét ({profile.stats.totalReviews})
          </button>
        </nav>
      </div>

      {/* Tab 1: Services & Skills */}
      {activeTab === 'services' && (
        <div className="space-y-8">
          {/* Bio / Description */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Giới thiệu thợ dịch vụ
            </h3>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-sm sm:text-base">
              {profile.description ||
                profile.bio ||
                'Thợ chuyên nghiệp, tận tâm, cam kết chất lượng dịch vụ cao nhất với bảo hành uy tín.'}
            </p>
          </div>

          {/* Skills / Categories */}
          {profile.skills.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Kỹ năng chuyên môn</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {profile.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 transition flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {skill.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {skill.pricingMode === 'FIXED' ? 'Giá niêm yết' : 'Báo giá nhanh'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Dịch vụ cung cấp ({profile.services.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Giá minh bạch, không phí ẩn
              </span>
            </div>

            {profile.services.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-muted-foreground text-sm">
                Thợ chưa liệt kê danh sách dịch vụ chi tiết. Vui lòng liên hệ trực tiếp để được tư vấn.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.services.map((service) => (
                  <div
                    key={service.id}
                    className="p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-base text-foreground leading-snug">
                          {service.name}
                        </h4>
                        {service.category && (
                          <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground shrink-0">
                            {service.category.name}
                          </span>
                        )}
                      </div>

                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{service.estimatedDurationMinutes} phút
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Có bảo hành dịch vụ
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Chi phí tham khảo</div>
                        <div className="text-lg font-extrabold text-primary">
                          {service.pricingType === 'QUOTE_REQUIRED'
                            ? 'Báo giá theo khảo sát'
                            : service.pricingType === 'FROM'
                            ? `Từ ${formatCurrency(service.basePrice)}`
                            : formatCurrency(service.basePrice)}
                        </div>
                      </div>

                      <button
                        onClick={() => onBookService && onBookService(service)}
                        disabled={!profile.availability.isAcceptingBookings}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          profile.availability.isAcceptingBookings
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {profile.availability.isAcceptingBookings ? 'Đặt dịch vụ' : 'Tạm ngưng'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Working Hours / Availability */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Lịch làm việc định kỳ trong tuần
                </h3>
                <p className="text-sm text-muted-foreground">
                  Khung giờ phục vụ tiêu chuẩn của thợ để quý khách tiện sắp xếp thời gian đặt lịch
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg shrink-0">
                Mỗi ca làm việc: ~{profile.availability.slotDurationMinutes} phút
              </div>
            </div>

            {/* 7 Days Table */}
            <div className="divide-y divide-border/70 border border-border rounded-xl overflow-hidden">
              {profile.availability.weeklySchedule.map((schedule: DaySchedule) => {
                const isToday = schedule.dayOfWeek === currentDayIndex
                return (
                  <div
                    key={schedule.dayOfWeek}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition ${
                      isToday
                        ? 'bg-primary/5 dark:bg-primary/10 font-semibold'
                        : 'bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 font-medium text-foreground">
                        {VI_DAYS[schedule.dayName] || schedule.dayName}
                      </span>
                      {isToday && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {schedule.isOff ? (
                        <span className="text-muted-foreground/70 italic text-xs">
                          Nghỉ cố định trong tuần
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            {schedule.startTime} - {schedule.endTime}
                          </span>

                          {schedule.breaks && schedule.breaks.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                              <Coffee className="w-3.5 h-3.5" />
                              Nghỉ:{' '}
                              {schedule.breaks
                                .map((b) => `${b.startTime}-${b.endTime}`)
                                .join(', ')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Days Off (Exceptions) */}
          {profile.availability.upcomingDaysOff.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Lịch nghỉ đột xuất & ngày phép sắp tới
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.availability.upcomingDaysOff.map((dayOff) => (
                  <div
                    key={dayOff.id}
                    className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1"
                  >
                    <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span>{formatDate(dayOff.date)}</span>
                      <span>{dayOff.isFullDayOff ? 'Nghỉ cả ngày' : 'Đổi giờ làm'}</span>
                    </div>
                    <div className="text-amber-800/80 dark:text-amber-300/80">
                      Lý do: {dayOff.reason}
                    </div>
                    {!dayOff.isFullDayOff && dayOff.customStartTime && (
                      <div className="text-amber-700 dark:text-amber-400">
                        Giờ làm việc thay đổi: {dayOff.customStartTime} - {dayOff.customEndTime}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reviews (UC-15) */}
      {activeTab === 'reviews' && (
        <div className="space-y-8">
          {/* Ratings Overview & Interactive Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
            {/* Big Score Box */}
            <div className="text-center md:border-r md:border-border/80 md:pr-8 space-y-2">
              <div className="text-5xl font-black text-foreground tracking-tight">
                {ratingSummary?.average ? ratingSummary.average.toFixed(1) : '5.0'}
              </div>
              <div className="flex justify-center">
                <StarRating rating={ratingSummary?.average || 5} size="lg" />
              </div>
              <p className="text-sm text-muted-foreground">
                Dựa trên {ratingSummary?.total || 0} lượt đánh giá thực tế
              </p>
            </div>

            {/* Star Distribution Bars (Clickable to Filter) */}
            <div className="md:col-span-2 space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const item = ratingSummary?.breakdown?.[star] || { count: 0, percentage: 0 }
                const isSelected = ratingFilter === star
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingFilter(isSelected ? 'all' : star)}
                    className={`w-full flex items-center gap-3 p-1.5 rounded-lg text-xs transition text-left group ${
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/40'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="w-12 font-medium text-foreground shrink-0 flex items-center gap-1">
                      {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </span>

                    {/* Progress Bar */}
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <span className="w-12 text-right text-muted-foreground shrink-0 font-medium">
                      {item.count} ({item.percentage}%)
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Review Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Lọc sao:</span>
              <button
                onClick={() => setRatingFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  ratingFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Tất cả ({ratingSummary?.total || 0})
              </button>

              {[5, 4, 3, 2, 1].map((s) => {
                const count = ratingSummary?.breakdown?.[s]?.count || 0
                return (
                  <button
                    key={s}
                    onClick={() => setRatingFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                      ratingFilter === s
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> ({count})
                  </button>
                )
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="newest">Mới nhất</option>
                <option value="highest">Đánh giá cao nhất</option>
                <option value="lowest">Đánh giá thấp nhất</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-border bg-card animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/6" />
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="p-8 text-center bg-card border border-border rounded-xl space-y-3">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{reviewsError}</p>
              <button
                onClick={reloadReviews}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tải lại đánh giá
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-2">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <h4 className="font-semibold text-foreground">Không có đánh giá nào</h4>
              <p className="text-xs text-muted-foreground">
                {ratingFilter !== 'all'
                  ? `Chưa có đánh giá nào đạt ${ratingFilter} sao. Hãy thử chọn mức sao khác.`
                  : 'Thợ này chưa nhận được đánh giá nào từ khách hàng.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: ReviewItem) => (
                <div
                  key={review.id}
                  className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-3 shadow-sm hover:border-primary/30 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {review.customer?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.customer.avatarUrl}
                          alt={review.customer.fullName}
                          className="w-10 h-10 rounded-full object-cover bg-muted border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {(review.customer?.fullName || 'K').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {review.customer?.fullName || 'Khách hàng ẩn danh'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                          {review.serviceName && ` • Dịch vụ: ${review.serviceName}`}
                        </div>
                      </div>
                    </div>

                    <StarRating rating={review.rating} size="sm" />
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line pt-1">
                    {review.comment || (
                      <span className="italic text-muted-foreground">
                        Khách hàng không để lại nhận xét bằng văn bản.
                      </span>
                    )}
                  </p>

                  {/* Provider reply if any */}
                  {review.response && (
                    <div className="mt-3 p-3.5 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 text-xs space-y-1">
                      <div className="font-semibold text-primary flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Phản hồi từ thợ dịch vụ:
                      </div>
                      <p className="text-foreground/80 leading-relaxed">{review.response}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
                  <div>
                    Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đánh giá)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

