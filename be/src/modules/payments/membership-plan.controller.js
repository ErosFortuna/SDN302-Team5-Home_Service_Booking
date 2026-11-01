const mongoose = require('mongoose');
const MembershipPlan = require('./membership-plan.model.js');
const { AppError } = require('../../shared/app-error.js');

const PLAN_FIELDS = ['name', 'slug', 'monthlyPrice', 'benefits', 'isActive'];

function validatePlanInput(body, partial = false) {
  const updates = {};
  for (const field of PLAN_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if (Object.keys(updates).length !== Object.keys(body).length) {
    throw new AppError(400, 'Request contains unsupported plan fields');
  }
  if (!partial && ['name', 'slug', 'monthlyPrice'].some((field) => updates[field] === undefined)) {
    throw new AppError(400, 'name, slug, and monthlyPrice are required');
  }
  if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length < 2 || updates.name.trim().length > 100)) {
    throw new AppError(400, 'name must contain 2 to 100 characters');
  }
  if (updates.slug !== undefined && (typeof updates.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(updates.slug))) {
    throw new AppError(400, 'slug must contain lowercase letters, numbers, and hyphens');
  }
  if (updates.monthlyPrice !== undefined && (!Number.isInteger(updates.monthlyPrice) || updates.monthlyPrice < 1000 || updates.monthlyPrice > 100000000)) {
    throw new AppError(400, 'monthlyPrice must be an integer VND amount between 1,000 and 100,000,000');
  }
  if (updates.benefits !== undefined && (
    !Array.isArray(updates.benefits) ||
    updates.benefits.length > 20 ||
    !updates.benefits.every((benefit) => typeof benefit === 'string' && benefit.trim().length > 0 && benefit.length <= 200)
  )) {
    throw new AppError(400, 'benefits must be an array of up to 20 non-empty strings');
  }
  if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
    throw new AppError(400, 'isActive must be a boolean');
  }
  return updates;
}

function toPlanDto(plan) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    slug: plan.slug,
    monthlyPrice: plan.monthlyPrice,
    currency: 'VND',
    billingPeriod: 'MONTH',
    benefits: plan.benefits,
    isActive: plan.isActive,
    version: plan.version,
  };
}

async function listActiveMembershipPlans(req, res) {
  const plans = await MembershipPlan.find({ isActive: true })
    .sort({ monthlyPrice: 1, name: 1 })
    .lean();
  return res.json({ success: true, data: plans.map(toPlanDto) });
}

async function createMembershipPlan(req, res) {
  const updates = validatePlanInput(req.body);
  const plan = await MembershipPlan.create(updates);
  return res.status(201).json({
    success: true,
    message: 'Membership plan created',
    data: toPlanDto(plan),
  });
}

async function updateMembershipPlan(req, res) {
  if (!mongoose.isValidObjectId(req.params.planId)) {
    throw new AppError(400, 'planId must be a valid id');
  }
  const updates = validatePlanInput(req.body, true);
  if (Object.keys(updates).length === 0) throw new AppError(400, 'At least one supported field is required');

  const versionedFields = ['name', 'slug', 'monthlyPrice', 'benefits'];
  const changesPlanVersion = versionedFields.some((field) => updates[field] !== undefined);
  const update = { $set: updates };
  if (changesPlanVersion) update.$inc = { version: 1 };

  const plan = await MembershipPlan.findByIdAndUpdate(
    req.params.planId,
    update,
    { new: true, runValidators: true },
  );
  if (!plan) throw new AppError(404, 'Membership plan not found');
  return res.json({ success: true, message: 'Membership plan updated', data: toPlanDto(plan) });
}

module.exports = {
  listActiveMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  validatePlanInput,
};
