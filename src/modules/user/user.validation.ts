import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
