const { uploadMultipleImages } = require('./upload.service.js');

async function handleUploadImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please attach at least one image under field "images" or "image".',
      });
    }

    const folder = req.body.folder || 'home-service-booking/service-requests';
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
};
