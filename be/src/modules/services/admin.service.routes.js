const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const {
  validateCreateService,
  validateUpdateService,
  validateServiceQuery,
  validateServiceId,
  validateServiceStatus,
} = require('./admin.service.validation.js');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  setServiceActive,
  deleteService,
} = require('./admin.service.controller.js');

const router = Router();
const verifyAdmin = [protect, authorize('ADMIN')];

router.get('/', verifyAdmin, validateServiceQuery, getAllServices);
router.post('/', verifyAdmin, validateCreateService, createService);
router.get('/:id', verifyAdmin, validateServiceId, getServiceById);
router.patch('/:id', verifyAdmin, validateServiceId, validateUpdateService, updateService);
router.patch('/:id/status', verifyAdmin, validateServiceId, validateServiceStatus, setServiceActive);
router.delete('/:id', verifyAdmin, validateServiceId, deleteService);

router.use(handleAppError);

module.exports = router;
