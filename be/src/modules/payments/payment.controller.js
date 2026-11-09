const { applyVerifiedPayOSWebhook } = require('./membership-payment.service.js');

async function handlePayOSWebhook(req, res) {
  const result = await applyVerifiedPayOSWebhook(req.body, { ip: req.ip });
  return res.json({
    error: 0,
    message: 'Webhook processed',
    data: {
      status: result.status,
      alreadyApplied: result.alreadyApplied,
    },
  });
}

module.exports = { handlePayOSWebhook };
