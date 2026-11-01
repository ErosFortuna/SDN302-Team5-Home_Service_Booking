const mongoose = require('mongoose');
const MembershipPlan = require('./membership-plan.model.js');
const MembershipPayment = require('./membership-payment.model.js');
const ProviderSubscription = require('./provider-subscription.model.js');
const ProviderProfile = require('../providers/provider.model.js');
const { createMembershipCheckout } = require('./membership-payment.service.js');
const { AppError } = require('../../shared/app-error.js');

const MAX_PAGE_SIZE = 100;

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new AppError(400, `page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}`);
  }
  return { page, limit };
}

async function ensureProviderHasProfile(user) {
  if (user.role !== 'PROVIDER') throw new AppError(403, 'Only providers can manage membership payments');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'Inactive providers cannot create membership payments');
  const profile = await ProviderProfile.exists({ user: user._id });
  if (!profile) throw new AppError(403, 'A provider profile is required for membership payments');
}

async function getMySubscription(req, res) {
  const subscription = await ProviderSubscription.findOne({ provider: req.user._id })
    .populate('plan', 'name slug monthlyPrice benefits')
    .lean();
  if (!subscription) return res.json({ success: true, data: null });

  const now = new Date();
  const status =
    subscription.status === 'ACTIVE' &&
    subscription.currentPeriodEnd <= now
      ? 'EXPIRED'
      : subscription.status;

  return res.json({
    success: true,
    data: {
      id: subscription._id.toString(),
      status,
      plan: subscription.plan
        ? {
            id: subscription.plan._id.toString(),
            name: subscription.plan.name,
            slug: subscription.plan.slug,
            monthlyPrice: subscription.plan.monthlyPrice,
            benefits: subscription.plan.benefits,
          }
        : null,
      currentPeriodStart: subscription.currentPeriodStart || null,
      currentPeriodEnd: subscription.currentPeriodEnd || null,
    },
  });
}

async function createCheckout(req, res) {
  await ensureProviderHasProfile(req.user);
  const { planId } = req.body;
  if (!mongoose.isValidObjectId(planId)) throw new AppError(400, 'planId must be a valid id');
  const allowedFields = new Set(['planId']);
  if (Object.keys(req.body).some((field) => !allowedFields.has(field))) {
    throw new AppError(400, 'Only planId is allowed');
  }

  const plan = await MembershipPlan.findOne({ _id: planId, isActive: true });
  if (!plan) throw new AppError(404, 'Active membership plan not found');

  const pendingPayment = await MembershipPayment.findOne({
    provider: req.user._id,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean();
  if (pendingPayment) {
    throw new AppError(409, 'You already have a pending membership checkout', {
      paymentId: pendingPayment._id.toString(),
      orderCode: pendingPayment.orderCode,
    });
  }

  const checkout = await createMembershipCheckout({ user: req.user, plan });
  return res.status(201).json({
    success: true,
    message: 'PayOS checkout created',
    data: checkout,
  });
}

async function listMyMembershipPayments(req, res) {
  await ensureProviderHasProfile(req.user);
  const { page, limit } = parsePagination(req.query);
  const filter = { provider: req.user._id };
  const [payments, totalItems] = await Promise.all([
    MembershipPayment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('planNameSnapshot planVersion amount currency orderCode paymentLinkId status paidAt expiresAt createdAt')
      .lean(),
    MembershipPayment.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  return res.json({
    success: true,
    data: payments.map((payment) => ({
      id: payment._id.toString(),
      planName: payment.planNameSnapshot,
      planVersion: payment.planVersion,
      amount: payment.amount,
      currency: payment.currency,
      orderCode: payment.orderCode,
      paymentLinkId: payment.paymentLinkId,
      status: payment.status,
      paidAt: payment.paidAt || null,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    },
  });
}

module.exports = {
  getMySubscription,
  createCheckout,
  listMyMembershipPayments,
  parsePagination,
};
