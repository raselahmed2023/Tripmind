import { Types } from 'mongoose';
import { Payment } from './payment.model';
import { IPayment, IPaymentQuery } from './payment.interface';
import { Trip } from '../trip/trip.model';
import { config } from '../../config';
import { ApiError } from '../../utils/ApiError';
import * as stripeService from './stripe.service';
import { safeNotify } from '../notification/notification.service';

export const createTripPlanCheckout = async (
  userId: string,
  email: string,
  tripId: string,
): Promise<{ sessionId: string; checkoutUrl: string }> => {
  if (!Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip ID');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }

  if (trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only purchase plans for your own trips');
  }

  if (trip.isPlanPurchased && trip.paymentStatus === 'paid') {
    throw ApiError.badRequest('This trip plan has already been purchased');
  }

  // Check for existing payment record (pending or cancelled — allow retry)
  const existingPayment = await Payment.findOne({
    userId: new Types.ObjectId(userId),
    tripId: new Types.ObjectId(tripId),
    status: { $in: ['pending', 'cancelled', 'failed'] },
  }).sort({ createdAt: -1 });

  if (existingPayment && existingPayment.status === 'pending') {
    // Retrieve the session to check if it's still valid
    try {
      const session = await stripeService.retrieveCheckoutSession(existingPayment.stripeCheckoutSessionId);
      if (session.status === 'open') {
        return { sessionId: session.id, checkoutUrl: session.url! };
      }
    } catch {
      // Session expired or invalid, create a new one
    }
  }

  // Create new Stripe checkout session
  const session = await stripeService.createTripPlanCheckoutSession({
    userId,
    tripId,
    customerEmail: email,
    successUrl: `${config.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.CLIENT_URL}/payment/cancel?tripId=${tripId}`,
  });

  if (existingPayment) {
    // Update existing payment record with new session ID instead of creating a duplicate
    existingPayment.stripeCheckoutSessionId = session.id;
    existingPayment.status = 'pending';
    existingPayment.amount = config.TRIP_PLAN_PRICE_CENTS;
    existingPayment.currency = config.TRIP_PLAN_CURRENCY;
    existingPayment.paidAt = null;
    await existingPayment.save();
  } else {
    // Create new payment record
    await Payment.create({
      userId: new Types.ObjectId(userId),
      tripId: new Types.ObjectId(tripId),
      stripeCheckoutSessionId: session.id,
      productType: 'trip_plan',
      amount: config.TRIP_PLAN_PRICE_CENTS,
      currency: config.TRIP_PLAN_CURRENCY,
      status: 'pending',
    });
  }

  // Do NOT set Trip.paymentStatus to pending — keep it unpaid until Stripe confirms
  return { sessionId: session.id, checkoutUrl: session.url! };
};

export const verifyTripPlanPayment = async (
  sessionId: string,
  userId: string,
): Promise<{ tripId: string; isPlanPurchased: boolean; paymentStatus: string; purchasedAt: Date | null }> => {
  // Retrieve session from Stripe
  const session = await stripeService.retrieveCheckoutSession(sessionId);

  // Validate session
  if (!session) {
    throw ApiError.notFound('Checkout session not found');
  }

  if (session.payment_status !== 'paid') {
    throw ApiError.badRequest('Payment has not been completed');
  }

  if (session.metadata?.productType !== 'trip_plan') {
    throw ApiError.badRequest('Invalid product type');
  }

  if (session.metadata?.userId !== userId) {
    throw ApiError.forbidden('This payment does not belong to you');
  }

  const tripId = session.metadata?.tripId;
  if (!tripId || !Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip reference in payment');
  }

  // Verify amount and currency
  if (session.amount_total !== config.TRIP_PLAN_PRICE_CENTS) {
    throw ApiError.badRequest('Payment amount mismatch');
  }

  if (session.currency !== config.TRIP_PLAN_CURRENCY) {
    throw ApiError.badRequest('Payment currency mismatch');
  }

  // Verify trip ownership
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }

  if (trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only verify payments for your own trips');
  }

  const wasAlreadyPaid = trip.isPlanPurchased && trip.paymentStatus === 'paid';

  // Find or update payment record (idempotent)
  let payment = await Payment.findOne({ stripeCheckoutSessionId: sessionId });

  if (payment && payment.status === 'paid') {
    // Already processed — return existing successful result
    return {
      tripId: trip._id.toString(),
      isPlanPurchased: true,
      paymentStatus: 'paid',
      purchasedAt: trip.purchasedAt,
    };
  }

  if (!payment) {
    payment = await Payment.create({
      userId: new Types.ObjectId(userId),
      tripId: new Types.ObjectId(tripId),
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      productType: 'trip_plan',
      amount: session.amount_total || config.TRIP_PLAN_PRICE_CENTS,
      currency: session.currency || config.TRIP_PLAN_CURRENCY,
      status: 'paid',
      paidAt: new Date(),
    });
  } else {
    // Update existing pending payment
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : payment.stripePaymentIntentId;
    if (session.amount_total !== null) payment.amount = session.amount_total;
    if (session.currency) payment.currency = session.currency;
    await payment.save();
  }

  // Update trip (idempotent)
  const purchasedAt = trip.purchasedAt || new Date();
  await Trip.findByIdAndUpdate(tripId, {
    paymentStatus: 'paid',
    isPlanPurchased: true,
    purchasedAt,
  });

  // Send notification only once (not on repeated verification)
  if (!wasAlreadyPaid) {
    safeNotify({
      userId,
      type: 'payment_completed',
      title: 'Trip Plan Purchased',
      message: 'Your AI trip plan has been purchased. You can now generate your itinerary.',
      relatedEntityType: 'trip',
      relatedEntityId: tripId,
      metadata: { tripId, amount: payment.amount, currency: payment.currency },
    });
  }

  // Retrieve and return the updated Trip document
  const updatedTrip = await Trip.findById(tripId);
  return {
    tripId: updatedTrip!._id.toString(),
    isPlanPurchased: updatedTrip!.isPlanPurchased,
    paymentStatus: updatedTrip!.paymentStatus,
    purchasedAt: updatedTrip!.purchasedAt,
  };
};

export const getTripPaymentStatus = async (
  tripId: string,
  userId: string,
  isAdmin: boolean,
) => {
  if (!Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip ID');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw ApiError.notFound('Trip not found');
  }

  if (!isAdmin && trip.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  return {
    tripId: trip._id,
    isPlanPurchased: trip.isPlanPurchased,
    paymentStatus: trip.paymentStatus,
    purchasedAt: trip.purchasedAt,
  };
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
