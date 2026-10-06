import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import bookingRoutes from '../modules/bookings/booking.routes.js';
import providerRoutes from '../modules/providers/provider.routes.js';
import providerSkillRoutes from '../modules/providers/provider.skill.routes.js';
import adminCategoryRoutes from '../modules/categories/admin.category.routes.js';
import categoryRoutes from '../modules/categories/category.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/provider/skills', providerSkillRoutes);
router.use('/provider', providerRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
export default router;
