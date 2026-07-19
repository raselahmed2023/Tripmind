import { Router } from 'express';
import {
  createTripPlanCheckout,
  verifyTripPlanPayment,
  getTripPaymentStatus,
  getMyPayments,
} from './payment.controller';
import { validateTripPlanCheckout, validateTripPlanVerify } from './payment.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/trip-plan/checkout', verifyToken, validateTripPlanCheckout, asyncHandler(createTripPlanCheckout));
router.post('/trip-plan/verify', verifyToken, validateTripPlanVerify, asyncHandler(verifyTripPlanPayment));
router.get('/trip-plan/status/:tripId', verifyToken, asyncHandler(getTripPaymentStatus));
router.get('/me', verifyToken, asyncHandler(getMyPayments));

export default router;
