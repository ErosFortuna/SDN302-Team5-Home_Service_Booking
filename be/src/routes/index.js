import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
export default router;
