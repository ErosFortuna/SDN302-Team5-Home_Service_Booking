import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import serviceCategoryRoutes from '../modules/categories/service-category.routes.js';
import serviceRoutes from '../modules/services/service.routes.js';
import serviceRequestRoutes from '../modules/requests/service-request.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/service-categories', serviceCategoryRoutes);
router.use('/services', serviceRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
export default router;
