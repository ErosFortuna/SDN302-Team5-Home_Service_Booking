'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LoaderCircle, Lock, LogOut, Mail, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUTH_CHANGED_EVENT, authStorage, getErrorMessage, type SessionUser } from '@/lib/api/client'
import { authApi } from '@/lib/api/bookings'
import { ToastProvider } from '@/components/provider-booking/toast'

export interface WorkspaceNavLink {
  href: string
  label: string
  icon: LucideIcon
}

interface WorkspaceShellProps {
  /** Only users with this role may see the children. */
  role: SessionUser['role']
  title: string
  icon: LucideIcon
  homeHref: string
  nav: WorkspaceNavLink[]
  login: { heading: string; subheading: string; demoEmail: string; roleLabel: string }
  /** Tailwind classes for the logo badge. */
  accentClass?: string
  children: ReactNode
}

/**
 * Role-gated workspace layout: toast context + real JWT login against the backend.
 * Used by /provider/* and /admin/*. (The legacy landing page still uses mock auth.)
 */
export function WorkspaceShell({ role, title, icon: Icon, homeHref, nav, login, accentClass = 'bg-brand text-brand-foreground', children }: WorkspaceShellProps) {
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

  const authorized = user?.role === role

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href={homeHref} className="flex items-center gap-2 font-black tracking-tight">
              <span className={cn('flex size-8 items-center justify-center rounded-xl', accentClass)}>
                <Icon className="size-4" />
              </span>
              {title}
            </Link>
            {authorized && <WorkspaceNav links={nav} />}
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
        ) : authorized ? (
          <main>{children}</main>
        ) : (
          <WorkspaceLogin role={role} wrongRole={Boolean(user)} {...login} />
        )}
      </div>
    </ToastProvider>
  )
}

function WorkspaceNav({ links }: { links: WorkspaceNavLink[] }) {
  const pathname = usePathname()
  return (
    <nav className="ml-6 mr-auto hidden items-center gap-1 sm:flex">
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

function WorkspaceLogin({ role, wrongRole, heading, subheading, demoEmail, roleLabel }: {
  role: SessionUser['role']
  wrongRole: boolean
  heading: string
  subheading: string
  demoEmail: string
  roleLabel: string
}) {
  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(wrongRole ? `Tài khoản hiện tại không phải ${roleLabel} (${role}).` : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.login(email.trim(), password)
      if (user.role !== role) {
        setError(`Chỉ tài khoản ${roleLabel} (${role}) mới truy cập được khu vực này.`)
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
        <h1 className="text-xl font-black tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>

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
          Tài khoản demo: <code>{demoEmail}</code> / <code>Demo123!</code>
        </p>
      </div>
    </div>
  )
}
