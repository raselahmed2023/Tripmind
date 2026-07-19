import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const createCheckoutSessionSchema = z.object({
  productType: z.enum(['subscription', 'credit_pack'], {
    message: 'Product type must be either subscription or credit_pack',
  }),
});

export const validateCreateCheckoutSession = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = createCheckoutSessionSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
