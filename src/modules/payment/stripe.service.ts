import Stripe from 'stripe';
import { config } from '../../config';
import { ApiError } from '../../utils/ApiError';

let stripeInstance: Stripe | null = null;

const getStripe = (): Stripe => {
  if (!stripeInstance) {
    if (!config.STRIPE_SECRET_KEY) {
      throw ApiError.internal('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
    }
    stripeInstance = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
    });
  }
  return stripeInstance;
};

export const createCustomer = async (
  email: string,
  name: string,
): Promise<Stripe.Customer> => {
  const stripe = getStripe();
  return stripe.customers.create({ email, name });
};

export const findCustomerByEmail = async (
  email: string,
): Promise<Stripe.Customer | null> => {
  const stripe = getStripe();
  const result = await stripe.customers.list({ email, limit: 1 });
  return result.data.length > 0 ? result.data[0] : null;
};

export const createCheckoutSession = async (params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    subscription_data: {
      metadata: params.metadata,
    },
  });
};

export const createOneTimeCheckoutSession = async (params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'payment',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });
};

export const createPortalSession = async (
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> => {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

export const constructWebhookEvent = (
  body: Buffer,
  signature: string,
): Stripe.Event => {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw ApiError.internal('Stripe webhook secret is not configured.');
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET);
};

export const retrieveSubscription = async (
  subscriptionId: string,
): Promise<Stripe.Subscription> => {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
};
