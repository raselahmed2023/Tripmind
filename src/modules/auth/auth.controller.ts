import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as userService from '../user/user.service';
import * as authService from './auth.service';
import { IUser } from './auth.interface';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  const tokens = authService.generateTokens(user);

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

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

  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

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
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  ApiResponse.success(res, 'Logged out successfully');
};
