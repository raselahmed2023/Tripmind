import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as notificationService from './notification.service';
import { notificationQuerySchema } from './notification.validation';

export const getMyNotifications = async (req: Request, res: Response) => {
  const query = notificationQuerySchema.parse(req.query);
  const result = await notificationService.getMyNotifications(req.user!.userId, query);
  ApiResponse.paginated(
    res,
    'Notifications fetched successfully',
    result.notifications,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const count = await notificationService.getUnreadCount(req.user!.userId);
  ApiResponse.success(res, 'Unread count fetched', { count });
};

export const markAsRead = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const notification = await notificationService.markAsRead(id, req.user!.userId);
  ApiResponse.success(res, 'Notification marked as read', notification);
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.userId);
  ApiResponse.success(res, 'All notifications marked as read', result);
};

export const deleteNotification = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await notificationService.deleteNotification(id, req.user!.userId);
  ApiResponse.success(res, 'Notification deleted successfully');
};

export const clearReadNotifications = async (req: Request, res: Response) => {
  const result = await notificationService.clearReadNotifications(req.user!.userId);
  ApiResponse.success(res, 'Read notifications cleared', result);
};
