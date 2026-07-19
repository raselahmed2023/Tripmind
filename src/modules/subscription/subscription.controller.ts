import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as subscriptionService from './subscription.service';

export const createPortalSession = async (req: Request, res: Response) => {
  const result = await subscriptionService.createPortalSession(req.user!.userId);
  ApiResponse.success(res, 'Portal session created', { url: result.url });
};

export const getMySubscription = async (req: Request, res: Response) => {
  const subscription = await subscriptionService.getSubscriptionByUser(req.user!.userId);
  ApiResponse.success(res, 'Subscription fetched successfully', subscription);
};
