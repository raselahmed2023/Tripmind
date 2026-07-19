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
): Promise<{ sessionId: string; url: string }> => {
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

  // Check for existing pending session (prevent duplicates)
  const existingPending = await Payment.findOne({
    userId: new Types.ObjectId(userId),
    tripId: new Types.ObjectId(tripId),
    status: 'pending',
  });

  if (existingPending) {
    // Retrieve the session to check if it's still valid
    try {
      const session = await stripeService.retrieveCheckoutSession(existingPending.stripeCheckoutSessionId);
      if (session.status === 'open') {
        return { sessionId: session.id, url: session.url! };
      }
    } catch {
      // Session expired or invalid, create a new one
    }
  }

  // Mark trip as pending payment
  await Trip.findByIdAndUpdate(tripId, { paymentStatus: 'pending' });

  const session = await stripeService.createTripPlanCheckoutSession({
    userId,
    tripId,
    customerEmail: email,
    successUrl: `${config.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${config.CLIENT_URL}/payment/cancel?tripId=${tripId}`,
  });

  // Create payment record
  await Payment.create({
    userId: new Types.ObjectId(userId),
    tripId: new Types.ObjectId(tripId),
    stripeCheckoutSessionId: session.id,
    productType: 'trip_plan',
    amount: config.TRIP_PLAN_PRICE_CENTS,
    currency: config.TRIP_PLAN_CURRENCY,
    status: 'pending',
  });

  return { sessionId: session.id, url: session.url! };
};

export const verifyTripPlanPayment = async (
  sessionId: string,
  userId: string,
): Promise<{ payment: IPayment; trip: InstanceType<typeof Trip> }> => {
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

  // Find or update payment record (idempotent)
  let payment = await Payment.findOne({ stripeCheckoutSessionId: sessionId });

  if (payment && payment.status === 'paid') {
    // Already processed - return existing
    return { payment, trip };
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
  if (!trip.isPlanPurchased) {
    await Trip.findByIdAndUpdate(tripId, {
      paymentStatus: 'paid',
      isPlanPurchased: true,
      purchasedAt: new Date(),
    });
  }

  // Send notification (only once - check if already paid)
  safeNotify({
    userId,
    type: 'payment_completed',
    title: 'Trip Plan Purchased',
    message: 'Your AI trip plan has been purchased. You can now generate your itinerary.',
    relatedEntityType: 'trip',
    relatedEntityId: tripId,
    metadata: { tripId, amount: payment.amount, currency: payment.currency },
  });

  return { payment, trip: trip as InstanceType<typeof Trip> };
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
