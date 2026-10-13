// API Client for Home Service Booking Web Frontend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'hsb_auth_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hsb_access_token') || localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Automatically ensures a valid Customer JWT token for demo & testing.
 * If no token exists, it logs in as the default customer or creates one.
 */
export async function ensureCustomerToken(): Promise<string> {
  const existing = getStoredToken();
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
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Auto-login with customer@test.com failed:', err);
  }

  // Fallback: Try registering a fresh demo customer
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
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let token = getStoredToken();
  if (!token && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    token = await ensureCustomerToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body: ApiResponse<T> = await response.json().catch(() => ({
    success: response.ok,
    message: response.statusText,
  }));

  if (!response.ok) {
    const errorMsg =
      body.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return body;
}

export { API_BASE_URL };
