import { Router } from 'express';
import {
  createCheckoutSession,
  webhook,
  getMyPayments,
  getPaymentById,
} from './payment.controller';
import { validateCreateCheckoutSession } from './payment.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateObjectId } from '../trip/trip.validation';

const router = Router();

router.post('/create-checkout-session', verifyToken, validateCreateCheckoutSession, asyncHandler(createCheckoutSession));
router.post('/webhook', asyncHandler(webhook));
router.get('/me', verifyToken, asyncHandler(getMyPayments));
router.get('/:id', verifyToken, validateObjectId('id'), asyncHandler(getPaymentById));

export default router;
