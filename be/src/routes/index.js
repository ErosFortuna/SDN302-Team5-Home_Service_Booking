import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import bookingRoutes from '../modules/bookings/booking.routes.js';
import providerRoutes from '../modules/providers/provider.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/provider', providerRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
export default router;
