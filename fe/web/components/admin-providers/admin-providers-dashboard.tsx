'use client'

import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProviderVerification } from '@/hooks/use-provider-verification'
import { ProviderReviewModal } from './provider-review-modal'

export function AdminProvidersDashboard() {
  const {
    items,
    counts,
    pagination,
    statusFilter,
    search,
    loading,
    error,
    successMessage,
    selectedProfile,
    inspectLoading,
    actionProcessing,
    setStatusFilter,
    setSearch,
    setPage,
    inspectProfile,
    approve,
    reject,
    requestInfo,
    closeModal,
    reload,
    clearError,
  } = useProviderVerification()

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-white/15">
                <ShieldCheck className="size-3.5" /> UC-56 • Admin Verify Providers
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-white">
              Xét duyệt hồ sơ thợ (Approve / Reject Provider)
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
              Kiểm tra thông tin cá nhân, chứng chỉ chuyên môn, giấy phép hành nghề của thợ trước khi cấp phép nhận đơn đặt trên toàn hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 ring-1 ring-white/15 transition-all"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              <span>Làm mới danh sách</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'text-left rounded-2xl p-4 transition-all',
              statusFilter === 'ALL'
                ? 'bg-white/15 ring-2 ring-indigo-400'
                : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            )}
          >
            <p className="text-[11px] font-medium text-slate-400">Tất cả hồ sơ</p>
            <p className="mt-1 text-2xl font-black text-white">{counts.all}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={cn(
              'text-left rounded-2xl p-4 transition-all',
              statusFilter === 'PENDING'
                ? 'bg-amber-500/20 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            )}
          >
            <p className="text-[11px] font-bold text-amber-300">Chờ duyệt (Mới)</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{counts.pending}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('UNDER_REVIEW')}
            className={cn(
              'text-left rounded-2xl p-4 transition-all',
              statusFilter === 'UNDER_REVIEW'
                ? 'bg-blue-500/20 ring-2 ring-blue-400'
                : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            )}
          >
            <p className="text-[11px] font-bold text-blue-300">Đang xem xét</p>
            <p className="mt-1 text-2xl font-black text-blue-300">{counts.underReview}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={cn(
              'text-left rounded-2xl p-4 transition-all',
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/20 ring-2 ring-emerald-400'
                : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            )}
          >
            <p className="text-[11px] font-bold text-emerald-300">Đã phê duyệt</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{counts.approved}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={cn(
              'text-left rounded-2xl p-4 transition-all',
              statusFilter === 'REJECTED'
                ? 'bg-rose-500/20 ring-2 ring-rose-400'
                : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
            )}
          >
            <p className="text-[11px] font-bold text-rose-300">Đã từ chối</p>
            <p className="mt-1 text-2xl font-black text-rose-300">{counts.rejected}</p>
          </button>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-[11px] font-medium text-amber-300">Cần bổ sung giấy tờ</p>
            <p className="mt-1 text-2xl font-black text-amber-200">
              {counts.additionalInfoRequested}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Success and Error Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 text-white p-4 shadow-lg animate-fade-in">
          <CheckCircle2 className="size-5 shrink-0" />
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-rose-600 text-white p-4 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs underline font-semibold text-rose-100 hover:text-white"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên thợ, email, số điện thoại..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Lọc theo:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'UNDER_REVIEW', label: 'Đang xem xét' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Bị từ chối' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table / List of Providers */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="size-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Đang tải danh sách hồ sơ thợ cần duyệt...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Users className="size-7" />
          </div>
          <h4 className="mt-4 font-bold text-slate-800 dark:text-slate-200">
            Không tìm thấy hồ sơ thợ nào
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((profile) => {
            const isApproved =
              profile.verificationStatus === 'APPROVED' ||
              profile.verificationStatus === 'VERIFIED'

            return (
              <div
                key={profile._id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-black text-lg overflow-hidden border border-indigo-200 dark:border-indigo-800">
                    {profile.user?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.user.avatar}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      profile.user?.fullName?.charAt(0) || 'P'
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {profile.user?.fullName || 'Thợ không tên'}
                      </h3>
                      {profile.businessName && (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {profile.businessName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{profile.user?.email}</span>
                      {profile.user?.phone && (
                        <span className="flex items-center gap-1 font-medium">
                          <Phone className="size-3" /> {profile.user.phone}
                        </span>
                      )}
                      <span>
                        Kinh nghiệm: <b>{profile.yearsOfExperience || 0} năm</b>
                      </span>
                    </div>

                    {/* Skills pills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {profile.skills.slice(0, 3).map((s) => (
                          <span
                            key={s._id}
                            className="rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                          >
                            {s.name}
                          </span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="text-[11px] font-semibold text-slate-400">
                            +{profile.skills.length - 3} kỹ năng khác
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Center / Right: Documents & Status & Action */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 pt-3 lg:pt-0">
                  {/* Documents count badge */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                    <FileCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{profile.documents?.length || 0} giấy tờ</span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col items-end">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black',
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : profile.verificationStatus === 'UNDER_REVIEW'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : profile.verificationStatus === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      )}
                    >
                      <span className="size-2 rounded-full bg-current" />
                      {profile.verificationStatus === 'PENDING' && 'Chờ duyệt'}
                      {profile.verificationStatus === 'UNDER_REVIEW' && 'Đang xem xét'}
                      {isApproved && 'Đã duyệt'}
                      {profile.verificationStatus === 'REJECTED' && 'Từ chối'}
                    </span>

                    {profile.additionalInfoRequested && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                        Cần bổ sung thông tin
                      </span>
                    )}
                  </div>

                  {/* Inspect Button */}
                  <button
                    type="button"
                    onClick={() => inspectProfile(profile._id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-black shadow-md shadow-indigo-600/20 transition"
                  >
                    <Eye className="size-3.5" />
                    <span>Xét duyệt hồ sơ</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <span className="text-slate-500">
                Hiển thị trang {pagination.page} trên tổng số {pagination.totalPages} trang ({pagination.total} hồ sơ)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="size-4" /> Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  Sau <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Inspection & Review Modal */}
      {selectedProfile && (
        <ProviderReviewModal
          profile={selectedProfile}
          loading={inspectLoading}
          processing={actionProcessing}
          onClose={closeModal}
          onApprove={approve}
          onReject={reject}
          onRequestInfo={requestInfo}
        />
      )}
    </div>
  )
}

