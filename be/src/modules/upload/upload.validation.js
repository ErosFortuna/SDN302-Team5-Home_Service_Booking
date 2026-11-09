const { AppError } = require('../../shared/app-error.js');

const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_UPLOAD_FOLDERS = Object.freeze({
  'request-attachments': 'home-service-booking/service-requests',
  'service-requests': 'home-service-booking/service-requests',
  'home-service-booking/service-requests': 'home-service-booking/service-requests',

  'booking-photos': 'home-service-booking/booking-photos',
  'home-service-booking/booking-photos': 'home-service-booking/booking-photos',

  'avatars': 'home-service-booking/avatars',
  'home-service-booking/avatars': 'home-service-booking/avatars',
});

const PROVIDER_DOCUMENTS_PREFIX = 'home-service-booking/provider-documents';

/**
 * Detect image MIME type based on buffer magic bytes.
 * Supported: JPEG (FFD8FF), PNG (89504E47), WEBP (RIFF....WEBP), GIF (GIF87a/GIF89a).
 * @param {Buffer} buffer
 * @returns {string|null} detected mime type or null if unrecognized
 */
function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3) + length (bytes 4-7) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')
  ) {
    return 'image/gif';
  }

  return null;
}

/**
 * Validate that buffer represents a real allowed image (JPEG, PNG, WEBP).
 * Rejects SVG, GIF (not in allowlist), and fake image content.
 * @param {Buffer} buffer
 * @returns {string} detected mime type
 */
function validateImageBuffer(buffer) {
  const detected = detectImageMimeType(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected)) {
    throw new AppError(400, 'File content does not match allowed image formats (JPEG, PNG, WEBP)');
  }
  return detected;
}

/**
 * Multer file filter to reject non-image MIME types before reading buffer.
 * Rejects SVG, GIF, HEIC, and all non-JPEG/PNG/WEBP mimetypes.
 * @param {Object} req
 * @param {Object} file
 * @param {Function} cb
 */
function fileFilter(req, file, cb) {
  const mime = (file && file.mimetype ? file.mimetype : '').toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(mime)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Only image files (JPEG, PNG, WEBP) are allowed'));
  }
}

/**
 * Resolve upload folder using a strict server allowlist.
 * @param {Object} user - Authenticated user object
 * @param {string|undefined} requestedFolder - Target folder requested by client
 * @returns {string} canonical Cloudinary folder path
 */
function resolveUploadFolder(user, requestedFolder) {
  if (!requestedFolder || typeof requestedFolder !== 'string' || requestedFolder.trim() === '') {
    return 'home-service-booking/service-requests';
  }

  const clean = requestedFolder.trim();

  // Special rule for provider-documents: strictly scoped to provider user id
  if (clean === 'provider-documents' || clean.startsWith(PROVIDER_DOCUMENTS_PREFIX)) {
    if (!user || user.role !== 'PROVIDER') {
      throw new AppError(422, 'Invalid upload folder');
    }
    return `${PROVIDER_DOCUMENTS_PREFIX}/${user._id}`;
  }

  const mapped = ALLOWED_UPLOAD_FOLDERS[clean];
  if (!mapped) {
    throw new AppError(422, 'Invalid upload folder');
  }

  return mapped;
}

module.exports = {
  ALLOWED_MIME_TYPES,
  ALLOWED_UPLOAD_FOLDERS,
  PROVIDER_DOCUMENTS_PREFIX,
  detectImageMimeType,
  validateImageBuffer,
  fileFilter,
  resolveUploadFolder,
};
