const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Parses TRUST_PROXY configuration value into a format accepted by Express:
 * - boolean: true, false
 * - number: hop count (e.g. 1, 2)
 * - string: IP list, subnet or preset (e.g. 'loopback', 'linklocal', '10.0.0.0/8')
 *
 * Safe defaults:
 * - 'production': 1 (typical 1-hop reverse proxy like Render, Railway, single Nginx)
 * - 'development' / 'test': false (no proxy trusted by default to prevent spoofing)
 *
 * @param {string | undefined} val
 * @param {string} [nodeEnv]
 * @returns {boolean | number | string}
 */
function parseTrustProxy(val, nodeEnv = 'development') {
  if (val === undefined || val === null || String(val).trim() === '') {
    return nodeEnv === 'production' ? 1 : false;
  }
  const trimmed = String(val).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

/**
 * Normalizes an origin string for uniform comparison:
 * - Trims whitespace
 * - Strips trailing slashes
 * - Lowercases scheme and host
 * - Strips default ports (:80 for http, :443 for https) via URL parsing
 * - Preserves wildcard '*'
 *
 * @param {string | undefined} origin
 * @returns {string}
 */
function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return '';
  const trimmed = origin.trim();
  if (!trimmed) return '';
  if (trimmed === '*') return '*';

  try {
    const url = new URL(trimmed);
    return url.origin.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Validates and normalizes CLIENT_URL based on the execution environment (V-15).
 *
 * Rules:
 * - No default '*' is provided.
 * - In production or production-safe mode (NODE_ENV === 'production' or unset):
 *   - CLIENT_URL is strictly required; fails fast if missing/empty.
 *   - Wildcard '*' is strictly forbidden; fails fast with clear explanation.
 * - In development (NODE_ENV === 'development'):
 *   - Optional (returns '' if missing/empty, allowing local development origin matching).
 *   - Wildcard '*' is permitted only when explicitly configured by the developer.
 * - In test (NODE_ENV === 'test'):
 *   - Optional (returns '' if missing/empty).
 * - Origins are normalized (trimmed, trailing slashes removed, scheme+host lowercased).
 *
 * @param {string | undefined} clientUrl
 * @param {string | undefined} nodeEnv
 * @returns {string}
 */
function validateClientUrl(clientUrl, nodeEnv) {
  const normalizedEnv = (nodeEnv || '').trim();
  const isDevelopment = normalizedEnv === 'development';
  const isTest = normalizedEnv === 'test';
  const isProductionSafe = !isDevelopment && !isTest;
  const trimmed = clientUrl !== undefined && clientUrl !== null ? String(clientUrl).trim() : '';

  if (isProductionSafe) {
    if (!trimmed) {
      throw new Error(
        `CLIENT_URL is missing in production environment (NODE_ENV=${normalizedEnv || 'unset'}). Set CLIENT_URL to your frontend domain (e.g. CLIENT_URL=https://example.com).`,
      );
    }

    const origins = trimmed
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const hasWildcard = origins.includes('*') || origins.some((origin) => origin.includes('*'));
    if (hasWildcard) {
      throw new Error(
        'CLIENT_URL cannot contain wildcard "*" in production environment as it allows insecure cross-origin requests with credentials.',
      );
    }

    return origins.map(normalizeOrigin).join(',');
  }

  if (trimmed) {
    return trimmed
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
      .join(',');
  }

  return '';
}

const resolvedNodeEnv = (process.env.NODE_ENV && process.env.NODE_ENV.trim()) || 'production';

const env = {
  nodeEnv: resolvedNodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  allowNoTransaction: process.env.ALLOW_NO_TRANSACTION === 'true',
  clientUrl: validateClientUrl(process.env.CLIENT_URL, resolvedNodeEnv),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, resolvedNodeEnv),
  googleClientIds: (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((clientId) => clientId.trim())
    .filter(Boolean),
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : Number(process.env.SMTP_PORT || 465) === 465,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryUrl: process.env.CLOUDINARY_URL,
  payosClientId: process.env.PAYOS_CLIENT_ID,
  payosApiKey: process.env.PAYOS_API_KEY,
  payosChecksumKey: process.env.PAYOS_CHECKSUM_KEY,
  payosReturnUrl: process.env.PAYOS_RETURN_URL,
  payosCancelUrl: process.env.PAYOS_CANCEL_URL,
  rateLimitGlobalWindowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || 15 * 60 * 1000),
  rateLimitGlobalMax: Number(
    process.env.RATE_LIMIT_GLOBAL_MAX || (process.env.NODE_ENV === 'test' ? 10000 : 300),
  ),
  rateLimitUploadWindowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || 60 * 1000),
  rateLimitUploadMax: Number(
    process.env.RATE_LIMIT_UPLOAD_MAX || (process.env.NODE_ENV === 'test' ? 10000 : 10),
  ),
  rateLimitAvailabilityWindowMs: Number(process.env.RATE_LIMIT_AVAILABILITY_WINDOW_MS || 60 * 1000),
  rateLimitAvailabilityMax: Number(
    process.env.RATE_LIMIT_AVAILABILITY_MAX || (process.env.NODE_ENV === 'test' ? 10000 : 60),
  ),
  rateLimitLoginAccountWindowMs: Number(process.env.RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitLoginAccountMax: Number(
    process.env.RATE_LIMIT_LOGIN_ACCOUNT_MAX || (process.env.NODE_ENV === 'test' ? 10000 : 5),
  ),
  rateLimitRegisterWindowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS || 60 * 60 * 1000),
  rateLimitRegisterMax: Number(
    process.env.RATE_LIMIT_REGISTER_MAX || (process.env.NODE_ENV === 'test' ? 10000 : 5),
  ),
  uploadUserDailyLimitMb: Number(process.env.UPLOAD_USER_DAILY_LIMIT_MB || 50),
  uploadUserDailyWindowMs: Number(process.env.UPLOAD_USER_DAILY_WINDOW_MS || 24 * 60 * 60 * 1000),
  providerSearchMaxCandidates: Number(process.env.PROVIDER_SEARCH_MAX_CANDIDATES || 100),
  providerRecommendMaxCandidates: Number(process.env.PROVIDER_RECOMMEND_MAX_CANDIDATES || 200),
};

if (!env.mongoUri) throw new Error('MONGO_URI is missing');
if (!env.jwtSecret) throw new Error('JWT_SECRET is missing');

module.exports = { env, parseTrustProxy, validateClientUrl, normalizeOrigin };
