import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveApiBaseUrl, isPrivateOrLocalHost } from './apiBaseUrl';
import { useAuthStore } from '../store/useAuthStore';

export { resolveApiBaseUrl, isPrivateOrLocalHost };

const TOKEN_KEY = '@hsb_auth_token';
const MIGRATION_KEY = '@hsb_token_migrated_to_secure_store';

let isMigrated = false;

/**
 * Normalizes reading tokens from various API response shapes:
 * e.g. { data: { accessToken } }, { data: { token } }, { accessToken }, { token }
 */
export function extractAccessToken(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.trim();
  return (
    payload.data?.accessToken ||
    payload.accessToken ||
    payload.data?.token ||
    payload.token ||
    null
  );
}

export const getApiBaseUrl = (): string => {
  return resolveApiBaseUrl({
    isDev: Boolean(__DEV__),
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    platform: Platform.OS,
    hostUri: Constants.expoConfig?.hostUri,
  });
};

// Khởi động ứng dụng ở production: kiểm tra ngay cấu hình API (fail-fast, V-20)
if (!__DEV__) {
  getApiBaseUrl();
}

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function migrateLegacyTokenOnce(): Promise<void> {
  if (isMigrated) return;
  try {
    const migratedFlag = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!migratedFlag) {
      const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (legacyToken) {
        const canUseSecureStore = await isSecureStoreAvailable();
        if (canUseSecureStore) {
          await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    }
    isMigrated = true;
  } catch (err) {
    console.warn('Error during token migration to SecureStore:', err);
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    await migrateLegacyTokenOnce();
    const canUseSecureStore = await isSecureStoreAvailable();
    if (canUseSecureStore) {
      const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (secureToken) return secureToken;
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to read stored token:', err);
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    const canUseSecureStore = await isSecureStoreAvailable();
    if (canUseSecureStore) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch (err) {
    console.warn('Failed to save token to SecureStore:', err);
  }
}

export async function removeStoredToken(): Promise<void> {
  try {
    const canUseSecureStore = await isSecureStoreAvailable();
    if (canUseSecureStore) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn('Failed to remove stored token:', err);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/** Returns the Customer JWT from the signed-in session. */
export async function ensureCustomerToken(): Promise<string> {
  const existing = await getStoredToken();
  if (existing) return existing;
  throw new Error('Vui lòng đăng nhập để tiếp tục.');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = await getStoredToken();

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
    if (response.status === 401) {
      await removeStoredToken();
      useAuthStore.getState().logout();
    }
    throw new Error(errorMsg);
  }

  return body;
}
