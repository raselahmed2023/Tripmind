import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as paymentService from './payment.service';

export const createTripPlanCheckout = async (req: Request, res: Response) => {
  const { tripId } = req.body;
  const userId = req.user!.userId;
  const email = req.user!.email;

  const result = await paymentService.createTripPlanCheckout(userId, email, tripId);

  ApiResponse.success(res, 'Checkout session created', {
    sessionId: result.sessionId,
    url: result.url,
  });
};

export const verifyTripPlanPayment = async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const userId = req.user!.userId;

  const result = await paymentService.verifyTripPlanPayment(sessionId, userId);

  ApiResponse.success(res, 'Payment verified successfully', {
    payment: {
      _id: result.payment._id,
      status: result.payment.status,
      amount: result.payment.amount,
      currency: result.payment.currency,
      paidAt: result.payment.paidAt,
    },
    trip: {
      _id: result.trip._id,
      isPlanPurchased: result.trip.isPlanPurchased,
      paymentStatus: result.trip.paymentStatus,
    },
  });
};

export const getTripPaymentStatus = async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === 'admin';

  const status = await paymentService.getTripPaymentStatus(tripId, userId, isAdmin);

  ApiResponse.success(res, 'Payment status fetched', status);
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
