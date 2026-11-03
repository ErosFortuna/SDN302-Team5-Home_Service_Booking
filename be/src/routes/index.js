const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes.js');

const router = Router();
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.json({ success: true, service: 'home-service-booking-api', timestamp: new Date().toISOString() }));
module.exports = router;
