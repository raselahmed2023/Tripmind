import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { getUserById, updateUser } from './user.service';
import { ApiError } from '../../utils/ApiError';

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }
  const user = await getUserById(req.user.userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  ApiResponse.success(res, 'User fetched successfully', user);
};

export const updateMe = async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  const blockedFields = ['role', 'password', 'email', 'subscription', 'credits', 'stripeCustomerId', 'stripeSubscriptionId'];
  const bodyKeys = Object.keys(req.body);
  const blocked = bodyKeys.filter((key) => blockedFields.includes(key));
  if (blocked.length > 0) {
    throw ApiError.badRequest('Cannot update restricted fields: ' + blocked.join(', '));
  }

  const user = await updateUser(req.user.userId, req.body);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  ApiResponse.success(res, 'User updated successfully', user);
};
