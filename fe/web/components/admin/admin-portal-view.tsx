'use client'

import { useState } from 'react'
import {
  Crown,
  Users,
  ShieldCheck,
  FileText,
  Layers,
  Star,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  DollarSign,
  BarChart3,
  Search,
} from 'lucide-react'
import { useApp } from '../app-store'
import { CATEGORIES, formatVND } from '@/lib/data'
import { Avatar } from '../shared'
import { cn } from '@/lib/utils'

export function AdminPortalView() {
  const {
    adminTab,
    setAdminTab,
    usersList,
    policies,
    createPolicy,
    deletePolicy,
    verifications,
    approveVerification,
    bookings,
  } = useApp()

  // New policy state
  const [newPolTitle, setNewPolTitle] = useState('')
  const [newPolCat, setNewPolCat] = useState('Chính sách chung')
  const [newPolContent, setNewPolContent] = useState('')
  const [showAddPolicy, setShowAddPolicy] = useState(false)

  // User search
  const [userQuery, setUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'provider' | 'staff' | 'admin'>('all')

  const filteredUsers = usersList.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchQuery =
      u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userQuery.toLowerCase())
    return matchRole && matchQuery
  })

  const handleAddPolicySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPolTitle.trim() || !newPolContent.trim()) return
    createPolicy({
      title: newPolTitle.trim(),
      category: newPolCat,
      content: newPolContent.trim(),
      effectiveDate: '01/10/2026',
      status: 'active',
    })
    setNewPolTitle('')
    setNewPolContent('')
    setShowAddPolicy(false)
  }

  // AI Sentiment insights
  const aiInsights = [
    {
      title: 'Dự báo bùng nổ nhu cầu vệ sinh & nạp gas máy lạnh',
      category: 'Dự báo mùa cao điểm',
      confidence: '94%',
      impact: 'Doanh thu dự kiến +38%',
      desc: 'Dữ liệu thời tiết cho thấy đợt nắng nóng sắp tới sẽ làm tăng 45% nhu cầu bảo dưỡng điện lạnh. Đề xuất tăng duyệt thêm 15 thợ điện lạnh tại khu vực TP. Thủ Đức & Quận 7.',
    },
    {
      title: 'Phân tích phản hồi khách hàng (Sentiment Analysis)',
      category: 'Chất lượng dịch vụ',
      confidence: '98%',
      impact: 'Tỉ lệ hài lòng đạt 94.2%',
      desc: 'Từ khóa tích cực nổi bật: "đúng giờ", "báo giá minh bạch", "tay nghề khéo". 3 phản ánh tiêu cực tập trung vào việc thiếu dụng cụ chuyên dụng của thợ mới.',
    },
    {
      title: 'Đề xuất tối ưu hóa giá sàn dịch vụ',
      category: 'Tối ưu doanh thu',
      confidence: '91%',
      impact: 'Lợi nhuận thợ +15%',
      desc: 'Khung giá dịch vụ Điện nước hiện đang thấp hơn 8% so với thị trường ngoài giờ hành chính (sau 18h). Khuyến nghị áp dụng hệ số 1.2 cho ca tối.',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-8 text-white shadow-xl mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Admin Control Center · Quản Trị Hệ Thống
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white/90">
                <Crown className="size-4" /> Toàn quyền hệ thống
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">
              Bảng Điều Hành Trung Tâm & Trí Tuệ Nhân Tạo AI
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-2xl">
              Quản trị người dùng (Users), chính sách nền tảng (Policies), danh mục dịch vụ (Categories), phân tích đánh giá và sinh báo cáo kinh doanh thông minh.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[120px]">
              <span className="block text-2xl font-black">2.4 tỷ ₫</span>
              <span className="text-[11px] text-white/80 font-medium">GMV Tháng 9</span>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 text-center min-w-[110px]">
              <span className="block text-2xl font-black">{usersList.length}</span>
              <span className="text-[11px] text-white/80 font-medium">Tài khoản</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'dashboard'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <BarChart3 className="size-4" />
          <span>Dashboard & AI Insights</span>
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Users className="size-4" />
          <span>Quản lý người dùng (CRUD Users)</span>
        </button>

        <button
          onClick={() => setAdminTab('policies')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'policies'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <FileText className="size-4" />
          <span>Chính sách hệ thống (CRUD Policies)</span>
        </button>

        <button
          onClick={() => setAdminTab('categories')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'categories'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Layers className="size-4" />
          <span>Danh mục dịch vụ (Categories/Service)</span>
        </button>

        <button
          onClick={() => setAdminTab('reviews')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all shrink-0',
            adminTab === 'reviews'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <Star className="size-4" />
          <span>Phân tích đánh giá (Analyze Reviews)</span>
        </button>
      </div>

      {/* ────────────────── 1. DASHBOARD & AI INSIGHTS ────────────────── */}
      {adminTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tổng doanh thu nền tảng</span>
              <p className="text-2xl font-black text-purple-600 mt-2">2,450,000,000 ₫</p>
              <span className="text-[11px] text-emerald-600 font-semibold">↑ 18.5% so với kỳ trước</span>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Tổng đơn hoàn thành</span>
              <p className="text-2xl font-black text-foreground mt-2">4,890 đơn</p>
              <span className="text-[11px] text-emerald-600 font-semibold">97.4% tỷ lệ hoàn tất</span>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Khách hàng mới (30 ngày)</span>
              <p className="text-2xl font-black text-blue-600 mt-2">+1,240</p>
              <span className="text-[11px] text-muted-foreground">Tăng trưởng ổn định</span>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="text-xs text-muted-foreground font-bold">Thợ đã xác thực</span>
              <p className="text-2xl font-black text-amber-600 mt-2">328 đối tác</p>
              <span className="text-[11px] text-emerald-600 font-semibold">100% hồ sơ CCCD</span>
            </div>
          </div>

          {/* AI Insights Section according to Use Case: Generate business insights */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-xl bg-purple-600 text-white">
                <BrainCircuit className="size-4" />
              </div>
              <h2 className="text-lg font-black text-foreground">
                Đề Xuất & Báo Cáo Kinh Doanh Thông Minh (AI Business Insights)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.map((ins, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-card p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:text-purple-300">
                      {ins.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      Độ tin cậy: {ins.confidence}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-foreground">
                    {ins.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ins.desc}
                  </p>
                  <div className="border-t border-border/80 pt-2 text-[11px] font-bold text-purple-600">
                    Tác động: {ins.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 2. CRUD USERS VIEW ────────────────── */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Quản lý Người Dùng Hệ Thống ({filteredUsers.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo Use Case: Create / View / Update / Delete Users
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'customer', 'provider', 'staff', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-bold transition-all uppercase',
                    roleFilter === r
                      ? 'bg-purple-600 text-white'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email người dùng..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* User Table */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Người dùng</th>
                    <th className="px-5 py-3">Vai trò</th>
                    <th className="px-5 py-3">Số điện thoại</th>
                    <th className="px-5 py-3">Địa chỉ</th>
                    <th className="px-5 py-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={u.name.slice(0, 2).toUpperCase()}
                            className="size-9"
                            color="bg-purple-600 text-white font-bold"
                          />
                          <div>
                            <p className="font-bold text-foreground text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase',
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-600'
                              : u.role === 'staff'
                              ? 'bg-blue-500/10 text-blue-600'
                              : u.role === 'provider'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-teal-500/10 text-teal-600',
                          )}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-foreground font-medium">
                        {u.phone}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {u.address || 'Chưa cập nhật'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="size-3" />
                          Hoạt động
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 3. CRUD POLICIES VIEW ────────────────── */}
      {adminTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Chính Sách & Quy Định Nền Tảng ({policies.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo Use Case: Create / View / Update / Delete Policies
              </p>
            </div>
            <button
              onClick={() => setShowAddPolicy((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-all"
            >
              <Plus className="size-4" />
              <span>Thêm chính sách mới</span>
            </button>
          </div>

          {showAddPolicy && (
            <form
              onSubmit={handleAddPolicySubmit}
              className="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3.5 animate-in fade-in"
            >
              <h3 className="text-sm font-black text-purple-700 dark:text-purple-400">
                Thêm chính sách nền tảng mới:
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Tiêu đề chính sách..."
                  value={newPolTitle}
                  onChange={(e) => setNewPolTitle(e.target.value)}
                  className="rounded-2xl border border-border bg-background p-2.5 text-sm outline-none focus:border-purple-600"
                />
                <input
                  type="text"
                  placeholder="Phân loại (vd: Bảo hành, Hoàn tiền...)"
                  value={newPolCat}
                  onChange={(e) => setNewPolCat(e.target.value)}
                  className="rounded-2xl border border-border bg-background p-2.5 text-sm outline-none focus:border-purple-600"
                />
              </div>
              <textarea
                rows={3}
                required
                placeholder="Nội dung điều khoản chi tiết..."
                value={newPolContent}
                onChange={(e) => setNewPolContent(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-purple-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPolicy(false)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
                >
                  Đăng chính sách
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-black text-purple-600 uppercase">
                      {p.category}
                    </span>
                    <button
                      onClick={() => deletePolicy(p.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-lg"
                      title="Xóa chính sách"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {p.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Hiệu lực từ: {p.effectiveDate}</span>
                  <span className="font-bold text-emerald-600">Đang áp dụng</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────── 4. CATEGORIES VIEW ────────────────── */}
      {adminTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Quản lý Danh mục & Bảng giá Dịch vụ ({CATEGORIES.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo Use Case: Create / View / Update / Delete Categories / Service
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((c) => (
              <div
                key={c.name}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={cn('size-12 rounded-2xl flex items-center justify-center text-white', c.tint)}>
                    <Layers className="size-6" />
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    Đang hoạt động
                  </span>
                </div>
                <h3 className="text-base font-black text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Giá sàn đề xuất: <span className="font-bold text-foreground">150.000 ₫ - 500.000 ₫</span>
                </p>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button className="flex-1 rounded-xl border border-border py-1.5 text-xs font-bold hover:bg-muted">
                    Chỉnh sửa giá
                  </button>
                  <button className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10">
                    Tắt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────── 5. ANALYZE REVIEWS VIEW ────────────────── */}
      {adminTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Phân Tích Đánh Giá & Mức Độ Hài Lòng
              </h2>
              <p className="text-xs text-muted-foreground">
                Theo Use Case: Analyze Reviews bằng AI Sentiment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-2">
              <span className="text-xs text-muted-foreground font-bold">Điểm hài lòng trung bình</span>
              <p className="text-4xl font-black text-amber-500">4.88 / 5.0</p>
              <div className="flex justify-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Tổng cộng 3,420 đánh giá đã xác thực</p>
            </div>

            <div className="col-span-2 rounded-3xl border border-border bg-card p-6 space-y-3">
              <h3 className="text-sm font-black text-foreground">
                Phân bổ xếp hạng sao
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-12 font-bold">5 sao</span>
                  <div className="flex-1 rounded-full bg-muted h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[86%]" />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">86%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-12 font-bold">4 sao</span>
                  <div className="flex-1 rounded-full bg-muted h-3 overflow-hidden">
                    <div className="bg-teal-500 h-full w-[10%]" />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">10%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-12 font-bold">1-3 sao</span>
                  <div className="flex-1 rounded-full bg-muted h-3 overflow-hidden">
                    <div className="bg-rose-500 h-full w-[4%]" />
                  </div>
                  <span className="w-10 text-right text-rose-600 font-bold">4%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
