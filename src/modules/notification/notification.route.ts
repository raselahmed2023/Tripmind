import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from './notification.controller';
import { verifyToken } from '../../middleware/auth';
import { validateObjectId } from '../destination/destination.validation';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/unread-count', verifyToken, asyncHandler(getUnreadCount));
router.get('/', verifyToken, asyncHandler(getMyNotifications));
router.patch('/read-all', verifyToken, asyncHandler(markAllAsRead));
router.patch('/:id/read', verifyToken, validateObjectId('id'), asyncHandler(markAsRead));
router.delete('/clear-read', verifyToken, asyncHandler(clearReadNotifications));
router.delete('/:id', verifyToken, validateObjectId('id'), asyncHandler(deleteNotification));

export default router;
