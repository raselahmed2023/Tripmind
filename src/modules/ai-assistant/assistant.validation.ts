import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const createConversationSchema = z.object({
  tripId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message is required').max(8000, 'Message too long'),
});

export const validateCreateConversation = (req: Request, res: Response, next: NextFunction): void => {
  const result = createConversationSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateSendMessage = (req: Request, res: Response, next: NextFunction): void => {
  const result = sendMessageSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
