import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  getMessages,
  sendMessage,
} from './assistant.controller';
import { validateCreateConversation, validateSendMessage } from './assistant.validation';
import { verifyToken } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(verifyToken);

// Strict rate limiter for AI message generation
const assistantMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages, please wait before trying again' },
});

router.post('/conversations', validateCreateConversation, asyncHandler(createConversation));
router.get('/conversations', asyncHandler(getConversations));
router.get('/conversations/:conversationId', asyncHandler(getConversation));
router.delete('/conversations/:conversationId', asyncHandler(deleteConversation));
router.get('/conversations/:conversationId/messages', asyncHandler(getMessages));
router.post('/conversations/:conversationId/messages', assistantMessageLimiter, validateSendMessage, asyncHandler(sendMessage));

export default router;
