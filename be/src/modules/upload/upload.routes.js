const { Router } = require('express');
const multer = require('multer');
const { protect } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { handleUploadImages } = require('./upload.controller.js');
const { fileFilter } = require('./upload.validation.js');

const router = Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Up to 5 images per upload
  },
  fileFilter,
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 5 },
]);

// POST /api/upload - Upload images to Cloudinary (Protected by JWT)
router.post(
  '/',
  protect,
  (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File is too large (max 5MB per image)' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, message: 'Too many files (max 5 images per request)' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ success: false, message: err.message });
      }
      next();
    });
  },
  (req, res, next) => {
    const flattenedFiles = [];
    if (req.files) {
      if (Array.isArray(req.files.images)) flattenedFiles.push(...req.files.images);
      if (Array.isArray(req.files.image)) flattenedFiles.push(...req.files.image);
      if (Array.isArray(req.files.files)) flattenedFiles.push(...req.files.files);
      if (Array.isArray(req.files.file)) flattenedFiles.push(...req.files.file);
    }
    if (flattenedFiles.length > 5) {
      return res.status(400).json({ success: false, message: 'Too many files (max 5 images per request)' });
    }
    req.files = flattenedFiles;
    next();
  },
  handleUploadImages
);

router.use(handleAppError);

module.exports = router;
