/**
 * Centralized API Base URL and endpoint resolution helper.
 *
 * Rules:
 * - Defaults to '/api' when unset or empty (leveraging Next.js rewrites to proxy to backend)
 * - Trims whitespace and strips all trailing slashes
 * - Guarantees exactly one trailing '/api' segment on the base URL
 * - Prevents duplicate slashes (e.g. '//services', '//auth/login')
 */

export function normalizeApiBaseUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') {
    return '/api';
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed === '/') {
    return '/api';
  }

  // Strip all trailing slashes
  let cleaned = trimmed.replace(/\/+$/, '');
  if (!cleaned) {
    return '/api';
  }

  // Normalize duplicate slashes before 'api' if present (e.g. 'http://localhost:5173//api')
  cleaned = cleaned.replace(/\/+api$/, '/api');

  // If the path is just 'api', treat as '/api'
  if (cleaned === 'api') {
    return '/api';
  }

  // Ensure base URL ends with '/api'
  if (cleaned.endsWith('/api')) {
    return cleaned;
  }

  return `${cleaned}/api`;
}

/**
 * Returns the active API base URL from environment variables,
 * falling back to '/api'.
 */
export function getApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;

  return normalizeApiBaseUrl(envUrl);
}

/**
 * Builds a clean, fully-qualified endpoint URL.
 *
 * @param path Endpoint path, e.g. '/service-categories' or 'services'
 * @param customBase Optional custom base URL override (will be normalized)
 */
export function buildApiUrl(path: string, customBase?: string | null): string {
  const base =
    customBase !== undefined ? normalizeApiBaseUrl(customBase) : getApiBaseUrl();
  const cleanPath = '/' + path.trim().replace(/^\/+/, '');
  return `${base}${cleanPath}`;
}
