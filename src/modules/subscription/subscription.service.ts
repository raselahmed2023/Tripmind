import { Types } from 'mongoose';
import Stripe from 'stripe';
import { Subscription } from './subscription.model';
import { Payment } from '../payment/payment.model';
import { ISubscription } from './subscription.interface';
import { ApiError } from '../../utils/ApiError';
import { config } from '../../config';
import * as stripeService from '../payment/stripe.service';
import { safeNotify } from '../notification/notification.service';

const FREE_CREDIT_LIMIT = 3;
const PRO_CREDIT_LIMIT = 50;
const CREDIT_PACK_AMOUNT = 10;

export const getOrCreateFreeSubscription = async (
  userId: string,
): Promise<ISubscription> => {
  let subscription = await Subscription.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!subscription) {
    subscription = await Subscription.create({
      userId: new Types.ObjectId(userId),
      plan: 'free',
      status: 'active',
      aiCredits: FREE_CREDIT_LIMIT,
    });
  }

  return subscription;
};

export const getSubscriptionByUser = async (
  userId: string,
): Promise<ISubscription> => {
  const subscription = await Subscription.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!subscription) {
    return getOrCreateFreeSubscription(userId);
  }

  return subscription;
};

export const createPortalSession = async (
  userId: string,
): Promise<{ url: string }> => {
  const subscription = await Subscription.findOne({
    userId: new Types.ObjectId(userId),
    stripeCustomerId: { $ne: null },
  });

  if (!subscription || !subscription.stripeCustomerId) {
    throw ApiError.badRequest('No active subscription found. Subscribe first.');
  }

  const session = await stripeService.createPortalSession(
    subscription.stripeCustomerId,
    `${config.CLIENT_URL}/settings/billing`,
  );

  return { url: session.url };
};

const getSubscriptionPeriodEnd = (stripeSub: Stripe.Subscription): number => {
  const items = stripeSub.items as Stripe.ApiList<Stripe.SubscriptionItem>;
  if (items && items.data && items.data.length > 0) {
    return items.data[0].current_period_end;
  }
  return stripeSub.start_date;
};

export const handleSubscriptionCreated = async (
  stripeSub: Stripe.Subscription,
): Promise<void> => {
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;

  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
  const subscriptionId = stripeSub.id;

  const existing = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
  if (existing && existing.status === 'active') return;

  const periodEnd = getSubscriptionPeriodEnd(stripeSub);

  await Subscription.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: 'pro_monthly',
      status: 'active',
      startsAt: new Date(stripeSub.start_date * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      aiCredits: PRO_CREDIT_LIMIT,
    },
    { upsert: true, new: true },
  );

  safeNotify({
    userId,
    type: 'subscription_activated',
    title: 'Subscription Activated',
    message: 'Your TripMind Pro subscription is now active with 50 AI credits!',
    relatedEntityType: 'system',
    metadata: { plan: 'pro_monthly', aiCredits: PRO_CREDIT_LIMIT },
  });
};

export const handleSubscriptionUpdated = async (
  stripeSub: Stripe.Subscription,
): Promise<void> => {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSub.id,
  });
  if (!subscription) return;

  const stripeStatus = stripeSub.status as string;
  let newStatus: ISubscription['status'] = 'active';
  if (stripeStatus === 'past_due') newStatus = 'past_due';
  else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') newStatus = 'cancelled';
  else if (stripeStatus === 'incomplete_expired') newStatus = 'expired';

  const periodEnd = getSubscriptionPeriodEnd(stripeSub);

  const updateData: Record<string, unknown> = {
    status: newStatus,
    currentPeriodEnd: new Date(periodEnd * 1000),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
  };

  if (stripeSub.cancel_at_period_end && !subscription.cancelAtPeriodEnd) {
    safeNotify({
      userId: subscription.userId.toString(),
      type: 'subscription_cancelled',
      title: 'Subscription Cancellation Scheduled',
      message:
        'Your subscription will be cancelled at the end of the current billing period.',
      relatedEntityType: 'system',
      metadata: { currentPeriodEnd: periodEnd },
    });
  }

  await Subscription.findByIdAndUpdate(subscription._id, updateData);
};

