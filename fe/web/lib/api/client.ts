
/**
 * API Client for Home Service Booking Web Frontend
 */

import { buildApiUrl, getApiBaseUrl } from './base-url';

const API_BASE_URL = getApiBaseUrl();

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

export interface DefaultApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: SessionUser;
  [key: string]: any;
}

export type ApiResponse<T = any> = T extends { success: boolean } ? T : DefaultApiResponse<T>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | Record<string, any> | any[];
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

export function getCsrfCookie(): string | null {
  if (!isBrowser() || typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )hsb_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let webRefreshPromise: Promise<string | null> | null = null;

export async function refreshWebSession(): Promise<string | null> {
  if (webRefreshPromise) {
    return webRefreshPromise;
  }

  webRefreshPromise = (async () => {
    try {
      const csrfToken = getCsrfCookie();
      const url = buildApiUrl('/auth/refresh');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-client-type': 'web',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        authStorage.clear();
        return null;
      }

      const envelope = (await res.json().catch(() => null)) as {
        data?: { accessToken?: string; user?: SessionUser };
      } | null;

      if (envelope?.data?.accessToken && envelope?.data?.user) {
        authStorage.setSession(envelope.data.accessToken, envelope.data.user);
        return envelope.data.accessToken;
      }

      authStorage.clear();
      return null;
    } catch {
      authStorage.clear();
      return null;
    } finally {
      webRefreshPromise = null;
    }
  })();

  return webRefreshPromise;
}

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

/** Returns the active customer JWT; authentication always comes from a user session. */
export async function ensureCustomerToken(): Promise<string> {
  const existing = authStorage.getToken();
  if (existing) return existing;
  throw new ApiError(401, 'Vui lòng đăng nhập để tiếp tục.');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = buildApiUrl(endpoint);

  const token = authStorage.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const requestBody =
    options.body !== null &&
    typeof options.body === 'object' &&
    (Array.isArray(options.body) || Object.getPrototypeOf(options.body) === Object.prototype)
      ? JSON.stringify(options.body)
      : options.body;

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
      body: requestBody as BodyInit | null | undefined,
      headers,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;

    throw new ApiError(
      0,
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend.',
    );
  }

  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/reset-password');

  if (response.status === 401 && !isAuthEndpoint) {
    const refreshedToken = await refreshWebSession();
    if (refreshedToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${refreshedToken}`,
      };
      const retryResponse = await fetch(url, {
        credentials: 'include',
        ...options,
        body: requestBody as BodyInit | null | undefined,
        headers: retryHeaders,
      });

      const retryBody: any = await retryResponse.json().catch(() => ({
        success: retryResponse.ok,
        message: retryResponse.statusText,
      }));

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          authStorage.clear();
        }
        throw new ApiError(
          retryResponse.status,
          retryBody.message || `Request failed with status ${retryResponse.status}`,
          retryBody.details ?? retryBody.errors,
        );
      }

      return retryBody as unknown as ApiResponse<T>;
    }

    authStorage.clear();
  }

  const body: any = await response.json().catch(() => ({
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

  return body as unknown as ApiResponse<T>;
}

export const getErrorMessage = (err: unknown) =>
  err instanceof Error
    ? err.message
    : 'Đã xảy ra lỗi không xác định';

export { API_BASE_URL };
