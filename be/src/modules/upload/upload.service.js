const { cloudinary, isCloudinaryConfigured } = require('../../config/cloudinary.js');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from Multer
 * @param {Object} options - Upload options (folder, filename, mimeType)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadImageBuffer(buffer, options = {}) {
  const { folder = 'home-service-booking/service-requests', filename, mimeType = 'image/jpeg' } = options;

  if (!isCloudinaryConfigured()) {
    console.warn(
      '[Cloudinary] Warning: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are not set in be/.env.' +
        ' Returning base64 data URL for local development/testing.'
    );
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    return {
      url: dataUri,
      publicId: `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format: mimeType.split('/')[1] || 'jpeg',
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload multiple image buffers to Cloudinary
 * @param {Array<{ buffer: Buffer, originalname: string, mimetype: string }>} files
 * @param {Object} options
 * @returns {Promise<Array<{ url: string, publicId: string }>>}
 */
async function uploadMultipleImages(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map((file) =>
    uploadImageBuffer(file.buffer, {
      ...options,
      filename: file.originalname,
      mimeType: file.mimetype,
    })
  );

  return Promise.all(uploadPromises);
}

module.exports = {
  uploadImageBuffer,
  uploadMultipleImages,
};
