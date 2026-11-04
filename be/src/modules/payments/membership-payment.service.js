const mongoose = require('mongoose');
const { randomInt } = require('node:crypto');
const { env } = require('../../config/env.js');
const MembershipPayment = require('./membership-payment.model.js');
const ProviderSubscription = require('./provider-subscription.model.js');
const { getPayOSClient } = require('./payos.client.js');
const { AppError } = require('../../shared/app-error.js');

const PAYOS_SUCCESS_CODE = '00';
const PAYMENT_LINK_EXPIRY_MINUTES = 20;

function addCalendarMonth(date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

async function createOrderCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = randomInt(1000000000, 2147483647);
    const exists = await MembershipPayment.exists({ orderCode });
    if (!exists) return orderCode;
  }
  throw new AppError(503, 'Unable to allocate a unique PayOS order code');
}

async function createMembershipCheckout({ user, plan }) {
  let subscription;
  try {
    subscription = await ProviderSubscription.findOneAndUpdate(
      { provider: user._id },
      { $setOnInsert: { provider: user._id, status: 'PENDING' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    subscription = await ProviderSubscription.findOne({ provider: user._id });
    if (!subscription) throw error;
  }

  await MembershipPayment.updateMany(
    { provider: user._id, status: 'PENDING', expiresAt: { $lte: new Date() } },
    { $set: { status: 'EXPIRED' } },
  );
  const orderCode = await createOrderCode();
  const expiresAt = new Date(Date.now() + PAYMENT_LINK_EXPIRY_MINUTES * 60 * 1000);
  const payment = await MembershipPayment.create({
    provider: user._id,
    subscription: subscription._id,
    plan: plan._id,
    planVersion: plan.version,
    planNameSnapshot: plan.name,
    amount: plan.monthlyPrice,
    currency: 'VND',
    orderCode,
    status: 'PENDING',
    expiresAt,
  });

  try {
    const payos = getPayOSClient({ requireCheckoutUrls: true });
    const paymentLink = await payos.paymentRequests.create({
      orderCode,
      amount: plan.monthlyPrice,
      description: `MB${orderCode}`,
      returnUrl: env.payosReturnUrl,
      cancelUrl: env.payosCancelUrl,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
      items: [{ name: plan.name, quantity: 1, price: plan.monthlyPrice }],
    });

    if (
      paymentLink.orderCode !== orderCode ||
      paymentLink.amount !== plan.monthlyPrice ||
      typeof paymentLink.checkoutUrl !== 'string' ||
      !paymentLink.checkoutUrl.startsWith('https://')
    ) {
      throw new Error('PayOS returned inconsistent checkout details');
    }

    await MembershipPayment.updateOne(
      { _id: payment._id, status: 'PENDING' },
      {
        $set: {
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
        },
      },
    );

    return {
      paymentId: payment._id.toString(),
      orderCode,
      amount: plan.monthlyPrice,
      currency: 'VND',
      status: 'PENDING',
      checkoutUrl: paymentLink.checkoutUrl,
      expiresAt,
    };
  } catch (error) {
    await MembershipPayment.updateOne(
      { _id: payment._id, status: 'PENDING' },
      { $set: { status: 'FAILED' } },
    );
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Unable to create PayOS checkout. Please try again.');
  }
}

async function applyVerifiedPayOSWebhook(webhook) {
  const payos = getPayOSClient();
  let verified;
  try {
    verified = await payos.webhooks.verify(webhook);
  } catch {
    throw new AppError(400, 'Invalid PayOS webhook signature');
  }

  const data = verified?.data || verified;
  if (!data || !Number.isSafeInteger(data.orderCode) || !Number.isInteger(data.amount)) {
    throw new AppError(400, 'PayOS webhook has invalid payment details');
  }

  const payment = await MembershipPayment.findOne({ orderCode: data.orderCode }).lean();
  if (!payment) throw new AppError(404, 'Membership payment not found');
  if (data.amount !== payment.amount || (data.currency && data.currency !== 'VND')) {
    throw new AppError(400, 'PayOS payment amount or currency does not match');
  }
  if (payment.paymentLinkId && data.paymentLinkId !== payment.paymentLinkId) {
    throw new AppError(400, 'PayOS payment link does not match');
  }

  if (data.code !== PAYOS_SUCCESS_CODE || webhook.success !== true) {
    return { accepted: true, alreadyApplied: false, status: payment.status };
  }
  if (payment.status === 'PAID' && payment.appliedAt) {
    return { accepted: true, alreadyApplied: true, status: 'PAID' };
  }
  if (payment.status !== 'PENDING') {
    return { accepted: true, alreadyApplied: false, status: payment.status };
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const currentPayment = await MembershipPayment.findOne({
        _id: payment._id,
        status: 'PENDING',
        appliedAt: null,
      }).session(session);

      if (!currentPayment) {
        const latest = await MembershipPayment.findById(payment._id).session(session).lean();
        result = {
          accepted: true,
          alreadyApplied: latest?.status === 'PAID' && Boolean(latest?.appliedAt),
          status: latest?.status || 'FAILED',
        };
        return;
      }

      const now = new Date();
      currentPayment.status = 'PAID';
      currentPayment.paidAt = now;
      currentPayment.appliedAt = now;
      currentPayment.providerReference = data.reference;
      await currentPayment.save({ session });

      const subscription = await ProviderSubscription.findById(currentPayment.subscription).session(session);
      if (!subscription || subscription.provider.toString() !== currentPayment.provider.toString()) {
        throw new AppError(409, 'Provider subscription does not match the payment');
      }

      const periodIsActive =
        subscription.status === 'ACTIVE' &&
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd > now;
      const periodStart = periodIsActive ? subscription.currentPeriodStart : now;
      const extensionBase = periodIsActive ? subscription.currentPeriodEnd : now;

      subscription.plan = currentPayment.plan;
      subscription.status = 'ACTIVE';
      subscription.currentPeriodStart = periodStart;
      subscription.currentPeriodEnd = addCalendarMonth(extensionBase);
      subscription.lastPayment = currentPayment._id;
      await subscription.save({ session });
      result = { accepted: true, alreadyApplied: false, status: 'PAID' };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createMembershipCheckout,
  applyVerifiedPayOSWebhook,
  addCalendarMonth,
};
