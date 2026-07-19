import { Router } from 'express';
import { createPortalSession, getMySubscription } from './subscription.controller';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/create-portal-session', verifyToken, asyncHandler(createPortalSession));
router.get('/me', verifyToken, asyncHandler(getMySubscription));

export default router;
