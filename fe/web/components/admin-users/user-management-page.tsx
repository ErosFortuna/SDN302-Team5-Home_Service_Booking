'use client'

import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
  Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/admin-categories/controls'
import { useToast } from '@/components/provider-booking/toast'
import { UserDetailPage } from './user-detail-page'
import { RoleBadge, StatusBadge, UserAvatar } from './user-badges'
import { adminUsersApi } from '@/lib/api/admin-users'
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type ManagedUser,
  type ManagedUserRole,
  type ManagedUserStatus,
  type ManagedUserStats,
} from '@/lib/admin-users'
import { getErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 8
const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })

export function UserManagementPage({ embedded }: { embedded: boolean }) {
  const toast = useToast()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<ManagedUserStats | null>(null)
  const [meta, setMeta] = useState<{ page: number; total: number; totalPages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'all' | ManagedUserRole>('all')
  const [status, setStatus] = useState<'all' | ManagedUserStatus>('all')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setLoading(true)
      setLoadError('')
      adminUsersApi.list({
        search: search.trim() || undefined,
        role,
        status,
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }, controller.signal)
        .then((response) => {
          setUsers(response.data)
          setMeta(response.meta)
          setStats(response.meta.stats)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setLoadError(getErrorMessage(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, search ? 300 : 0)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [search, role, status, page, reloadKey])

  useEffect(() => setPage(1), [search, role, status])

  const removeUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminUsersApi.delete(deleteTarget.id)
      toast.success(`Đã xóa tài khoản ${deleteTarget.fullName}`)
      setDeleteTarget(null)
      if (users.length === 1 && page > 1) setPage((current) => current - 1)
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  if (embedded && selectedUserId) {
    return (
      <UserDetailPage
        userId={selectedUserId}
        embedded
        onBack={() => setSelectedUserId(null)}
        onCreated={(id) => setSelectedUserId(id)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Quản lý người dùng</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Theo dõi tài khoản, vai trò và trạng thái hoạt động trên nền tảng.
          </p>
        </div>
        <button
          onClick={() => setSelectedUserId('new')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:brightness-105 active:scale-95"
        >
          <Plus className="size-4" strokeWidth={3} /> Thêm người dùng
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users className="size-5" />} label="Tổng tài khoản" value={stats?.total} tone="bg-brand" />
        <StatCard icon={<CircleCheck className="size-5" />} label="Đang hoạt động" value={stats?.active} tone="bg-emerald-500" />
        <StatCard icon={<ShieldCheck className="size-5" />} label="Đối tác dịch vụ" value={stats?.providers} tone="bg-amber-500" />
        <StatCard icon={<CircleX className="size-5" />} label="Đã khóa" value={stats?.blocked} tone="bg-rose-500" />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Tìm người dùng"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, email hoặc số điện thoại…"
            className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Xóa tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc theo vai trò"
            value={role}
            onChange={(event) => setRole(event.target.value as 'all' | ManagedUserRole)}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-xs font-bold outline-none focus:border-brand"
          >
            <option value="all">Tất cả vai trò</option>
            {Object.entries(USER_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | ManagedUserStatus)}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-xs font-bold outline-none focus:border-brand"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(USER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
        {loadError ? (
          <div role="alert" className="px-6 py-14 text-center">
            <CircleX className="mx-auto size-8 text-destructive" />
            <p className="mt-3 font-bold">Không thể tải dữ liệu người dùng</p>
            <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
            <button onClick={() => setReloadKey((key) => key + 1)} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground">Thử lại</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><span className="size-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-label="Đang tải" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Người dùng</th>
                    <th className="px-4 py-3.5">Vai trò</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="hidden px-4 py-3.5 lg:table-cell">Ngày tham gia</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{user.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                      <td className="hidden px-4 py-4 text-xs text-muted-foreground lg:table-cell">{dateFmt.format(new Date(user.createdAt))}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setSelectedUserId(user.id)} title="Xem chi tiết" aria-label={`Xem ${user.fullName}`} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand">
                            <Eye className="size-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(user)} title="Xóa người dùng" aria-label={`Xóa ${user.fullName}`} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="px-6 py-14 text-center">
                <Search className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 font-bold">Không tìm thấy người dùng</p>
                <p className="mt-1 text-sm text-muted-foreground">Hãy thử thay đổi từ khóa hoặc bộ lọc.</p>
              </div>
            )}
            {!!meta?.total && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:flex-row">
                <span>Hiển thị <b className="text-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)}</b> trên <b className="text-foreground">{meta.total}</b> người dùng</span>
                <div className="flex items-center gap-2">
                  <button aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg p-2 hover:bg-muted disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                  <span className="font-bold text-foreground">Trang {page} / {meta.totalPages}</span>
                  <button aria-label="Trang sau" disabled={page >= meta.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg p-2 hover:bg-muted disabled:opacity-40"><ChevronRight className="size-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Xóa tài khoản ${deleteTarget?.fullName ?? ''}?`}
        description={<>Tài khoản có dữ liệu lịch sử sẽ không thể xóa để bảo toàn booking và các giao dịch liên quan.</>}
        confirmLabel="Xóa tài khoản"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void removeUser()}
      />
    </div>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value?: number; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-xs animate-fade-up">
      <span className={cn('flex size-10 items-center justify-center rounded-2xl text-white shadow-md', tone)}>{icon}</span>
      <p className="mt-3 text-xs font-bold text-muted-foreground">{label}</p>
      {value === undefined ? <div className="mt-1 h-7 w-12 animate-pulse rounded-lg bg-muted" /> : <p className="text-2xl font-black tracking-tight">{value}</p>}
    </div>
  )
}
