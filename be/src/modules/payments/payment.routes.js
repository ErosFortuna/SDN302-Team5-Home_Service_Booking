const { Router } = require('express');
const { handleAppError } = require('../../shared/app-error.js');
const { handlePayOSWebhook } = require('./payment.controller.js');

const router = Router();
router.post('/payos/webhook', handlePayOSWebhook);
router.use(handleAppError);

module.exports = router;
