import { Request, Response } from 'express';
import Stripe from 'stripe';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as paymentService from './payment.service';
import * as subscriptionService from '../subscription/subscription.service';
import * as stripeService from './stripe.service';
import { User } from '../user/user.model';
import { Payment } from './payment.model';

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { productType } = req.body;
  const userId = req.user!.userId;
  const email = req.user!.email;

  const user = await User.findById(userId).select('name email');
  const name = user?.name || email;

  const result = await paymentService.createCheckoutSession(userId, email, name, {
    productType,
  });

  ApiResponse.success(res, 'Checkout session created', {
    sessionId: result.sessionId,
    url: result.url,
  });
};

export const webhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    throw ApiError.badRequest('Missing stripe-signature header');
  }

  let event: Stripe.Event;
  try {
    event = stripeService.constructWebhookEvent(req.body as Buffer, signature);
  } catch {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentService.handleCheckoutSessionCompleted(session);

      const productType = session.metadata?.productType;
      if (productType === 'subscription') {
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const stripeSub = await stripeService.retrieveSubscription(subscriptionId);
          await subscriptionService.handleSubscriptionCreated(stripeSub);
        }
      } else if (productType === 'credit_pack') {
        const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
        if (payment) {
          await subscriptionService.handleCreditPackPurchase(payment);
        }
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await paymentService.handleCheckoutSessionExpired(session);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await paymentService.handlePaymentIntentFailed(paymentIntent);
      break;
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      await subscriptionService.handleSubscriptionCreated(subscription);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await subscriptionService.handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await subscriptionService.handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await subscriptionService.handleInvoicePaid(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await subscriptionService.handleInvoicePaymentFailed(invoice);
      break;
    }

    default:
      break;
  }

  res.status(200).json({ received: true });
};

export const getMyPayments = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await paymentService.getPaymentsByUser(req.user!.userId, { page, limit });

  ApiResponse.paginated(
    res,
    'Payments fetched successfully',
    result.payments,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getPaymentById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payment = await paymentService.getPaymentById(id, req.user!.userId);
  ApiResponse.success(res, 'Payment fetched successfully', payment);
};
