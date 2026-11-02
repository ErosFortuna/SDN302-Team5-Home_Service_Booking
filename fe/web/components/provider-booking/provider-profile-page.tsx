'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, LoaderCircle, MapPin, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/api/client'
import {
  createMyProviderProfile,
  deleteMyProviderProfile,
  getMyProviderProfile,
  updateMyProviderProfile,
  type ProviderProfile,
  type ProviderProfileInput,
} from '@/lib/api/provider-profile'

type ProfileForm = {
  businessName: string
  bio: string
  yearsOfExperience: string
  serviceAreas: string
  city: string
  latitude: string
  longitude: string
}

const EMPTY_FORM: ProfileForm = {
  businessName: '',
  bio: '',
  yearsOfExperience: '0',
  serviceAreas: '',
  city: '',
  latitude: '',
  longitude: '',
}

const VERIFICATION_LABELS: Record<ProviderProfile['verificationStatus'], string> = {
  PENDING: 'Chờ xác minh',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Bị từ chối',
}

function profileToForm(profile: ProviderProfile): ProfileForm {
  return {
    businessName: profile.businessName,
    bio: profile.bio,
    yearsOfExperience: String(profile.yearsOfExperience),
    serviceAreas: profile.serviceAreas.join(', '),
    city: profile.city,
    latitude: profile.location ? String(profile.location.coordinates[1]) : '',
    longitude: profile.location ? String(profile.location.coordinates[0]) : '',
  }
}

function formToInput(form: ProfileForm): ProviderProfileInput {
  const hasLatitude = form.latitude.trim() !== ''
  const hasLongitude = form.longitude.trim() !== ''
  if (hasLatitude !== hasLongitude) {
    throw new Error('Vui lòng nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.')
  }
  const location = hasLatitude
    ? {
        type: 'Point' as const,
        coordinates: [Number(form.longitude), Number(form.latitude)] as [number, number],
      }
    : null
  if (location && (!Number.isFinite(location.coordinates[0]) || !Number.isFinite(location.coordinates[1]))) {
    throw new Error('Vĩ độ và kinh độ phải là số hợp lệ.')
  }
  return {
    businessName: form.businessName.trim(),
    bio: form.bio.trim(),
    yearsOfExperience: Number(form.yearsOfExperience),
    serviceAreas: [...new Set(form.serviceAreas.split(',').map((area) => area.trim()).filter(Boolean))],
    city: form.city.trim(),
    location,
  }
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

export function ProviderProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const current = await getMyProviderProfile()
      setProfile(current)
      setForm(current ? profileToForm(current) : EMPTY_FORM)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setField = (field: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = formToInput(form)
      const saved = profile
        ? await updateMyProviderProfile(payload)
        : await createMyProviderProfile(payload)
      setProfile(saved)
      setForm(profileToForm(saved))
      setNotice(profile ? 'Đã cập nhật hồ sơ thợ.' : 'Đã tạo hồ sơ thợ. Hồ sơ đang chờ xác minh.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Hồ sơ sẽ bị ẩn khỏi tìm kiếm và bạn không thể nhận yêu cầu mới. Lịch sử công việc và thanh toán vẫn được giữ lại. Tiếp tục?',
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    setNotice('')
    try {
      const deleted = await deleteMyProviderProfile()
      setProfile(deleted)
      setNotice('Hồ sơ đã được ẩn. Dữ liệu lịch sử vẫn được lưu.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const isDeleted = profile?.isDeleted === true

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Tài khoản thợ</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Hồ sơ thợ</h1>
          <p className="mt-2 text-sm text-muted-foreground">Quản lý thông tin kinh doanh và khu vực nhận việc.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold hover:bg-muted disabled:opacity-60">
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div>}
      {notice && <div role="status" className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm font-semibold">{notice}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="size-7 animate-spin text-brand" /></div>
      ) : isDeleted ? (
        <div className="mt-8 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-black">Hồ sơ đã được ẩn</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hồ sơ không còn xuất hiện khi khách tìm thợ. Lịch sử công việc, đánh giá và thanh toán vẫn được lưu.
                Vui lòng liên hệ quản trị viên nếu cần khôi phục.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {profile && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <ShieldCheck className="size-5 text-brand" />
              <div>
                <p className="text-sm font-extrabold">Trạng thái hồ sơ: {VERIFICATION_LABELS[profile.verificationStatus]}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(profile.averageRating ?? 0).toFixed(1)} sao · {profile.reviewCount ?? 0} đánh giá · {profile.completedJobCount ?? 0} công việc hoàn thành
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold sm:col-span-2">
                Tên cửa hàng / tên kinh doanh
                <input required minLength={2} maxLength={160} value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Giới thiệu
                <textarea maxLength={2000} rows={4} value={form.bio} onChange={(e) => setField('bio', e.target.value)} className={inputClass} placeholder="Mô tả kinh nghiệm và dịch vụ của bạn" />
              </label>
              <label className="text-sm font-bold">
                Số năm kinh nghiệm
                <input type="number" min={0} max={80} step={1} required value={form.yearsOfExperience} onChange={(e) => setField('yearsOfExperience', e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-bold">
                Thành phố
                <input maxLength={100} value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputClass} placeholder="Ví dụ: Đà Nẵng" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Khu vực nhận việc
                <input maxLength={2048} value={form.serviceAreas} onChange={(e) => setField('serviceAreas', e.target.value)} className={inputClass} placeholder="Nhập các quận/huyện, cách nhau bằng dấu phẩy" />
              </label>
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1.5 text-sm font-bold"><MapPin className="size-4 text-brand" /> Vị trí (không bắt buộc)</p>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Vĩ độ
                    <input type="number" min={-90} max={90} step="any" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Kinh độ
                    <input type="number" min={-180} max={180} step="any" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} className={inputClass} />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="submit" disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 disabled:opacity-60">
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                {profile ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
              </button>
              {profile && (
                <button type="button" onClick={() => void handleDelete()} disabled={saving || deleting} className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/5 disabled:opacity-60">
                  {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Ẩn hồ sơ
                </button>
              )}
            </div>
          </form>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Thông tin xác minh, đánh giá và số công việc hoàn thành do hệ thống quản lý. Ẩn hồ sơ sẽ không xóa lịch sử và bị từ chối nếu còn công việc đang thực hiện hoặc giao dịch membership chưa hoàn tất.
          </p>
        </>
      )}
    </div>
  )
}
