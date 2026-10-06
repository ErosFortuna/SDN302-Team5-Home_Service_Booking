'use client'

import { useState } from 'react'
import {
  X,
  User,
  Wrench,
  ShieldCheck,
  Crown,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Briefcase,
  FileText,
  BadgeCheck,
} from 'lucide-react'
import { useApp, type AuthMode } from '../app-store'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export function WebAuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    login,
    registerCustomer,
    registerProvider,
    setCurrentUser,
    setRole,
  } = useApp()

  // Form states for Customer
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custPass, setCustPass] = useState('')
  const [custAddress, setCustAddress] = useState('')

  // Form states for Provider
  const [provName, setProvName] = useState('')
  const [provEmail, setProvEmail] = useState('')
  const [provPhone, setProvPhone] = useState('')
  const [provPass, setProvPass] = useState('')
  const [provAddress, setProvAddress] = useState('')
  const [provExp, setProvExp] = useState(3)
  const [provIdCard, setProvIdCard] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Điện nước',
    'Sửa ống nước',
  ])

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!authModalOpen) return null

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!loginEmail.trim()) {
      setErrorMsg('Vui lòng nhập email hoặc chọn vai trò nhanh bên dưới.')
      return
    }
    if (!loginPass) {
      setErrorMsg('Vui lòng nhập mật khẩu để đăng nhập bằng tài khoản API.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPass }),
      })
      const result = await response.json() as {
        user?: { id: string; fullName: string; email: string; role: string; phone?: string }
        token?: string
        message?: string
      }
      if (!response.ok || !result.user || !result.token) {
        throw new Error(result.message || 'Email hoặc mật khẩu không chính xác.')
      }

      const role = result.user.role.toLowerCase() as Role
      localStorage.setItem('homehero_access_token', result.token)
      login(result.user.email)
      setCurrentUser({
        id: result.user.id,
        name: result.user.fullName,
        email: result.user.email,
        role,
        phone: result.user.phone || '',
        avatar: result.user.fullName.slice(0, 2).toUpperCase(),
      })
      setRole(role)
    } catch (loginError) {
      setErrorMsg(loginError instanceof Error ? loginError.message : 'Không thể kết nối tới máy chủ.')
    }
  }

  const handleCustRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim() || !custEmail.trim() || !custPhone.trim()) {
      setErrorMsg('Vui lòng điền đủ họ tên, email và số điện thoại.')
      return
    }
    registerCustomer({
      name: custName.trim(),
      email: custEmail.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim() || 'Quận 1, TP.HCM',
      password: custPass,
    })
  }

  const handleProvRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!provName.trim() || !provEmail.trim() || !provPhone.trim()) {
      setErrorMsg('Vui lòng điền đủ tên thợ, email và số điện thoại.')
      return
    }
    registerProvider({
      name: provName.trim(),
      email: provEmail.trim(),
      phone: provPhone.trim(),
      address: provAddress.trim() || 'TP.HCM',
      skills: selectedSkills,
      experienceYears: provExp,
      identityCard: provIdCard.trim() || '079095012345',
      password: provPass,
    })
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const allSkills = [
    'Điện nước',
    'Điện lạnh',
    'Đồ gia dụng',
    'Sơn sửa nhà',
    'Dọn dẹp',
    'Sửa khóa cửa',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        aria-label="Đóng modal"
        onClick={closeAuthModal}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header with Title and Mode Switcher */}
        <div className="border-b border-border bg-gradient-to-r from-brand/10 via-background to-background p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-md shadow-brand/20">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  HomeHero Auth
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hệ thống phân quyền theo Use Case Diagram
                </p>
              </div>
            </div>
            <button
              onClick={closeAuthModal}
              className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-muted/60 p-1 text-xs font-bold">
            <button
              onClick={() => {
                setAuthMode('login')
                setErrorMsg('')
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all',
                authMode === 'login'
                  ? 'bg-card text-brand shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>Đăng nhập</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('register_customer')
                setErrorMsg('')
              }}
              className={cn(
                'flex items-center justify-center gap-1 rounded-xl py-2 transition-all',
                authMode === 'register_customer'
                  ? 'bg-card text-brand shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User className="size-3.5" />
              <span>ĐK Khách</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('register_provider')
                setErrorMsg('')
              }}
              className={cn(
                'flex items-center justify-center gap-1 rounded-xl py-2 transition-all',
                authMode === 'register_provider'
                  ? 'bg-card text-brand shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Wrench className="size-3.5" />
              <span>ĐK Thợ</span>
            </button>
          </div>
        </div>

        {/* Body Content by Mode */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              {errorMsg}
            </div>
          )}

          {/* ────────────────── 1. LOGIN TAB ────────────────── */}
          {authMode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Email hoặc Tên đăng nhập
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="vd: customer@homehero.vn hoặc admin"
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 transition-all active:scale-95"
                >
                  Đăng nhập vào hệ thống
                </button>
              </form>

              {/* Quick 1-Click Role Login according to Use Case Diagram */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-extrabold text-foreground mb-1 text-center">
                  ⚡ Đăng nhập 1-chạm theo 4 Role Use Case
                </p>
                <p className="text-[11px] text-muted-foreground text-center mb-3">
                  Hệ thống tự động chuyển đúng giao diện theo quyền
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Customer Button */}
                  <button
                    onClick={() => login('customer')}
                    className="flex flex-col items-start p-3 rounded-2xl border border-border bg-muted/30 hover:bg-secondary/60 hover:border-brand transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-7 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 font-bold group-hover:bg-brand group-hover:text-white transition-colors">
                        <User className="size-4" />
                      </div>
                      <span className="text-xs font-extrabold text-foreground">
                        Khách hàng
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Đặt dịch vụ, xem thợ, thanh toán, khiếu nại
                    </span>
                  </button>

                  {/* Provider Button */}
                  <button
                    onClick={() => login('provider')}
                    className="flex flex-col items-start p-3 rounded-2xl border border-border bg-muted/30 hover:bg-secondary/60 hover:border-brand transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Wrench className="size-4" />
                      </div>
                      <span className="text-xs font-extrabold text-foreground">
                        Thợ đối tác
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Nhận việc, gửi báo giá, cập nhật trạng thái
                    </span>
                  </button>

                  {/* Staff Button */}
                  <button
                    onClick={() => login('staff')}
                    className="flex flex-col items-start p-3 rounded-2xl border border-border bg-muted/30 hover:bg-secondary/60 hover:border-brand transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ShieldCheck className="size-4" />
                      </div>
                      <span className="text-xs font-extrabold text-foreground">
                        Staff CSKH
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Xử lý khiếu nại, duyệt thợ, hỗ trợ hủy lịch
                    </span>
                  </button>

                  {/* Admin Button */}
                  <button
                    onClick={() => login('admin')}
                    className="flex flex-col items-start p-3 rounded-2xl border border-border bg-muted/30 hover:bg-secondary/60 hover:border-brand transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Crown className="size-4" />
                      </div>
                      <span className="text-xs font-extrabold text-foreground">
                        Quản trị Admin
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      CRUD người dùng, chính sách, danh mục, AI
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── 2. REGISTER CUSTOMER ────────────────── */}
          {authMode === 'register_customer' && (
            <form onSubmit={handleCustRegister} className="space-y-3.5">
              <div className="rounded-2xl bg-secondary/50 p-3 text-xs text-brand font-medium flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Đăng ký tài khoản Khách hàng để đặt lịch sửa chữa tức thì</span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Họ và tên
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="vd: Nguyễn Thị Thanh"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="thanh@gmail.com"
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Địa chỉ mặc định (Quận / Huyện)
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="vd: 45 Nguyễn Huệ, Quận 1, TP.HCM"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={custPass}
                    onChange={(e) => setCustPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 transition-all active:scale-95"
              >
                Đăng ký Khách hàng & Vào trang chủ
              </button>
            </form>
          )}

          {/* ────────────────── 3. REGISTER PROVIDER ────────────────── */}
          {authMode === 'register_provider' && (
            <form onSubmit={handleProvRegister} className="space-y-3.5">
              <div className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
                <BadgeCheck className="size-4 shrink-0 text-amber-600" />
                <span>
                  Đăng ký trở thành Thợ đối tác HomeHero để nhận việc và gia tăng thu nhập
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Tên Thợ hoặc Đội ngũ dịch vụ
                </label>
                <div className="relative flex items-center">
                  <Wrench className="absolute left-3.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="vd: Thợ Sửa Điện Nước Phát Đạt"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    required
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="tho@gmail.com"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3.5 text-sm outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Số điện thoại thợ
                  </label>
                  <input
                    type="tel"
                    required
                    value={provPhone}
                    onChange={(e) => setProvPhone(e.target.value)}
                    placeholder="0908 999 111"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3.5 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={provIdCard}
                    onChange={(e) => setProvIdCard(e.target.value)}
                    placeholder="079095001234"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3.5 text-sm outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Kinh nghiệm (năm)
                  </label>
                  <select
                    value={provExp}
                    onChange={(e) => setProvExp(Number(e.target.value))}
                    className="w-full rounded-2xl border border-border bg-background py-2.5 px-3.5 text-sm outline-none focus:border-brand"
                  >
                    <option value={1}>1 năm kinh nghiệm</option>
                    <option value={3}>3 năm kinh nghiệm</option>
                    <option value={5}>5 năm kinh nghiệm</option>
                    <option value={10}>10+ năm kinh nghiệm</option>
                  </select>
                </div>
              </div>

              {/* Skills Selector */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Lĩnh vực chuyên môn (chọn nhiều)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.map((sk) => {
                    const active = selectedSkills.includes(sk)
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => toggleSkill(sk)}
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                          active
                            ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                            : 'border-border bg-background text-muted-foreground hover:border-brand',
                        )}
                      >
                        {sk}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Khu vực hoạt động chính
                </label>
                <input
                  type="text"
                  value={provAddress}
                  onChange={(e) => setProvAddress(e.target.value)}
                  placeholder="vd: Quận 1, Quận 3, Bình Thạnh, TP.HCM"
                  className="w-full rounded-2xl border border-border bg-background py-2.5 px-3.5 text-sm outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-extrabold text-white shadow-md shadow-amber-500/20 hover:brightness-110 transition-all active:scale-95"
              >
                Gửi hồ sơ Đăng ký Thợ & Vào Dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
