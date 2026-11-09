/**
 * Safe URL validation helper for user-supplied media and external links (V-07).
 *
 * Rules:
 * - Rejects dangerous schemes: javascript:, vbscript:, etc.
 * - Allows root-relative safe paths (e.g. /demo-requests/..., /placeholder.jpg) for internal assets.
 * - Allows https: for external URLs.
 * - In non-production (process.env.NODE_ENV !== 'production'): allows data:image/(png|jpeg|jpg|webp|gif);base64,...
 * - In production: strictly rejects data: URLs and non-https external schemes.
 */

const DEV_DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
    return false;
  }

  // Allow same-origin root-relative paths, but reject protocol-relative (//) or backslash (/\\)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true;
  }

  // Allow dev data URIs for images only
  if (trimmed.startsWith('data:')) {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) return false;
    return DEV_DATA_IMAGE_REGEX.test(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns trimmed safe URL string, or null if the URL is invalid or unsafe.
 */
export function getSafeUrl(url: unknown): string | null {
  return isSafeUrl(url) ? (url as string).trim() : null;
}

/**
 * Filters an array of unknown URLs to only include safe URLs.
 * Ensures legacy/malformed DB entries do not crash components.
 */
export function filterSafeUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter(isSafeUrl).map((u) => (u as string).trim());
}

/**
 * Standard safe external link attributes for user-supplied links.
 */
export const SAFE_EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
} as const;

