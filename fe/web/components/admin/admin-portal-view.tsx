'use client'

import {
  Crown,
  Users,
  Layers,
  Star,
  BrainCircuit,
  BarChart3,
} from 'lucide-react'
import { useApp } from '../app-store'
import { ToastProvider } from '@/components/provider-booking/toast'
import { UserManagementPage } from '@/components/admin-users/user-management-page'
import { CategoryManagementPage } from '@/components/admin-categories/category-management-page'
import { cn } from '@/lib/utils'

export function AdminPortalView() {
  const {
    adminTab,
    setAdminTab,
    usersList,
    verifications,
    approveVerification,
    bookings,
  } = useApp()

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
              Quản trị người dùng, danh mục dịch vụ, phân tích đánh giá và sinh báo cáo kinh doanh thông minh.
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
          <span>Quản lý người dùng </span>
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
          <span>Danh mục dịch vụ</span>
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
        <ToastProvider>
          <UserManagementPage embedded />
        </ToastProvider>
      )}

      {/* ────────────────── 3. CATEGORIES VIEW ────────────────── */}
      {adminTab === 'categories' && (
        <ToastProvider>
          <CategoryManagementPage embedded />
        </ToastProvider>
      )}

      {/* ────────────────── 4. ANALYZE REVIEWS VIEW ────────────────── */}
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
