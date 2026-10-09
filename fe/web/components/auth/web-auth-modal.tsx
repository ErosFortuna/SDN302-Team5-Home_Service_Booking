'use client'

import { useState } from 'react'
import {
  X,
  User,
  Wrench,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
} from 'lucide-react'
import { useApp, type AuthMode } from '../app-store'
import { cn } from '@/lib/utils'
import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google'
import {
  GOOGLE_WEB_CLIENT_ID,
  loginWithGoogle,
  loginWithPassword,
  registerWithPassword,
  resendEmailCode,
  toUserAccount,
  verifyEmailCode,
} from '@/lib/auth'

export function WebAuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    login,
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
  const [pendingEmail, setPendingEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  if (!authModalOpen) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPass) {
      setErrorMsg('Vui lòng nhập email và mật khẩu.')
      return
    }
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const result = await loginWithPassword(loginEmail.trim(), loginPass)
      login(toUserAccount(result.user), result.accessToken)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập thất bại.'
      if (message.includes('Email verification is required')) {
        setPendingEmail(loginEmail.trim().toLowerCase())
        setAuthMode('verify_email')
        setStatusMsg('Tài khoản cần xác minh email trước khi đăng nhập.')
      } else {
        setErrorMsg(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCustRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim() || !custEmail.trim() || !custPhone.trim()) {
      setErrorMsg('Vui lòng điền đủ họ tên, email và số điện thoại.')
      return
    }
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const result = await registerWithPassword({
        fullName: custName.trim(),
        email: custEmail.trim(),
        phone: custPhone.replace(/\s/g, ''),
        password: custPass,
        role: 'CUSTOMER',
      })
      setPendingEmail(result.email)
      setVerificationCode('')
      setAuthMode('verify_email')
      setStatusMsg('Mã xác minh đã được gửi tới email của bạn.')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Đăng ký thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProvRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provName.trim() || !provEmail.trim() || !provPhone.trim()) {
      setErrorMsg('Vui lòng điền đủ tên thợ, email và số điện thoại.')
      return
    }
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const result = await registerWithPassword({
        fullName: provName.trim(),
        email: provEmail.trim(),
        phone: provPhone.replace(/\s/g, ''),
        password: provPass,
        role: 'PROVIDER',
      })
      setPendingEmail(result.email)
      setVerificationCode('')
      setAuthMode('verify_email')
      setStatusMsg('Mã xác minh đã được gửi tới email của bạn.')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Đăng ký thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (
    response: CredentialResponse,
    role: 'CUSTOMER' | 'PROVIDER',
  ) => {
    if (!response.credential) {
      setErrorMsg('Google không trả về thông tin xác thực.')
      return
    }
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const result = await loginWithGoogle(response.credential, role)
      if (result.verificationRequired) {
        setPendingEmail(result.email)
        setVerificationCode('')
        setResendMessage('')
        setAuthMode('verify_email')
        setStatusMsg('Mã xác minh Google đã được gửi tới email của bạn.')
        return
      }
      login(toUserAccount(result.user), result.accessToken)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Đăng nhập Google thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const result = await verifyEmailCode(pendingEmail, verificationCode)
      login(toUserAccount(result.user), result.accessToken)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Xác minh email thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    setErrorMsg('')
    setResendMessage('')
    try {
      await resendEmailCode(pendingEmail)
      setResendMessage('Nếu tài khoản cần xác minh, mã mới đã được gửi.')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể gửi lại mã.')
    }
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

  const renderGoogleSignIn = (role: 'CUSTOMER' | 'PROVIDER') => (
    <div className="flex flex-col items-center gap-2">
      {GOOGLE_WEB_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
          <GoogleLogin
            text="continue_with"
            shape="pill"
            onSuccess={(response) => void handleGoogleSuccess(response, role)}
            onError={() => setErrorMsg('Đăng nhập Google thất bại. Vui lòng thử lại.')}
          />
        </GoogleOAuthProvider>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Thêm NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID vào fe/web/.env.local để bật Google.
        </p>
      )}
    </div>
  )

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
          {authMode !== 'verify_email' && <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-muted/60 p-1 text-xs font-bold">
            <button
              onClick={() => {
                setAuthMode('login')
                setErrorMsg('')
                setStatusMsg('')
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
                setStatusMsg('')
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
                setStatusMsg('')
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
          </div>}
        </div>

        {/* Body Content by Mode */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              {errorMsg}
            </div>
          )}
          {statusMsg && (
            <div className="mb-4 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs font-semibold text-brand">
              {statusMsg}
            </div>
          )}

          {/* ────────────────── 1. LOGIN TAB ────────────────── */}
          {authMode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="email@example.com"
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
                      required
                      autoComplete="current-password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 transition-all active:scale-95"
                >
                  {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập vào hệ thống'}
                </button>
              </form>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-center text-xs font-bold text-muted-foreground">Hoặc đăng nhập bằng Google</p>
                {renderGoogleSignIn('CUSTOMER')}
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
                    required
                    minLength={8}
                    value={custPass}
                    onChange={(e) => setCustPass(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || custPass.length < 8}
                className="w-full rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 transition-all active:scale-95"
              >
                {isSubmitting ? 'Đang gửi mã…' : 'Đăng ký Khách hàng'}
              </button>
              <div className="flex justify-center border-t border-border pt-4">
                {renderGoogleSignIn('CUSTOMER')}
              </div>
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

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mật khẩu
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={provPass}
                    onChange={(e) => setProvPass(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
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
                disabled={isSubmitting || provPass.length < 8}
                className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-extrabold text-white shadow-md shadow-amber-500/20 hover:brightness-110 transition-all active:scale-95"
              >
                {isSubmitting ? 'Đang gửi mã…' : 'Đăng ký Thợ'}
              </button>
              <div className="flex justify-center border-t border-border pt-4">
                {renderGoogleSignIn('PROVIDER')}
              </div>
            </form>
          )}

          {authMode === 'verify_email' && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="rounded-2xl bg-secondary/50 p-4 text-center">
                <Mail className="mx-auto mb-2 size-6 text-brand" />
                <h3 className="font-bold text-foreground">Xác minh email</h3>
                <p className="mt-1 text-xs text-muted-foreground">Nhập mã 6 chữ số đã gửi tới {pendingEmail}.</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Đang xác minh…' : 'Xác minh và đăng nhập'}
              </button>
              <div className="text-center text-xs">
                {resendMessage && <p className="mb-2 text-brand">{resendMessage}</p>}
                <button type="button" onClick={() => void handleResendCode()} className="font-bold text-brand hover:underline">
                  Gửi lại mã
                </button>
                <button type="button" onClick={() => { setAuthMode('login'); setErrorMsg(''); setStatusMsg('') }} className="ml-4 text-muted-foreground hover:text-foreground">
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
