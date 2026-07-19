import { Router } from 'express';
import { getMe, updateMe } from './user.controller';
import { validateUpdateUser } from './user.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/me', verifyToken, asyncHandler(getMe));
router.patch('/me', verifyToken, validateUpdateUser, asyncHandler(updateMe));

export default router;
