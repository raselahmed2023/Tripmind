import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../../config';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as googleService from './google.service';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

export const googleAuth = async (req: Request, res: Response) => {
  const state = crypto.randomBytes(32).toString('hex');
  // Store state in a short-lived cookie for CSRF protection
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  const url = googleService.getGoogleAuthUrl(state);
  res.redirect(url);
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error) {
    throw ApiError.badRequest('Google OAuth error: ' + error);
  }

  if (!code || !state) {
    throw ApiError.badRequest('Missing authorization code or state');
  }

  // Validate state (CSRF protection)
  const storedState = req.cookies?.oauth_state;
  if (!storedState || storedState !== state) {
    throw ApiError.unauthorized('Invalid OAuth state');
  }

  // Clear the state cookie
  res.clearCookie('oauth_state', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  });

  // Exchange the authorization code for an ID token
  const idToken = await googleService.exchangeCodeForIdToken(code);

  // Verify the ID token and get user info
  const googleData = await googleService.verifyGoogleIdToken(idToken);

  // Find or create the user
  const user = await googleService.findOrCreateGoogleUser(googleData);

  // Create a one-time exchange code
  const exchangeCode = await googleService.createExchangeCode(user._id.toString());

  // Redirect to frontend with the exchange code
  const redirectUrl = `${config.CLIENT_URL}/auth/google/callback?code=${exchangeCode}`;
  res.redirect(redirectUrl);
};

export const googleExchange = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    throw ApiError.badRequest('Exchange code is required');
  }

  const { user, tokens } = await googleService.exchangeCodeForTokens(code);

  // Set refresh cookie
  res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

  ApiResponse.success(res, 'Google authentication successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken: tokens.accessToken,
  });
};
