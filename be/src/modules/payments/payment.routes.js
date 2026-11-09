const { Router } = require('express');
const { handleAppError } = require('../../shared/app-error.js');
const { handlePayOSWebhook } = require('./payment.controller.js');

const router = Router();
router.get('/payos/webhook', (_req, res) => res.sendStatus(200));
router.post('/payos/webhook', handlePayOSWebhook);
router.use(handleAppError);

module.exports = router;
