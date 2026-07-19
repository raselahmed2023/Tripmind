import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const tripPlanCheckoutSchema = z.object({
  tripId: z.string().min(1, 'Trip ID is required'),
});

const tripPlanVerifySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const validateTripPlanCheckout = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = tripPlanCheckoutSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateTripPlanVerify = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = tripPlanVerifySchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
