/**
 * Checks whether a given hostname refers to localhost, loopback, or private network range.
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateOrLocalHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0'
  ) {
    return true;
  }

  // IPv4 regex check
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((o) => o > 255)) return true;

    const [a, b] = octets;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private network, includes Android emulator host 10.0.2.2)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
  }

  // IPv6 loopback and private/local
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true;
  }

  return false;
}

/**
 * Checks whether a given hostname is a known placeholder or example domain.
 * @param {string} hostname
 * @returns {boolean}
 */
function isPlaceholderHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  const placeholderDomains = [
    'yourdomain.com',
    'example.com',
    'example.org',
    'example.net',
    'mydomain.com',
    'placeholder.com',
  ];

  return placeholderDomains.some(
    (domain) => host === domain || host.endsWith('.' + domain)
  );
}

/**
 * Resolves and validates the backend API base URL.
 *
 * In production (!isDev):
 * - apiUrl is mandatory.
 * - Must be a valid URL parsable by `new URL()`.
 * - Protocol must be `https:`.
 * - Hostname must be valid and non-local (rejects localhost, 127.0.0.1, 10.0.2.2, RFC 1918 private IPs).
 * - Hostname must not be a placeholder/example domain (e.g. api.yourdomain.com, example.com).
 *
 * In development (isDev):
 * - If apiUrl is provided, returns trimmed URL (without trailing slash).
 * - On iOS, uses the local Expo dev-server host for the backend when available.
 * - Otherwise falls back to http://10.0.2.2:5000/api on Android and http://localhost:5000/api on other platforms.
 *
 * @param {{ isDev: boolean; apiUrl?: string | null; platform?: string }} options
 * @returns {string}
 */
function resolveApiBaseUrl(options) {
  const { isDev, apiUrl, platform, hostUri } = options;
  const rawUrl = apiUrl?.trim();

  if (!isDev) {
    if (!rawUrl) {
      throw new Error(
        'Cấu hình sai: EXPO_PUBLIC_API_URL là bắt buộc ở môi trường production. ' +
        'Vui lòng cấu hình biến môi trường EXPO_PUBLIC_API_URL bắt đầu bằng "https://".'
      );
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(
        `Cấu hình sai: EXPO_PUBLIC_API_URL không phải là URL hợp lệ (nhận được: "${rawUrl}").`
      );
    }

    if (parsed.protocol !== 'https:') {
      throw new Error(
        `Cấu hình sai: EXPO_PUBLIC_API_URL phải sử dụng giao thức HTTPS ("https://") ở môi trường production (nhận được: "${rawUrl}").`
      );
    }

    if (!parsed.hostname) {
      throw new Error(
        `Cấu hình sai: EXPO_PUBLIC_API_URL thiếu hostname hợp lệ (nhận được: "${rawUrl}").`
      );
    }

    if (isPrivateOrLocalHost(parsed.hostname)) {
      throw new Error(
        `Cấu hình sai: EXPO_PUBLIC_API_URL không được sử dụng địa chỉ local/private ("${parsed.hostname}") ở môi trường production.`
      );
    }

    if (isPlaceholderHost(parsed.hostname)) {
      throw new Error(
        `Cấu hình sai: EXPO_PUBLIC_API_URL đang sử dụng hostname placeholder ("${parsed.hostname}") chưa được cấu hình tên miền thực tế ở môi trường production.`
      );
    }

    return rawUrl.replace(/\/+$/, '');
  }

  // Development environment
  if (rawUrl) {
    return rawUrl.replace(/\/+$/, '');
  }

  if (platform === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  if (platform === 'ios' && typeof hostUri === 'string') {
    try {
      const parsedHostUri = new URL(
        hostUri.includes('://') ? hostUri : `http://${hostUri}`
      );
      if (isPrivateOrLocalHost(parsedHostUri.hostname)) {
        return `http://${parsedHostUri.hostname}:5000/api`;
      }
    } catch {
      // Ignore malformed or remote Expo dev-server hosts and use the standard fallback.
    }
  }
  return 'http://localhost:5000/api';
}

module.exports = {
  isPrivateOrLocalHost,
  isPlaceholderHost,
  resolveApiBaseUrl,
};

