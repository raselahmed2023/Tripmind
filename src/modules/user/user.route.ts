import { Router } from 'express';
import { getMe } from './user.controller';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/me', verifyToken, asyncHandler(getMe));

export default router;
