import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { config } from '../../config';
import * as userService from '../user/user.service';
import * as authService from './auth.service';
import { IUser, ITokenPayload } from './auth.interface';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

export const register = async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  const tokens = authService.generateTokens(user);

  res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

  ApiResponse.success(res, 'Registration successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken: tokens.accessToken,
  }, 201);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await (user as IUser & { comparePassword: (pw: string) => Promise<boolean> }).comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = authService.generateTokens(user);

  res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

  ApiResponse.success(res, 'Login successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken: tokens.accessToken,
  });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token required');
  }

  let decoded: ITokenPayload;
  try {
    decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as ITokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userService.getUserById(decoded.userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const tokens = authService.generateTokens(user);

  res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

  ApiResponse.success(res, 'Token refreshed successfully', {
    accessToken: tokens.accessToken,
  });
};

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const user = await userService.getUserById(req.user.userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  ApiResponse.success(res, 'User fetched successfully', user);
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
  ApiResponse.success(res, 'Logged out successfully');
};
