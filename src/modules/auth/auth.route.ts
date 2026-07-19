import { Router } from 'express';
import { register, login, getMe, logout } from './auth.controller';
import { validateRegister, validateLogin } from './auth.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.post('/register', validateRegister, asyncHandler(register));
router.post('/login', validateLogin, asyncHandler(login));
router.get('/me', verifyToken, asyncHandler(getMe));
router.post('/logout', verifyToken, asyncHandler(logout));

export default router;
