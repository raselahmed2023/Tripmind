import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const googleExchangeSchema = z.object({
  code: z.string().min(1, 'Exchange code is required'),
});

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateGoogleExchange = (req: Request, res: Response, next: NextFunction): void => {
  const result = googleExchangeSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
