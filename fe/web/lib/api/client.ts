/**
 * Minimal fetch wrapper for the Home Service Booking API.
 *
 * Requests go to `/api/*` on the Next.js origin and are proxied to the
 * Express backend via `rewrites()` in next.config.mjs — no CORS setup needed,
 * and it also works when the site is opened from a LAN IP.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api'
const TOKEN_KEY = 'hsb_token'
const USER_KEY = 'hsb_user'
export const AUTH_CHANGED_EVENT = 'hsb:auth-changed'

export interface SessionUser {
  id: string
  fullName: string
  email: string
  role: 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN'
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const isBrowser = () => typeof window !== 'undefined'
const notifyAuthChanged = () => isBrowser() && window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))

export const authStorage = {
  getToken: () => (isBrowser() ? localStorage.getItem(TOKEN_KEY) : null),
  getUser(): SessionUser | null {
    if (!isBrowser()) return null
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
    } catch {
      return null
    }
  },
  setSession(token: string, user: SessionUser) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    notifyAuthChanged()
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    notifyAuthChanged()
  },
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const token = authStorage.getToken()

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.')
  }

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 && token) authStorage.clear()
    throw new ApiError(res.status, payload.message ?? `Request failed (${res.status})`, payload.details)
  }
  return payload as T
}

export const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định'
