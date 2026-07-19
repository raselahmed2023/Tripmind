import Stripe from 'stripe';
import { config } from '../../config';

let stripeInstance: Stripe | null = null;

const getStripe = (): Stripe => {
  if (!stripeInstance) {
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

export const createTripPlanCheckoutSession = async (params: {
  userId: string;
  tripId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: config.TRIP_PLAN_CURRENCY,
          product_data: {
            name: 'AI Trip Plan',
            description: 'One-time AI-generated trip itinerary',
          },
          unit_amount: config.TRIP_PLAN_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      tripId: params.tripId,
      productType: 'trip_plan',
    },
    client_reference_id: params.tripId,
  });
};

export const retrieveCheckoutSession = async (
  sessionId: string,
): Promise<Stripe.Checkout.Session> => {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
};
