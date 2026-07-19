import { z } from 'zod';
import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';

const tripStatusEnum = z.enum(['draft', 'planned', 'ongoing', 'completed', 'cancelled']);

export const createTripSchema = z.object({
  destinationId: z.string().min(1, 'Destination ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO date' }),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO date' }),
  travelers: z.number().int().min(1, 'Travelers must be at least 1'),
  budget: z.number().min(0, 'Budget cannot be negative'),
  currency: z.string().min(1, 'Currency is required').max(3, 'Currency code cannot exceed 3 characters'),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']),
  interests: z.array(z.string()).optional().default([]),
  accommodationPreference: z.string().optional().default(''),
  transportPreference: z.string().optional().default(''),
  status: tripStatusEnum.optional().default('draft'),
  notes: z.string().optional().default(''),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

export const updateTripSchema = z.object({
  destinationId: z.string().min(1, 'Destination ID is required').optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO date' }).optional(),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO date' }).optional(),
  travelers: z.number().int().min(1, 'Travelers must be at least 1').optional(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  currency: z.string().min(1, 'Currency is required').max(3, 'Currency code cannot exceed 3 characters').optional(),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']).optional(),
  interests: z.array(z.string()).optional(),
  accommodationPreference: z.string().optional(),
  transportPreference: z.string().optional(),
  status: tripStatusEnum.optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] },
);

export const tripQuerySchema = z.object({
  status: tripStatusEnum.optional(),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']).optional(),
  sort: z.enum(['newest', 'oldest', 'start_date']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const PROTECTED_FIELDS = ['userId', 'estimatedCost', 'itineraryId', 'createdAt', 'updatedAt'];

export const validateCreateTrip = (req: Request, res: Response, next: NextFunction): void => {
  const result = createTripSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdateTrip = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateTripSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  const bodyKeys = Object.keys(req.body);
  const blocked = bodyKeys.filter((key) => PROTECTED_FIELDS.includes(key));
  if (blocked.length > 0) {
    throw ApiError.badRequest('Cannot update protected fields: ' + blocked.join(', '));
  }

  req.body = result.data;
  next();
};

export const validateObjectId = (paramName: string) => (req: Request, _res: Response, next: NextFunction): void => {

  const value = req.params[paramName] as string;
  if (!value || !Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest('Invalid ' + paramName);
  }
  next();
};