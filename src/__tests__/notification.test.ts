import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import * as notificationService from '../modules/notification/notification.service';

beforeAll(async () => await setupTestDB());
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

const createUser = async (email = 'test@test.com') => {
  return User.create({
    name: 'Test User',
    email,
    password: 'password123',
    role: 'user',
  });
};

describe('Notification Service', () => {
  it('should create a notification', async () => {
    const user = await createUser();
    const notification = await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'ai_generation_started',
      title: 'Generation Started',
      message: 'Your trip is being generated',
      relatedEntityType: 'trip',
    });

    expect(notification.type).toBe('ai_generation_started');
    expect(notification.isRead).toBe(false);
  });

  it('should get paginated notifications', async () => {
    const user = await createUser();
    for (let i = 0; i < 5; i++) {
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'trip_updated',
        title: 'Trip Updated',
        message: `Trip update ${i}`,
        relatedEntityType: 'trip',
      });
    }

    const result = await notificationService.getMyNotifications(user._id.toString(), {
      page: 1,
      limit: 3,
    });
    expect(result.notifications).toHaveLength(3);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('should filter by isRead', async () => {
    const user = await createUser();
    await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'ai_generation_completed',
      title: 'Done',
      message: 'Generation completed',
      relatedEntityType: 'trip',
    });

    const all = await notificationService.getMyNotifications(user._id.toString(), {});
    expect(all.notifications).toHaveLength(1);

    const unread = await notificationService.getMyNotifications(user._id.toString(), { isRead: 'false' });
    expect(unread.notifications).toHaveLength(1);

    const read = await notificationService.getMyNotifications(user._id.toString(), { isRead: 'true' });
    expect(read.notifications).toHaveLength(0);
  });

  it('should filter by type including all supported types', async () => {
    const user = await createUser();
    await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'payment_completed',
      title: 'Payment',
      message: 'Payment received',
      relatedEntityType: 'system',
    });
    await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'payment_completed',
      title: 'Sub',
      message: 'Payment confirmed',
      relatedEntityType: 'system',
    });

    const payments = await notificationService.getMyNotifications(user._id.toString(), { type: 'payment_completed' });
    expect(payments.notifications).toHaveLength(1);
  });

  it('should mark as read', async () => {
    const user = await createUser();
    const notif = await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'ai_generation_started',
      title: 'Test',
      message: 'Test',
      relatedEntityType: 'trip',
    });

    const updated = await notificationService.markAsRead(notif._id.toString(), user._id.toString());
    expect(updated.isRead).toBe(true);
  });

  it('should return 404 for non-existent notification', async () => {
    const user = await createUser();
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      notificationService.markAsRead(fakeId, user._id.toString())
    ).rejects.toThrow('Notification not found');
  });

  it('should return 400 for invalid ID', async () => {
    const user = await createUser();
    await expect(
      notificationService.markAsRead('invalid', user._id.toString())
    ).rejects.toThrow('Invalid notification ID');
  });

  it('should return 403 for wrong user', async () => {
    const user1 = await createUser('user1@test.com');
    const user2 = await createUser('user2@test.com');
    const notif = await notificationService.createNotification({
      userId: user1._id.toString(),
      type: 'trip_updated',
      title: 'Test',
      message: 'Test',
      relatedEntityType: 'trip',
    });

    await expect(
      notificationService.markAsRead(notif._id.toString(), user2._id.toString())
    ).rejects.toThrow('Access denied');
  });

  it('should clear read notifications', async () => {
    const user = await createUser();
    const notif = await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'trip_updated',
      title: 'Test',
      message: 'Test',
      relatedEntityType: 'trip',
    });
    await notificationService.markAsRead(notif._id.toString(), user._id.toString());

    const result = await notificationService.clearReadNotifications(user._id.toString());
    expect(result.deletedCount).toBe(1);

    const remaining = await notificationService.getMyNotifications(user._id.toString(), {});
    expect(remaining.notifications).toHaveLength(0);
  });

  it('should get unread count', async () => {
    const user = await createUser();
    await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'ai_generation_started',
      title: 'Test 1',
      message: 'Test',
      relatedEntityType: 'trip',
    });
    await notificationService.createNotification({
      userId: user._id.toString(),
      type: 'ai_generation_completed',
      title: 'Test 2',
      message: 'Test',
      relatedEntityType: 'trip',
    });

    const count = await notificationService.getUnreadCount(user._id.toString());
    expect(count).toBe(2);
  });
});
