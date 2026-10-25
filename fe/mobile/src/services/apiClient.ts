import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@hsb_auth_token';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('Failed to save token to AsyncStorage:', err);
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to remove token from AsyncStorage:', err);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Ensures customer is authenticated with JWT token.
 * Falls back to demo customer account if no token is saved.
 */
export async function ensureCustomerToken(): Promise<string> {
  const existing = await getStoredToken();
  if (existing) return existing;

  const baseUrl = getApiBaseUrl();

  // Try login with demo customer
  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
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
        await setStoredToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Auto-login with customer@test.com failed:', err);
  }

  // Fallback: auto-register fresh customer
  try {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alex Tran',
        email: `mobile.${Date.now()}@test.local`,
        password: 'ChangeMe123!',
        phone: '0912345678',
        role: 'CUSTOMER',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        await setStoredToken(data.token);
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
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let token = await getStoredToken();
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
