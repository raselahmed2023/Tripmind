import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const activitySchema = z.object({
  title: z.string().min(1, 'Activity title is required'),
  description: z.string().min(1, 'Activity description is required'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM format'),
  estimatedCost: z.number().min(0, 'Cost cannot be negative'),
  category: z.string().min(1, 'Category is required'),
});

const dayPlanSchema = z.object({
  dayNumber: z.number().int().min(1, 'Day number must be at least 1'),
  title: z.string().min(1, 'Day title is required'),
  activities: z.array(activitySchema).default([]),
});

export const createItinerarySchema = z.object({
  tripId: z.string().min(1, 'Trip ID is required'),
  destinationId: z.string().min(1, 'Destination ID is required'),
  summary: z.string().min(1, 'Summary is required'),
  days: z.array(dayPlanSchema).min(1, 'At least one day is required'),
  costBreakdown: z.record(z.number()).optional().default({}),
  warnings: z.array(z.string()).optional().default([]),
  recommendations: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'finalized', 'archived']).optional().default('draft'),
});

export const updateItinerarySchema = z.object({
  summary: z.string().min(1).optional(),
  days: z.array(dayPlanSchema).min(1).optional(),
  costBreakdown: z.record(z.number()).optional(),
  warnings: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  status: z.enum(['draft', 'finalized', 'archived']).optional(),
});

export const itineraryQuerySchema = z.object({
  status: z.enum(['draft', 'finalized', 'archived']).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const validateCreateItinerary = (req: Request, res: Response, next: NextFunction): void => {
  const result = createItinerarySchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdateItinerary = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateItinerarySchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
