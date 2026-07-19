import { Router } from 'express';
import { register, login, refresh, getMe, logout } from './auth.controller';
import { googleAuth, googleCallback, googleExchange } from './google.controller';
import { validateRegister, validateLogin, validateGoogleExchange } from './auth.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Local auth
router.post('/register', validateRegister, asyncHandler(register));
router.post('/login', validateLogin, asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
router.get('/me', verifyToken, asyncHandler(getMe));
router.post('/logout', asyncHandler(logout));

// Google OAuth
router.get('/google', asyncHandler(googleAuth));
router.get('/google/callback', asyncHandler(googleCallback));
router.post('/google/exchange', validateGoogleExchange, asyncHandler(googleExchange));

export default router;
