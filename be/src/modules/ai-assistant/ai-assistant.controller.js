const aiAssistantService = require('./ai-assistant.service.js');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'Unknown';
}

/**
 * POST /api/ai/estimate-price
 * Public/Customer endpoint: accepts description & serviceCategoryName
 */
async function estimatePrice(req, res, next) {
  try {
    const { description, serviceCategoryName } = req.validatedAiPayload;
    const userId = req.user ? req.user._id : null;
    const ipAddress = getClientIp(req);

    const result = await aiAssistantService.estimatePriceBreakdown({
      description,
      serviceCategoryName,
      userId,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Phân tích dự toán chi phí AI thành công',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  estimatePrice,
};
