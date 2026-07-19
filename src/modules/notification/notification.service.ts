import { Types } from 'mongoose';
import { Notification } from './notification.model';
import { INotification, INotificationQuery, NotificationType, RelatedEntityType } from './notification.interface';
import { ApiError } from '../../utils/ApiError';

const buildSortObject = (sort: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'oldest': return { createdAt: 1 };
    case 'newest':
    default: return { createdAt: -1 };
  }
};

export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<INotification> => {
  return Notification.create({
    userId: new Types.ObjectId(data.userId),
    type: data.type,
    title: data.title,
    message: data.message,
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId ? new Types.ObjectId(data.relatedEntityId) : null,
    metadata: data.metadata || {},
  });
};

export const getMyNotifications = async (userId: string, query: INotificationQuery) => {
  const { type, isRead, sort = 'newest', page = 1, limit = 20 } = query;
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  const skip = (page - 1) * limit;
  const sortObj = buildSortObject(sort);
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort(sortObj).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  return { notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({ userId: new Types.ObjectId(userId), isRead: false });
};

export const markAsRead = async (id: string, userId: string): Promise<INotification> => {
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid notification ID');
  }
  const notification = await Notification.findById(id);
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  notification.isRead = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId: string): Promise<{ modifiedCount: number }> => {
  const result = await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { isRead: true },
  );
  return { modifiedCount: result.modifiedCount || 0 };
};

export const deleteNotification = async (id: string, userId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid notification ID');
  }
  const notification = await Notification.findById(id);
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId.toString() !== userId) throw ApiError.forbidden('Access denied');
  await Notification.findByIdAndDelete(id);
};

export const clearReadNotifications = async (userId: string): Promise<{ deletedCount: number }> => {
  const result = await Notification.deleteMany({
    userId: new Types.ObjectId(userId),
    isRead: true,
  });
  return { deletedCount: result.deletedCount || 0 };
};

export const safeNotify = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await createNotification(data);
  } catch {
    console.error('[Notification] Failed to create notification for user:', data.userId);
  }
};
