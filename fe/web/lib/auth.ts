import type { Role, UserAccount } from './types'

type ApiRole = 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN'

export interface ApiUser {
  id: string
  fullName: string
  email: string
  phone?: string
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
export const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
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