export const handleSubscriptionDeleted = async (
  stripeSub: Stripe.Subscription,
): Promise<void> => {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSub.id,
  });
  if (!subscription) return;

  if (subscription.status === 'cancelled') return;

  await Subscription.findByIdAndUpdate(subscription._id, {
    status: 'cancelled',
    plan: 'free',
    aiCredits: Math.min(subscription.aiCredits, FREE_CREDIT_LIMIT),
    cancelAtPeriodEnd: false,
  });

  safeNotify({
    userId: subscription.userId.toString(),
    type: 'subscription_cancelled',
    title: 'Subscription Cancelled',
    message: 'Your TripMind Pro subscription has been cancelled.',
    relatedEntityType: 'system',
    metadata: { plan: 'free' },
  });
};

export const handleInvoicePaid = async (invoice: Stripe.Invoice): Promise<void> => {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return;

  const subscriptionId =
    typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id;
  if (!subscriptionId) return;

  const subscription = await Subscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });
  if (!subscription) return;

  const periodEnd = invoice.period_end;

  await Subscription.findByIdAndUpdate(subscription._id, {
    status: 'active',
    currentPeriodEnd: new Date(periodEnd * 1000),
    aiCredits: PRO_CREDIT_LIMIT,
  });

  safeNotify({
    userId: subscription.userId.toString(),
    type: 'payment_completed',
    title: 'Subscription Renewed',
    message: 'Your subscription has been renewed. 50 AI credits have been replenished.',
    relatedEntityType: 'system',
    metadata: { aiCredits: PRO_CREDIT_LIMIT },
  });
};

export const handleInvoicePaymentFailed = async (
  invoice: Stripe.Invoice,
): Promise<void> => {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return;

  const subscriptionId =
    typeof subDetails.subscription === 'string'
      ? subDetails.subscription
      : subDetails.subscription.id;
  if (!subscriptionId) return;

  const subscription = await Subscription.findOne({
    stripeSubscriptionId: subscriptionId,
  });
  if (!subscription) return;

  await Subscription.findByIdAndUpdate(subscription._id, {
    status: 'past_due',
  });

  safeNotify({
    userId: subscription.userId.toString(),
    type: 'payment_failed',
    title: 'Subscription Payment Failed',
    message:
      'Your subscription payment failed. Please update your payment method to avoid service interruption.',
    relatedEntityType: 'system',
    metadata: {},
  });
};

export const handleCreditPackPurchase = async (
  payment: InstanceType<typeof Payment>,
): Promise<void> => {
  const userId = payment.userId.toString();

  const subscription = await Subscription.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (subscription) {
    await Subscription.findByIdAndUpdate(subscription._id, {
      $inc: { aiCredits: CREDIT_PACK_AMOUNT },
    });
  } else {
    await Subscription.create({
      userId: new Types.ObjectId(userId),
      stripeCustomerId: payment.stripeCustomerId,
      plan: 'free',
      status: 'active',
      aiCredits: FREE_CREDIT_LIMIT + CREDIT_PACK_AMOUNT,
    });
  }

  safeNotify({
    userId,
    type: 'ai_credits_added',
    title: 'AI Credits Added',
    message: `${CREDIT_PACK_AMOUNT} AI generation credits have been added to your account.`,
    relatedEntityType: 'system',
    metadata: { creditsAdded: CREDIT_PACK_AMOUNT },
  });
};

export const reserveCredit = async (userId: string): Promise<boolean> => {
  const result = await Subscription.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      aiCredits: { $gt: 0 },
    },
    { $inc: { aiCredits: -1 } },
    { new: true },
  );

  return result !== null;
};

export const rollbackCredit = async (userId: string): Promise<void> => {
  await Subscription.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $inc: { aiCredits: 1 } },
  );
};
