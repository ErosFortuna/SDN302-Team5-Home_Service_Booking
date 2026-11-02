'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePlus,
  Loader2,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  providerVerificationApi,
  type DocumentType,
  type MyVerificationStatusResponse,
} from '@/lib/api/verification'
import { getErrorMessage } from '@/lib/api/client'

export function ProviderStatusCard() {
  const [data, setData] = useState<MyVerificationStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isResubmitOpen, setIsResubmitOpen] = useState(false)

  // Resubmit form state
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [docs, setDocs] = useState<Array<{ docType: DocumentType; fileUrl: string }>>([])
  const [newDocType, setNewDocType] = useState<DocumentType>('ID_CARD')
  const [newDocUrl, setNewDocUrl] = useState('')
  const [resubmitNote, setResubmitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resubmitSuccess, setResubmitSuccess] = useState(false)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await providerVerificationApi.getMyStatus()
      setData(res.data)
      if (res.data) {
        setBusinessName(res.data.businessName || '')
        setDescription(res.data.description || '')
        setDocs(
          (res.data.documents || []).map((d) => ({
            docType: d.docType || 'OTHER',
            fileUrl: d.fileUrl,
          }))
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleAddDoc = () => {
    if (!newDocUrl.trim()) return
    setDocs((prev) => [...prev, { docType: newDocType, fileUrl: newDocUrl.trim() }])
    setNewDocUrl('')
  }

  const handleRemoveDoc = (idx: number) => {
    setDocs((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await providerVerificationApi.resubmit({
        businessName,
        description,
        documents: docs,
        note: resubmitNote.trim() || 'Thợ đã cập nhật thông tin và bổ sung tài liệu',
      })
      setResubmitSuccess(true)
      setTimeout(() => {
        setIsResubmitOpen(false)
        setResubmitSuccess(false)
        fetchStatus()
      }, 1500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !data || !data.exists) return null

  const isApproved =
    data.verificationStatus === 'APPROVED' || data.verificationStatus === 'VERIFIED'
  const isRejected = data.verificationStatus === 'REJECTED'
  const isPending = data.verificationStatus === 'PENDING'
  const isUnderReview = data.verificationStatus === 'UNDER_REVIEW'
  const isRequested = data.additionalInfoRequested

  // If approved and not requested, render a small clean badge
  if (isApproved && !isRequested) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-sm">
        <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
        <span>Hồ sơ thợ đã được duyệt (Đủ điều kiện nhận việc).</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-3xl border p-5 sm:p-6 shadow-md transition-all',
        isRequested || isRejected
          ? 'border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20'
          : 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-2xl',
              isRequested || isRejected
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            )}
          >
            {isRequested ? (
              <AlertTriangle className="size-6" />
            ) : isRejected ? (
              <XCircle className="size-6 text-rose-600" />
            ) : (
              <Clock className="size-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Trạng thái xét duyệt hồ sơ:
              </h3>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-black',
                  isRequested
                    ? 'bg-amber-200 text-amber-900'
                    : isRejected
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-blue-200 text-blue-900'
                )}
              >
                {isRequested
                  ? 'YÊU CẦU BỔ SUNG THÔNG TIN'
                  : isRejected
                  ? 'HỒ SƠ BỊ TỪ CHỐI'
                  : isPending
                  ? 'CHỜ QUẢN TRỊ VIÊN DUYỆT'
                  : 'ĐANG XEM XÉT'}
              </span>
            </div>

            {data.adminReviewNote ? (
              <div className="mt-2 rounded-xl bg-white/80 dark:bg-slate-900/80 p-3 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">
                  Ghi chú từ Quản trị viên:{' '}
                </span>
                {data.adminReviewNote}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Hồ sơ của bạn đang được ban quản trị xét duyệt. Bạn sẽ nhận được thông báo ngay khi hồ sơ được phê duyệt.
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {(isRequested || isRejected || isPending) && (
          <button
            type="button"
            onClick={() => setIsResubmitOpen(true)}
            className="self-start sm:self-center shrink-0 inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-xs font-black shadow-md transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <FilePlus className="size-4" />
            <span>{isRequested ? 'Bổ sung giấy tờ & Gửi lại' : 'Cập nhật lại hồ sơ'}</span>
          </button>
        )}
      </div>

      {/* Resubmit Modal */}
      {isResubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus className="size-5 text-teal-600" />
                Cập nhật bổ sung thông tin hồ sơ (UC-31)
              </h3>
              <button
                type="button"
                onClick={() => setIsResubmitOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {resubmitSuccess ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  Đã gửi lại hồ sơ thành công!
                </h4>
                <p className="text-xs text-slate-500">
                  Hồ sơ của bạn đã được chuyển về trạng thái Chờ duyệt. Quản trị viên sẽ sớm kiểm tra lại.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên doanh nghiệp / Đơn vị cung cấp (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="VD: Điện Lạnh Phát Đạt"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mô tả kinh nghiệm & Năng lực:
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Mô tả kỹ năng, số năm kinh nghiệm..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Documents List */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Danh sách tài liệu xác minh (CCCD, Chứng chỉ, Giấy phép):
                  </label>

                  <div className="space-y-2 mb-3">
                    {docs.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-900 dark:text-white">
                            [{d.docType}]:
                          </span>
                          <span className="text-slate-500 truncate">{d.fileUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(dIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add document row */}
                  <div className="flex gap-2">
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="ID_CARD">CCCD / Hộ chiếu</option>
                      <option value="CERTIFICATE">Chứng chỉ nghề</option>
                      <option value="BUSINESS_LICENSE">Giấy phép kinh doanh</option>
                      <option value="OTHER">Tài liệu khác</option>
                    </select>

                    <input
                      type="url"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder="Nhập đường link file URL hoặc ảnh..."
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={handleAddDoc}
                      className="rounded-xl bg-slate-200 hover:bg-slate-300 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-white"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú gửi Quản trị viên:
                  </label>
                  <input
                    type="text"
                    value={resubmitNote}
                    onChange={(e) => setResubmitNote(e.target.value)}
                    placeholder="VD: Em đã chụp lại rõ nét mặt sau CCCD..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsResubmitOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-2.5 text-xs font-black text-white shadow-md transition disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Gửi lại hồ sơ</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

