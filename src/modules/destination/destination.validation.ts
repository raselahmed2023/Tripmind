import { z } from 'zod';
import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';

export const createDestinationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  shortDescription: z.string().min(1, 'Short description is required').max(500, 'Short description cannot exceed 500 characters'),
  fullDescription: z.string().min(1, 'Full description is required'),
  images: z.array(z.string().url('Each image must be a valid URL')).optional().default([]),
  category: z.string().min(1, 'Category is required'),
  averageDailyCost: z.number().min(0, 'Average daily cost cannot be negative'),
  currency: z.string().min(1, 'Currency is required').max(3, 'Currency code cannot exceed 3 characters'),
  rating: z.number().min(0).max(5).optional().default(0),
  reviewCount: z.number().min(0).optional().default(0),
  bestSeason: z.string().min(1, 'Best season is required'),
  recommendedDays: z.number().min(1, 'Recommended days must be at least 1'),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  highlights: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published']).optional().default('draft'),
});

export const updateDestinationSchema = createDestinationSchema.partial();

export const destinationQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  bestSeason: z.string().optional(),
  minCost: z.coerce.number().min(0).optional(),
  maxCost: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['newest', 'highest_rating', 'lowest_cost', 'highest_cost']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const adminDestinationQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  country: z.string().optional(),
  bestSeason: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  minCost: z.coerce.number().min(0).optional(),
  maxCost: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['newest', 'highest_rating', 'lowest_cost', 'highest_cost']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const validateObjectId = (paramName: string) => (req: Request, _res: Response, next: NextFunction): void => {
  const value = req.params[paramName] as string;
  if (!value || !Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest('Invalid ' + paramName);
  }
  next();
};

export const validateCreateDestination = (req: Request, res: Response, next: NextFunction): void => {
  const result = createDestinationSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};

export const validateUpdateDestination = (req: Request, res: Response, next: NextFunction): void => {
  const result = updateDestinationSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }
  req.body = result.data;
  next();
};
