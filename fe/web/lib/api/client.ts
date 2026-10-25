
/**
 * API Client for Home Service Booking Web Frontend
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'hsb_token';
const USER_KEY = 'hsb_user';
const TOKEN_STORAGE_KEY = 'hsb_auth_token';

export const AUTH_CHANGED_EVENT = 'hsb:auth-changed';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'STAFF' | 'ADMIN';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: SessionUser;
  [key: string]: any;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isBrowser = () => typeof window !== 'undefined';

const notifyAuthChanged = () => {
  if (isBrowser()) {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
};

// Keep existing authStorage
export const authStorage = {
  getToken: (): string | null => {
    if (!isBrowser()) return null;

    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem('hsb_access_token')
    );
  },

  getUser(): SessionUser | null {
    if (!isBrowser()) return null;

    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  },

  setSession(token: string, user: SessionUser) {
    if (!isBrowser()) return;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem('hsb_access_token', token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    notifyAuthChanged();
  },

  clear() {
    if (!isBrowser()) return;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('hsb_access_token');
    localStorage.removeItem(USER_KEY);

    notifyAuthChanged();
  },
};

// Keep compatibility with Incoming Change
export function getStoredToken(): string | null {
  return authStorage.getToken();
}

export function setStoredToken(token: string): void {
  if (!isBrowser()) return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem('hsb_access_token', token);

  notifyAuthChanged();
}

export function removeStoredToken(): void {
  authStorage.clear();
}

/**
 * Automatically obtains a Customer JWT for demo/testing.
 */
export async function ensureCustomerToken(): Promise<string> {
  const existing = authStorage.getToken();

  if (existing) return existing;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@test.com',
        password: 'ChangeMe123!',
      }),
    });

    if (res.ok) {
      const data = await res.json();

      if (data.token) {
        setStoredToken(data.token);

        if (data.user) {
          authStorage.setSession(data.token, data.user);
        }

        return data.token;
      }
    }
  } catch (err) {
    console.warn('Auto-login with customer@test.com failed:', err);
  }

  // Fallback: register a demo customer
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Demo Customer',
        email: `customer.${Date.now()}@test.local`,
        password: 'ChangeMe123!',
        phone: '0912345678',
        role: 'CUSTOMER',
      }),
    });

    if (res.ok) {
      const data = await res.json();

      if (data.token) {
        setStoredToken(data.token);

        if (data.user) {
          authStorage.setSession(data.token, data.user);
        }

        return data.token;
      }
    }
  } catch (err) {
    console.warn('Auto-register failed:', err);
  }

  return '';
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  let token = authStorage.getToken();

  if (
    !token &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register')
  ) {
    token = await ensureCustomerToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;

    throw new ApiError(
      0,
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.',
    );
  }

  const body: ApiResponse<T> = await response.json().catch(() => ({
    success: response.ok,
    message: response.statusText,
  }));

  if (!response.ok) {
    if (response.status === 401 && token) {
      authStorage.clear();
    }

    throw new ApiError(
      response.status,
      body.message || `Request failed with status ${response.status}`,
      body.details ?? body.errors,
    );
  }

  return body;
}

export const getErrorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : 'Đã xảy ra lỗi không xác định';

export { API_BASE_URL };
