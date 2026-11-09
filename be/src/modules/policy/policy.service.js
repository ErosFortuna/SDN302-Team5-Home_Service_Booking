const { Policy, UserConsent, POLICY_TYPES } = require('./policy.model.js');
const { AppError } = require('../../shared/app-error.js');
const { escapeRegex } = require('../../shared/regex.js');

/**
 * Returns active policies, optionally filtered by type.
 */
async function getActivePolicies(type) {
  const query = { isActive: true };
  if (type && POLICY_TYPES.includes(type)) {
    query.type = type;
  }
  return Policy.find(query).sort({ effectiveDate: -1, createdAt: -1 }).lean();
}

/**
 * Returns the current active policy for a specific type.
 */
async function getLatestActivePolicyByType(type) {
  if (!POLICY_TYPES.includes(type)) {
    throw new AppError(400, `Loại chính sách không hợp lệ: ${type}`);
  }
  const policy = await Policy.findOne({ type, isActive: true }).lean();
  if (!policy) {
    throw new AppError(404, `Chưa có chính sách nào đang kích hoạt cho loại: ${type}`);
  }
  return policy;
}

/**
 * Get policy by ID.
 */
async function getPolicyById(id) {
  const policy = await Policy.findById(id).lean();
  if (!policy) {
    throw new AppError(404, 'Không tìm thấy chính sách');
  }
  return policy;
}

/**
 * Create a new policy or version.
 * If isActive=true, automatically deactivates older versions of the same type.
 */
async function createPolicy(data, adminUser) {
  // Check if same type and version already exists
  const existing = await Policy.findOne({ type: data.type, version: data.version });
  if (existing) {
    throw new AppError(409, `Phiên bản ${data.version} của chính sách này đã tồn tại`);
  }

  // If newly created policy is set to active, deactivate all existing ones of this type
  if (data.isActive) {
    await Policy.updateMany({ type: data.type, isActive: true }, { $set: { isActive: false } });
  }

  const policy = new Policy({
    ...data,
    createdBy: adminUser?._id,
  });

  await policy.save();
  return policy.toObject();
}

/**
 * Update an existing policy.
 */
async function updatePolicy(id, data, adminUser) {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw new AppError(404, 'Không tìm thấy chính sách để cập nhật');
  }

  // If activating this policy, deactivate other policies of the same type
  if (data.isActive === true && !policy.isActive) {
    await Policy.updateMany({ type: policy.type, _id: { $ne: id }, isActive: true }, { $set: { isActive: false } });
  }

  Object.assign(policy, data);
  await policy.save();
  return policy.toObject();
}

/**
 * Delete a policy and its user consent records.
 */
async function deletePolicy(id) {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw new AppError(404, 'Không tìm thấy chính sách để xóa');
  }

  await UserConsent.deleteMany({ policy: policy._id });
  await Policy.findByIdAndDelete(policy._id);

  return { deletedId: id, title: policy.title, version: policy.version };
}

/**
 * Determine which policy types are mandatory for a given role.
 */
function getRelevantPolicyTypesForRole(role) {
  switch (role) {
    case 'PROVIDER':
      return ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'PROVIDER_CONTRACT'];
    case 'CUSTOMER':
    case 'STAFF':
    case 'ADMIN':
    default:
      return ['PRIVACY_POLICY', 'TERMS_OF_SERVICE'];
  }
}

/**
 * Check if the user has any pending mandatory policies that need consent.
 */
async function getPendingConsentsForUser(user) {
  if (!user || !user._id) {
    return { required: false, pendingCount: 0, policies: [] };
  }

  const relevantTypes = getRelevantPolicyTypesForRole(user.role);

  // Find all active, mandatory policies for this role
  const activeMandatoryPolicies = await Policy.find({
    isActive: true,
    isMandatory: true,
    type: { $in: relevantTypes },
  }).sort({ effectiveDate: -1 }).lean();

  if (!activeMandatoryPolicies.length) {
    return { required: false, pendingCount: 0, policies: [] };
  }

  const activePolicyIds = activeMandatoryPolicies.map((p) => p._id);

  // Find existing consents of this user for these active policies
  const acceptedConsents = await UserConsent.find({
    user: user._id,
    policy: { $in: activePolicyIds },
  }).select('policy').lean();

  const acceptedPolicyIdSet = new Set(acceptedConsents.map((c) => c.policy.toString()));

  const pending = activeMandatoryPolicies.filter((p) => !acceptedPolicyIdSet.has(p._id.toString()));

  return {
    required: pending.length > 0,
    pendingCount: pending.length,
    policies: pending,
  };
}

/**
 * Records consent for one or more policy IDs with IP and timestamp.
 */
async function recordConsents({ userId, policyIds, ipAddress, userAgent }) {
  if (!userId) {
    throw new AppError(401, 'Yêu cầu đăng nhập để xác nhận chính sách');
  }

  const policies = await Policy.find({ _id: { $in: policyIds } });
  if (!policies.length) {
    throw new AppError(404, 'Không tìm thấy chính sách để ghi nhận đồng ý');
  }

  const results = [];
  const now = new Date();

  for (const policy of policies) {
    // Upsert user consent record
    const consent = await UserConsent.findOneAndUpdate(
      { user: userId, policy: policy._id },
      {
        $set: {
          type: policy.type,
          version: policy.version,
          acceptedAt: now,
          ipAddress: ipAddress || 'Unknown',
          userAgent: userAgent ? String(userAgent).slice(0, 500) : '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push(consent);
  }

  return results;
}

/**
 * List consents for the current user.
 */
async function getUserConsents(userId, { page = 1, limit = 20 } = {}) {
  const query = { user: userId };
  const skip = (page - 1) * limit;

  const [consents, total] = await Promise.all([
    UserConsent.find(query)
      .populate('policy', 'title type version effectiveDate')
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserConsent.countDocuments(query),
  ]);

  return {
    consents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: List all policies with pagination and filters.
 */
async function adminListPolicies({ type, isActive, search, page = 1, limit = 10 }) {
  const query = {};

  if (type) query.type = type;
  if (isActive !== undefined) query.isActive = isActive;
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { version: { $regex: escaped, $options: 'i' } },
      { summary: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [policies, total] = await Promise.all([
    Policy.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Policy.countDocuments(query),
  ]);

  return {
    policies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: View audit log of user consents for a specific policy.
 */
async function getPolicyConsentsAudit(policyId, { page = 1, limit = 20 } = {}) {
  const policy = await Policy.findById(policyId).lean();
  if (!policy) {
    throw new AppError(404, 'Không tìm thấy chính sách');
  }

  const query = { policy: policyId };
  const skip = (page - 1) * limit;

  const [consents, total] = await Promise.all([
    UserConsent.find(query)
      .populate('user', 'fullName email phone role')
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserConsent.countDocuments(query),
  ]);

  return {
    policy,
    consents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: Get policy summary metrics.
 */
async function getPolicyStats() {
  const [totalPolicies, activePolicies, totalConsents] = await Promise.all([
    Policy.countDocuments(),
    Policy.countDocuments({ isActive: true }),
    UserConsent.countDocuments(),
  ]);

  return {
    totalPolicies,
    activePolicies,
    totalConsents,
  };
}

module.exports = {
  getActivePolicies,
  getLatestActivePolicyByType,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPendingConsentsForUser,
  recordConsents,
  getUserConsents,
  adminListPolicies,
  getPolicyConsentsAudit,
  getPolicyStats,
  getRelevantPolicyTypesForRole,
};
