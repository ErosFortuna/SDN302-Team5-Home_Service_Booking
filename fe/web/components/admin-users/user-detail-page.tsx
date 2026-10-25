'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  Clock3,
  Edit3,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  X,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/admin-categories/controls'
import { useToast } from '@/components/provider-booking/toast'
import { adminUsersApi } from '@/lib/api/admin-users'
import { getErrorMessage } from '@/lib/api/client'
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type ManagedUser,
  type ManagedUserRole,
  type ManagedUserStatus,
} from '@/lib/admin-users'
import { RoleBadge, StatusBadge, UserAvatar } from './user-badges'

interface UserFormState {
  fullName: string
  email: string
  phone: string
  role: ManagedUserRole
  status: ManagedUserStatus
  emailVerified: boolean
  password: string
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  phone: '',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  emailVerified: true,
  password: '',
}
const dateFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' })

export function UserDetailPage({
  userId,
  embedded = false,
  onBack,
  onCreated,
}: {
  userId: string
  embedded?: boolean
  onBack?: () => void
  onCreated?: (id: string) => void
}) {
  const isNew = userId === 'new'
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<ManagedUser | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState(isNew)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    adminUsersApi.getById(userId, controller.signal)
      .then(({ data }) => {
        setUser(data)
        setForm(toFormState(data))
        setError('')
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [isNew, userId])

  const updateForm = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const normalized = {
      ...form,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLocaleLowerCase('vi-VN'),
      phone: form.phone.trim(),
      password: form.password,
    }

    if (normalized.fullName.length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.')
      setSaving(false)
      return
    }

    try {
      setError('')
      if (isNew) {
        const { data: created } = await adminUsersApi.create(normalized)
        setUser(created)
        setEditing(false)
        toast.success(`Đã tạo tài khoản ${created.fullName}`)
        if (embedded) onCreated?.(created.id)
        else router.replace(`/admin/users/${created.id}`)
      } else if (user) {
        const { password, ...data } = normalized
        const { data: updated } = await adminUsersApi.update(user.id, {
          ...data,
          ...(password ? { password } : {}),
        })
        setUser(updated)
        setForm(toFormState(updated))
        setEditing(false)
        toast.success(`Đã cập nhật tài khoản ${updated.fullName}`)
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async () => {
    if (!user) return
    setDeleting(true)
    try {
      await adminUsersApi.delete(user.id)
      toast.success(`Đã xóa tài khoản ${user.fullName}`)
      if (embedded) onBack?.()
      else router.push('/admin/users')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><span className="size-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-label="Đang tải" /></div>
  }

  if (!isNew && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <CircleAlert className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-black">Không tìm thấy người dùng</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        {embedded ? (
          <button onClick={onBack} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"><ArrowLeft className="size-4" /> Về danh sách</button>
        ) : (
          <Link href="/admin/users" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"><ArrowLeft className="size-4" /> Về danh sách</Link>
        )}
      </div>
    )
  }

  const isForm = editing || isNew

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {embedded ? (
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-brand">
          <ArrowLeft className="size-4" /> Danh sách người dùng
        </button>
      ) : (
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-brand">
          <ArrowLeft className="size-4" /> Danh sách người dùng
        </Link>
      )}

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{isNew ? 'Tài khoản mới' : 'Hồ sơ người dùng'}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{isNew ? 'Tạo người dùng' : editing ? 'Cập nhật thông tin' : 'Chi tiết người dùng'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isNew ? 'Điền thông tin cơ bản để tạo tài khoản mới.' : 'Thông tin tài khoản và trạng thái trên nền tảng.'}</p>
        </div>
        {!isNew && !editing && user && (
          <div className="flex gap-2">
            <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive">
              <Trash2 className="size-4" /> Xóa
            </button>
            <button onClick={() => { setForm(toFormState(user)); setError(''); setEditing(true) }} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 transition hover:brightness-105">
              <Edit3 className="size-4" /> Chỉnh sửa
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </div>
      )}

      {isForm ? (
        <form onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
          <div className="border-b border-border bg-muted/30 px-5 py-4 sm:px-7">
            <h2 className="font-extrabold">Thông tin tài khoản</h2>
            <p className="mt-1 text-xs text-muted-foreground">Các trường có dấu * là bắt buộc.</p>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
            <FormField label="Họ và tên *">
              <input required minLength={2} maxLength={120} value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} placeholder="Nhập họ và tên" className={inputClass} />
            </FormField>
            <FormField label="Email *">
              <input required type="email" maxLength={254} value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="name@example.com" className={inputClass} />
            </FormField>
            <FormField label="Số điện thoại">
              <input type="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="09xxxxxxxx" className={inputClass} />
            </FormField>
            <FormField label={isNew ? 'Mật khẩu *' : 'Mật khẩu mới (không bắt buộc)'}>
              <input
                type="password"
                required={isNew}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder={isNew ? 'Tối thiểu 8 ký tự' : 'Để trống nếu không đổi'}
                className={inputClass}
              />
            </FormField>
            <FormField label="Vai trò">
              <select value={form.role} onChange={(event) => updateForm('role', event.target.value as ManagedUserRole)} className={inputClass}>
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <FormField label="Trạng thái tài khoản">
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value as ManagedUserStatus)} className={inputClass}>
                {Object.entries(USER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FormField>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4 sm:mt-6">
              <input type="checkbox" checked={form.emailVerified} onChange={(event) => updateForm('emailVerified', event.target.checked)} className="size-4 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-bold">Email đã xác thực</span>
                <span className="block text-xs text-muted-foreground">Đánh dấu email đã hoàn tất xác minh.</span>
              </span>
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" onClick={() => isNew ? embedded ? onBack?.() : router.push('/admin/users') : setEditing(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted">
              <X className="size-4" /> Hủy
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">
              {isNew ? <UserRoundPlus className="size-4" /> : <Save className="size-4" />}
              {saving ? 'Đang lưu…' : isNew ? 'Tạo người dùng' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      ) : user && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
            <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5 sm:flex-row sm:items-center sm:p-7">
              <UserAvatar user={user} size="large" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-black">{user.fullName}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2"><RoleBadge role={user.role} /><StatusBadge status={user.status} /></div>
              </div>
            </div>
            <div className="p-5 sm:p-7">
              <h3 className="text-sm font-extrabold">Thông tin liên hệ</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoItem icon={<Mail className="size-4" />} label="Email" value={user.email} />
                <InfoItem icon={<Phone className="size-4" />} label="Số điện thoại" value={user.phone || 'Chưa cập nhật'} />
              </div>
              <div className="my-6 border-t border-border" />
              <h3 className="text-sm font-extrabold">Thông tin tài khoản</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoItem icon={<ShieldCheck className="size-4" />} label="Vai trò" value={USER_ROLE_LABELS[user.role]} />
                <InfoItem icon={<BadgeCheck className="size-4" />} label="Xác thực email" value={user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'} verified={user.emailVerified} />
                <InfoItem icon={<CalendarDays className="size-4" />} label="Ngày tạo tài khoản" value={dateFmt.format(new Date(user.createdAt))} />
                <InfoItem icon={<Clock3 className="size-4" />} label="Đăng nhập gần nhất" value={user.lastLoginAt ? dateFmt.format(new Date(user.lastLoginAt)) : 'Chưa ghi nhận'} />
              </div>
            </div>
          </section>
          <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mã người dùng</p>
            <p className="mt-2 break-all font-mono text-sm font-bold">{user.id}</p>
            <div className="my-5 border-t border-border" />
            <p className="text-xs leading-relaxed text-muted-foreground">Thông tin hồ sơ được quản lý bởi quản trị viên. Mật khẩu và dữ liệu xác thực không hiển thị tại đây.</p>
            <button onClick={() => { setForm(toFormState(user)); setError(''); setEditing(true) }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-brand-foreground transition hover:brightness-105">
              <Edit3 className="size-4" /> Chỉnh sửa hồ sơ
            </button>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={`Xóa tài khoản ${user?.fullName ?? ''}?`}
        description={<>Tài khoản này sẽ bị xóa khỏi danh sách quản lý. Thao tác này không thể hoàn tác.</>}
        confirmLabel="Xóa tài khoản"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteUser()}
      />
    </div>
  )
}

function toFormState(user: ManagedUser): UserFormState {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    password: '',
  }
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold">{label}<span className="mt-2 block">{children}</span></label>
}

function InfoItem({ icon, label, value, verified }: { icon: React.ReactNode; label: string; value: string; verified?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 rounded-xl p-2 ${verified === false ? 'bg-amber-500/10 text-amber-600' : 'bg-brand/10 text-brand'}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'
