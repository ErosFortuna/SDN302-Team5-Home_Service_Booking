const { uploadMultipleImages } = require('./upload.service.js');
const { resolveUploadFolder, validateImageBuffer } = require('./upload.validation.js');

async function handleUploadImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please attach at least one image under field "images" or "image".',
      });
    }

    // Strictly validate buffer magic bytes: only real JPEG, PNG, WEBP allowed
    for (const file of files) {
      const realMime = validateImageBuffer(file.buffer);
      file.mimetype = realMime;
    }

    const folder = resolveUploadFolder(req.user, req.body ? req.body.folder : undefined);
    const uploadResults = await uploadMultipleImages(files, { folder });

    const urls = uploadResults.map((item) => item.url);

    return res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadResults,
      urls,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleUploadImages,
  resolveUploadFolder,
};
