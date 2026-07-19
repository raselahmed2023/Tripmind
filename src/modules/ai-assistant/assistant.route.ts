import { Router } from 'express';
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

router.post('/conversations', validateCreateConversation, asyncHandler(createConversation));
router.get('/conversations', asyncHandler(getConversations));
router.get('/conversations/:conversationId', asyncHandler(getConversation));
router.delete('/conversations/:conversationId', asyncHandler(deleteConversation));
router.get('/conversations/:conversationId/messages', asyncHandler(getMessages));
router.post('/conversations/:conversationId/messages', validateSendMessage, asyncHandler(sendMessage));

export default router;
