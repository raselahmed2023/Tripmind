import { Types } from 'mongoose';
import Stripe from 'stripe';
import { Payment } from './payment.model';
import { IPayment, ICreateCheckoutSessionInput, IPaymentQuery } from './payment.interface';
import { config } from '../../config';
import { ApiError } from '../../utils/ApiError';
import * as stripeService from './stripe.service';
import { safeNotify } from '../notification/notification.service';

const PRICE_MAP: Record<string, { priceId: string; amount: number }> = {
  subscription: {
    priceId: config.STRIPE_PRO_MONTHLY_PRICE_ID,
    amount: 1999,
  },
  credit_pack: {
    priceId: config.STRIPE_AI_CREDITS_10_PRICE_ID,
    amount: 999,
  },
};

const PLAN_MAP: Record<string, 'pro_monthly' | 'ai_credits_10'> = {
  subscription: 'pro_monthly',
  credit_pack: 'ai_credits_10',
};

const findOrCreateStripeCustomer = async (
  userId: string,
  email: string,
  name: string,
): Promise<string> => {
  const existing = await Payment.findOne({
    userId: new Types.ObjectId(userId),
    stripeCustomerId: { $ne: null },
  }).sort({ createdAt: -1 });

  if (existing && existing.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripeService.createCustomer(email, name);
  return customer.id;
};

export const createCheckoutSession = async (
  userId: string,
  email: string,
  name: string,
  input: ICreateCheckoutSessionInput,
): Promise<{ sessionId: string; url: string }> => {
  const priceConfig = PRICE_MAP[input.productType];
  if (!priceConfig || !priceConfig.priceId) {
    throw ApiError.badRequest(
      'Payment is not configured for this product. Contact support.',
    );
  }

  const customerId = await findOrCreateStripeCustomer(userId, email, name);
  const metadata = { userId, productType: input.productType };

  let session: Stripe.Checkout.Session;

  if (input.productType === 'subscription') {
    session = await stripeService.createCheckoutSession({
      customerId,
      priceId: priceConfig.priceId,
      successUrl: `${config.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${config.CLIENT_URL}/payment/cancel`,
      metadata,
    });
  } else {
    session = await stripeService.createOneTimeCheckoutSession({
      customerId,
      priceId: priceConfig.priceId,
      successUrl: `${config.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${config.CLIENT_URL}/payment/cancel`,
      metadata,
    });
  }

  await Payment.create({
    userId: new Types.ObjectId(userId),
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: customerId,
    productType: input.productType,
    plan: PLAN_MAP[input.productType],
    amount: priceConfig.amount,
    currency: 'usd',
    status: 'pending',
    metadata,
  });

  return { sessionId: session.id, url: session.url! };
};

export const getPaymentsByUser = async (
  userId: string,
  query: IPaymentQuery,
): Promise<{ payments: IPayment[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const { page = 1, limit = 10 } = query;
  const filter = { userId: new Types.ObjectId(userId) };
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getPaymentById = async (
  paymentId: string,
  userId: string,
): Promise<IPayment> => {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw ApiError.badRequest('Invalid payment ID');
  }
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }
  if (payment.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only access your own payments');
  }
  return payment;
};

export const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const userId = session.metadata?.userId;
  const productType = session.metadata?.productType;
  if (!userId || !productType) return;

  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment || payment.status === 'paid') return;

  payment.stripePaymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;
  payment.stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null;
  payment.status = 'paid';
  payment.paidAt = new Date();

  // Use actual amounts from Stripe
  if (session.amount_total !== null) {
    payment.amount = session.amount_total;
  }
  if (session.currency) {
    payment.currency = session.currency;
  }

  await payment.save();

  safeNotify({
    userId,
    type: 'payment_completed',
    title: 'Payment Completed',
    message:
      productType === 'subscription'
        ? 'Your Pro Monthly subscription has been activated!'
        : 'Your AI Credit Pack has been purchased!',
    relatedEntityType: 'system',
    metadata: { productType, amount: payment.amount, currency: payment.currency },
  });
};

export const handleCheckoutSessionExpired = async (
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment || payment.status !== 'pending') return;

  payment.status = 'cancelled';
  await payment.save();
};

export const handlePaymentIntentFailed = async (
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> => {
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
  if (!payment || payment.status === 'failed') return;

  payment.status = 'failed';
  await payment.save();

  safeNotify({
    userId: payment.userId.toString(),
    type: 'payment_failed',
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again or use a different payment method.',
    relatedEntityType: 'system',
    metadata: { productType: payment.productType },
  });
};
