const { uploadMultipleImages } = require('./upload.service.js');

function resolveUploadFolder(user, requestedFolder) {
  const providerDocumentsPrefix = 'home-service-booking/provider-documents';
  const folder = requestedFolder || 'home-service-booking/service-requests';
  if (user.role === 'PROVIDER' && folder.startsWith(providerDocumentsPrefix)) {
    return `${providerDocumentsPrefix}/${user._id}`;
  }
  return folder;
}

async function handleUploadImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided. Please attach at least one image under field "images" or "image".',
      });
    }

    const folder = resolveUploadFolder(req.user, req.body.folder);
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
