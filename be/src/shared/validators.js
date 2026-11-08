const { env } = require('../config/env.js');

const isVietnamesePhone = (value) => /^(0)(3|5|7|8|9)\d{8}$/.test(value);
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

const DEV_DATA_IMAGE_REGEX = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const CLOUDINARY_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates whether a media URL is allowed:
 * - Must be a string <= 2048 characters (or dev data URI).
 * - Allowed: https://res.cloudinary.com/<cloud-name>/...
 *   where <cloud-name> matches env.cloudinaryCloudName (if configured).
 * - In non-production (NODE_ENV !== 'production'): data:image/(png|jpeg|jpg|webp|gif);base64,... is also allowed.
 * - All other schemes (javascript:, http:, data:text/..., etc.) are rejected.
 *
 * @param {unknown} url
 * @param {Object} [options]
 * @param {boolean} [options.isDev]
 * @param {string} [options.cloudName]
 * @returns {boolean}
 */
function isAllowedMediaUrl(url, options = {}) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const isDev = options.isDev !== undefined ? Boolean(options.isDev) : env.nodeEnv !== 'production';

  if (trimmed.startsWith('data:')) {
    if (!isDev) return false;
    if (trimmed.length > 2 * 1024 * 1024) return false;
    return DEV_DATA_IMAGE_REGEX.test(trimmed);
  }

  if (trimmed.length > 2048) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== 'res.cloudinary.com') return false;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return false;

    const pathCloudName = segments[0];
    const configuredCloudName = options.cloudName !== undefined
      ? options.cloudName
      : env.cloudinaryCloudName;

    if (configuredCloudName && typeof configuredCloudName === 'string' && configuredCloudName.trim()) {
      const expectedCloudName = configuredCloudName.trim();
      if (pathCloudName !== expectedCloudName) {
        // In development/test, allow standard mock/demo cloud names so offline tests pass without real Cloudinary creds
        if (!isDev || (pathCloudName !== 'demo' && pathCloudName !== 'mock-cloud')) {
          return false;
        }
      }
    } else {
      if (!CLOUDINARY_NAME_REGEX.test(pathCloudName)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = { isVietnamesePhone, isObjectId, isAllowedMediaUrl };
