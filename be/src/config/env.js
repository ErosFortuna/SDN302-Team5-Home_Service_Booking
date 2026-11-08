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

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || '*',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV || 'development'),
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
};

if (!env.mongoUri) throw new Error('MONGO_URI is missing');
if (!env.jwtSecret) throw new Error('JWT_SECRET is missing');

module.exports = { env, parseTrustProxy };
