import type { Role, UserAccount } from './types'
import { buildApiUrl, getApiBaseUrl } from '@/lib/api/base-url'

type ApiRole = 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN'

export interface ApiUser {
  id: string
  fullName: string
  email: string
  phone?: string
  address?: string
  role: ApiRole
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  emailVerified: boolean
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data?: T
  errors?: Array<{ field?: string; message?: string }>
}

interface AuthData {
  user: ApiUser
  accessToken: string
}

export type GoogleAuthResult =
  | { verificationRequired: true; email: string }
  | { verificationRequired?: false; user: ApiUser; accessToken: string }

const API_BASE_URL = getApiBaseUrl()
export const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  let response: Response

  try {
    response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'web',
        ...options.headers,
      },
    })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Yêu cầu quá thời gian chờ. Hãy kiểm tra API và kết nối mạng.'
      : `Không thể kết nối API tại ${API_BASE_URL}. Hãy kiểm tra backend và NEXT_PUBLIC_API_URL.`
    throw new Error(message)
  } finally {
    clearTimeout(timeout)
  }

  const body = await response.json().catch(() => null) as ApiEnvelope<T> | null
  if (!response.ok || !body?.data) {
    const validationMessage = body?.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join('\n')
    throw new Error(validationMessage || body?.message || 'Yêu cầu xác thực thất bại.')
  }

  return body
}

export function toUserAccount(user: ApiUser): UserAccount {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role.toLowerCase() as Role,
    phone: user.phone || '',
    address: user.address || '',
    avatar: user.fullName.slice(0, 2).toUpperCase(),
  }
}

export async function loginWithPassword(email: string, password: string) {
  const result = await request<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return result.data!
}

export async function loginWithGoogle(idToken: string, role: 'CUSTOMER' | 'PROVIDER') {
  const result = await request<GoogleAuthResult>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, role }),
  })
  return result.data!
}

export async function registerWithPassword(input: {
  fullName: string
  email: string
  phone: string
  password: string
  address?: string
  role: 'CUSTOMER' | 'PROVIDER'
}) {
  const result = await request<{ email: string; verificationRequired: boolean }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return result.data!
}

export async function verifyEmailCode(email: string, code: string) {
  const result = await request<AuthData>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  return result.data!
}

export async function resendEmailCode(email: string) {
  await request<Record<string, never>>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function getCurrentUser(token: string) {
  const result = await request<ApiUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return result.data!
}

export async function updateCurrentUser(
  token: string,
  input: { fullName?: string; phone?: string; address?: string; avatarUrl?: string; currentPassword?: string }
) {
  const result = await request<ApiUser>('/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  return result.data!
}

export async function requestPasswordReset(email: string) {
  const result = await request<Record<string, unknown>>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return result
}

export async function resetPasswordWithCode(input: {
  email: string
  code: string
  newPassword: string
}) {
  const result = await request<Record<string, unknown>>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result
}

export async function logoutUser(token?: string) {
  try {
    const csrfToken = typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|; )hsb_csrf_token=([^;]*)/)?.[1]
      : null
    await request<Record<string, unknown>>('/auth/logout', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {}),
      },
    })
  } catch {
    // Ignore network failure on logout
  }
}
