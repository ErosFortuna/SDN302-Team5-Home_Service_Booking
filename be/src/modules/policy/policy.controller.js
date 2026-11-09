const policyService = require('./policy.service.js');

/**
 * Helper to extract client IP safely.
 */
function getClientIp(req) {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = String(forwarded).split(',');
    return list[0].trim();
  }
  return req.socket?.remoteAddress || 'Unknown';
}

/**
 * GET /api/policies/active
 * Query: ?type=PRIVACY_POLICY
 */
async function listActivePolicies(req, res, next) {
  try {
    const { type } = req.query;
    const policies = await policyService.getActivePolicies(type);
    res.json({
      success: true,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/policies/active/:type
 */
async function getActivePolicyByType(req, res, next) {
  try {
    const { type } = req.params;
    const policy = await policyService.getLatestActivePolicyByType(type);
    res.json({
      success: true,
      data: policy,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/policies/:id
 */
async function getPolicyById(req, res, next) {
  try {
    const { id } = req.params;
    const policy = await policyService.getPolicyById(id);
    res.json({
      success: true,
      data: policy,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/policies/pending-consent
 * Returns active mandatory policies that current authenticated user hasn't consented to yet.
 */
async function getPendingConsents(req, res, next) {
  try {
    const result = await policyService.getPendingConsentsForUser(req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/policies/consent
 * Body: { policyId } or { policyIds: [...] }
 */
async function submitConsent(req, res, next) {
  try {
    const userId = req.user._id;
    const policyIds = req.consentPolicyIds;
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const recorded = await policyService.recordConsents({
      userId,
      policyIds,
      ipAddress,
      userAgent,
    });

    res.status(201).json({
      success: true,
      message: 'Ghi nhận đồng ý chính sách thành công',
      data: recorded,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/policies/my-consents
 */
async function getMyConsents(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await policyService.getUserConsents(req.user._id, { page, limit });
    res.json({
      success: true,
      data: result.consents,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: GET /api/admin/policies
 */
async function adminListPolicies(req, res, next) {
  try {
    const result = await policyService.adminListPolicies(req.parsedQuery);
    res.json({
      success: true,
      data: result.policies,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: GET /api/admin/policies/stats
 */
async function adminGetPolicyStats(req, res, next) {
  try {
    const stats = await policyService.getPolicyStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: GET /api/admin/policies/:id
 */
async function adminGetPolicy(req, res, next) {
  try {
    const policy = await policyService.getPolicyById(req.params.id);
    res.json({
      success: true,
      data: policy,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: POST /api/admin/policies
 */
async function adminCreatePolicy(req, res, next) {
  try {
    const created = await policyService.createPolicy(req.policyData, req.user);
    res.status(201).json({
      success: true,
      message: 'Tạo chính sách mới thành công',
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: PATCH /api/admin/policies/:id
 */
async function adminUpdatePolicy(req, res, next) {
  try {
    const updated = await policyService.updatePolicy(req.params.id, req.policyUpdateData, req.user);
    res.json({
      success: true,
      message: 'Cập nhật chính sách thành công',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: GET /api/admin/policies/:id/consents
 */
async function adminGetPolicyConsents(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await policyService.getPolicyConsentsAudit(req.params.id, { page, limit });
    res.json({
      success: true,
      data: result.consents,
      policy: result.policy,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listActivePolicies,
  getActivePolicyByType,
  getPolicyById,
  getPendingConsents,
  submitConsent,
  getMyConsents,
  adminListPolicies,
  adminGetPolicyStats,
  adminGetPolicy,
  adminCreatePolicy,
  adminUpdatePolicy,
  adminGetPolicyConsents,
};
