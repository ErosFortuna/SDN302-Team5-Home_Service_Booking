'use client'

import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  IdCard,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DocumentType,
  ProviderDocument,
  ProviderProfileItem,
} from '@/lib/api/verification'

interface ProviderReviewModalProps {
  profile: ProviderProfileItem | null
  loading: boolean
  processing: boolean
  onClose: () => void
  onApprove: (id: string, note?: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onRequestInfo: (id: string, note: string) => Promise<void>
}

const DOC_TYPE_META: Record<
  DocumentType,
  { label: string; icon: typeof IdCard; cls: string }
> = {
  ID_CARD: { label: 'CCCD / Hộ chiếu', icon: IdCard, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  CERTIFICATE: { label: 'Chứng chỉ hành nghề', icon: FileCheck2, cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  BUSINESS_LICENSE: { label: 'Giấy phép kinh doanh', icon: FileText, cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  OTHER: { label: 'Tài liệu khác', icon: FileText, cls: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
}

export function ProviderReviewModal({
  profile,
  loading,
  processing,
  onClose,
  onApprove,
  onReject,
  onRequestInfo,
}: ProviderReviewModalProps) {
  // Decision Form Mode: null | 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
  const [decisionMode, setDecisionMode] = useState<
    'APPROVE' | 'REJECT' | 'REQUEST_INFO' | null
  >(null)
  const [noteInput, setNoteInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!profile && !loading) return null

  const handleStartDecision = (mode: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    setDecisionMode(mode)
    setErrorMsg(null)
    if (mode === 'APPROVE') {
      setNoteInput('Hồ sơ và giấy tờ xác minh hợp lệ. Đã duyệt tài khoản thợ.')
    } else if (mode === 'REJECT') {
      setNoteInput('')
    } else {
      setNoteInput('')
    }
  }

  const handleConfirmDecision = async () => {
    if (!profile) return
    setErrorMsg(null)

    if (decisionMode === 'REJECT') {
      if (!noteInput.trim() || noteInput.trim().length < 5) {
        setErrorMsg('Vui lòng nhập lý do từ chối rõ ràng (tối thiểu 5 ký tự)')
        return
      }
      try {
        await onReject(profile._id, noteInput)
        setDecisionMode(null)
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Không thể từ chối hồ sơ')
      }
    } else if (decisionMode === 'REQUEST_INFO') {
      if (!noteInput.trim() || noteInput.trim().length < 5) {
        setErrorMsg('Vui lòng nêu rõ tài liệu hoặc thông tin cần bổ sung (tối thiểu 5 ký tự)')
        return
      }
      try {
        await onRequestInfo(profile._id, noteInput)
        setDecisionMode(null)
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Không thể gửi yêu cầu bổ sung')
      }
    } else if (decisionMode === 'APPROVE') {
      try {
        await onApprove(profile._id, noteInput)
        setDecisionMode(null)
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Không thể phê duyệt hồ sơ')
      }
    }
  }

  const isApproved =
    profile?.verificationStatus === 'APPROVED' || profile?.verificationStatus === 'VERIFIED'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Kiểm tra & Xét duyệt hồ sơ thợ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                UC-56 • Admin Verify Provider Profile
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !profile ? (
            <div className="flex flex-col items-center justify-center p-16">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Đang tải dữ liệu hồ sơ thợ và tài liệu xác minh...
              </p>
            </div>
          ) : (
            <>
              {/* Profile Overview Card */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-start gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-black text-xl overflow-hidden border border-teal-200">
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
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {profile.user?.fullName}
                      </h3>
                      {profile.businessName && (
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                          {profile.businessName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>{profile.user?.email}</span>
                      {profile.user?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-slate-400" />
                          {profile.user.phone}
                        </span>
                      )}
                      <span>
                        Kinh nghiệm: <b>{profile.yearsOfExperience || 0} năm</b>
                      </span>
                    </div>

                    {profile.serviceAreas && profile.serviceAreas.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                        <MapPin className="size-3.5 text-rose-500 shrink-0" />
                        <span>Khu vực: {profile.serviceAreas.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm',
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
                    {profile.verificationStatus === 'PENDING' && 'Chờ xét duyệt'}
                    {profile.verificationStatus === 'UNDER_REVIEW' && 'Đang xem xét'}
                    {isApproved && 'Đã phê duyệt (APPROVED)'}
                    {profile.verificationStatus === 'REJECTED' && 'Đã từ chối (REJECTED)'}
                  </span>

                  {profile.additionalInfoRequested && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="size-3" /> Đang yêu cầu bổ sung
                    </span>
                  )}
                </div>
              </div>

              {/* Bio / Description */}
              {(profile.description || profile.bio) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Giới thiệu năng lực & Kinh nghiệm
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {profile.description || profile.bio}
                  </p>
                </div>
              )}

              {/* Skills & Categories */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Dịch vụ & Kỹ năng đã đăng ký ({profile.skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill._id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1 text-xs font-bold text-teal-800 dark:text-teal-300"
                      >
                        <BadgeCheck className="size-3.5 text-teal-600" />
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-teal-600" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Tài liệu xác minh đính kèm ({profile.documents?.length || 0})
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Bảo mật: Chỉ Admin & Thợ sở hữu mới xem được
                  </span>
                </div>

                {!profile.documents || profile.documents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                    Thợ chưa tải lên tài liệu xác minh nào.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.documents.map((doc: ProviderDocument | string, idx: number) => {
                      const docObj: ProviderDocument =
                        typeof doc === 'string'
                          ? { docType: 'OTHER', fileUrl: doc }
                          : doc
                      const meta = DOC_TYPE_META[docObj.docType] || DOC_TYPE_META.OTHER
                      const Icon = meta.icon

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', meta.cls)}>
                              <Icon className="size-5" />
                            </div>
                            <div className="overflow-hidden">
                              <span className="block font-bold text-xs text-slate-900 dark:text-white truncate">
                                {meta.label}
                              </span>
                              <span className="block text-[11px] text-slate-400 truncate">
                                {docObj.fileUrl}
                              </span>
                            </div>
                          </div>

                          <a
                            href={docObj.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950 transition"
                            title="Mở xem tài liệu trong tab mới"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Review History / Audit Logs */}
              {profile.verificationLogs && profile.verificationLogs.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-slate-600" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Lịch sử xét duyệt & Truy vết (Audit Trail)
                    </h4>
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {profile.verificationLogs.map((log, lIdx) => (
                      <div
                        key={lIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs border border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {log.action}
                            </span>
                            <span className="font-medium text-slate-500">
                              (Chuyển sang: {log.status})
                            </span>
                          </div>
                          {log.note && (
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                              {log.note}
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right text-[11px] text-slate-400 shrink-0">
                          {log.adminId && (
                            <span>Duyệt bởi: {log.adminId.fullName || 'Admin'} • </span>
                          )}
                          <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Input Drawer (When clicking Approve / Reject / Request Info) */}
              {decisionMode && (
                <div className="rounded-2xl border-2 p-5 animate-fade-in space-y-3 shadow-md bg-white dark:bg-slate-900 border-teal-500">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {decisionMode === 'APPROVE' && (
                        <>
                          <CheckCircle2 className="size-4 text-emerald-600" /> Phê duyệt hồ sơ thợ (APPROVE)
                        </>
                      )}
                      {decisionMode === 'REJECT' && (
                        <>
                          <XCircle className="size-4 text-rose-600" /> Từ chối hồ sơ thợ (REJECT)
                        </>
                      )}
                      {decisionMode === 'REQUEST_INFO' && (
                        <>
                          <AlertTriangle className="size-4 text-amber-600" /> Yêu cầu bổ sung thông tin
                        </>
                      )}
                    </h4>

                    <button
                      type="button"
                      onClick={() => setDecisionMode(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {decisionMode === 'REJECT' && 'Lý do từ chối (bắt buộc nêu rõ):'}
                      {decisionMode === 'REQUEST_INFO' && 'Nội dung hoặc giấy tờ cần bổ sung (bắt buộc):'}
                      {decisionMode === 'APPROVE' && 'Ghi chú phê duyệt (tùy chọn):'}
                    </label>
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      rows={3}
                      placeholder={
                        decisionMode === 'REJECT'
                          ? 'Nhập lý do từ chối để thông báo cho thợ...'
                          : decisionMode === 'REQUEST_INFO'
                          ? 'Ví dụ: Vui lòng bổ sung thêm ảnh mặt sau CCCD và chứng chỉ an toàn điện...'
                          : 'Nhập ghi chú xét duyệt...'
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDecisionMode(null)}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDecision}
                      disabled={processing}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition disabled:opacity-50',
                        decisionMode === 'APPROVE'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : decisionMode === 'REJECT'
                          ? 'bg-rose-600 hover:bg-rose-500'
                          : 'bg-amber-600 hover:bg-amber-500'
                      )}
                    >
                      {processing && <Loader2 className="size-3.5 animate-spin" />}
                      <span>
                        {decisionMode === 'APPROVE' && 'Xác nhận Phê duyệt'}
                        {decisionMode === 'REJECT' && 'Xác nhận Từ chối'}
                        {decisionMode === 'REQUEST_INFO' && 'Gửi yêu cầu bổ sung'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Action Controls */}
        {profile && !decisionMode && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              Đóng
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Request Info Button */}
              <button
                type="button"
                onClick={() => handleStartDecision('REQUEST_INFO')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 px-4 py-2.5 text-xs font-black transition dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 shadow-sm"
              >
                <AlertTriangle className="size-3.5" />
                <span>Yêu cầu bổ sung thông tin</span>
              </button>

              {/* Reject Button */}
              <button
                type="button"
                onClick={() => handleStartDecision('REJECT')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 px-4 py-2.5 text-xs font-black transition dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 shadow-sm"
              >
                <XCircle className="size-3.5" />
                <span>Từ chối hồ sơ</span>
              </button>

              {/* Approve Button */}
              <button
                type="button"
                onClick={() => handleStartDecision('APPROVE')}
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-black transition shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Phê duyệt ngay</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

