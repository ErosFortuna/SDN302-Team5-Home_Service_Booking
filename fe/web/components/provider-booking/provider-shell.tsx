'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Inbox, LoaderCircle, Lock, LogOut, Mail, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUTH_CHANGED_EVENT, authStorage, getErrorMessage, type SessionUser } from '@/lib/api/client'
import { authApi } from '@/lib/api/bookings'
import { ToastProvider } from './toast'

/**
 * Wraps /provider/* pages: toast context + real JWT login against the backend.
 * (The rest of the web app still uses mock auth from app-store.)
 */
export function ProviderShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined) // undefined = checking

  useEffect(() => {
    const sync = () => setUser(authStorage.getToken() ? authStorage.getUser() : null)
    sync()
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/provider/bookings" className="flex items-center gap-2 font-black tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                <Wrench className="size-4" />
              </span>
              Provider Workspace
            </Link>
            {user?.role === 'PROVIDER' && <ProviderNav />}
            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm font-semibold sm:block">{user.fullName}</span>
                <button
                  id="logout-button"
                  onClick={() => authStorage.clear()}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        {user === undefined ? (
          <div className="flex justify-center py-24">
            <LoaderCircle className="size-6 animate-spin text-brand" />
          </div>
        ) : user?.role === 'PROVIDER' ? (
          <main>{children}</main>
        ) : (
          <ProviderLogin wrongRole={Boolean(user)} />
        )}
      </div>
    </ToastProvider>
  )
}

function ProviderNav() {
  const pathname = usePathname()
  const links = [
    { href: '/provider/requests', label: 'Yêu cầu mới', icon: Inbox },
    { href: '/provider/bookings', label: 'Công việc', icon: Briefcase },
  ]
  return (
    <nav className="mr-auto ml-6 hidden items-center gap-1 sm:flex">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            id={`nav-${href.split('/').pop()}`}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
              active ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" /> {label}
          </Link>
        )
      })}
    </nav>
  )
}

function ProviderLogin({ wrongRole }: { wrongRole: boolean }) {
  const [email, setEmail] = useState('provider.demo@homecare.local')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(wrongRole ? 'Tài khoản hiện tại không phải thợ (PROVIDER).' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.login(email.trim(), password)
      if (user.role !== 'PROVIDER') {
        setError('Chỉ tài khoản thợ (PROVIDER) mới truy cập được khu vực này.')
        return
      }
      authStorage.setSession(token, user)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20'

  return (
    <div className="mx-auto max-w-sm px-4 py-20 animate-fade-up">
      <div className="rounded-3xl border border-border bg-card p-7 shadow-xl">
        <h1 className="text-xl font-black tracking-tight">Đăng nhập thợ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quản lý tiến độ công việc của bạn.</p>

        {error && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 size-4 text-muted-foreground" />
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
          </div>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 size-4 text-muted-foreground" />
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className={inputCls} />
          </div>
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/20 transition-all hover:brightness-110 disabled:opacity-60"
          >
            {loading && <LoaderCircle className="size-4 animate-spin" />} Đăng nhập
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Tài khoản demo: <code>provider.demo@homecare.local</code> / <code>Demo123!</code>
        </p>
      </div>
    </div>
  )
}
