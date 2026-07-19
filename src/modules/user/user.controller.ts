import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { getUserById } from './user.service';
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
