import { z } from 'zod';

export const tripPlannerRequestSchema = z.object({
  destinationId: z.string().min(1, 'Destination ID is required'),
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO date' }),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO date' }),
  travelers: z.number().int().min(1, 'Travelers must be at least 1'),
  budget: z.number().min(0, 'Budget cannot be negative'),
  currency: z.string().min(1, 'Currency is required').max(3),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']),
  interests: z.array(z.string()).optional().default([]),
  accommodationPreference: z.string().optional().default(''),
  transportPreference: z.string().optional().default(''),
  dietaryRequirements: z.string().optional().default(''),
  accessibilityRequirements: z.string().optional().default(''),
  additionalNotes: z.string().optional().default(''),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

export type TripPlannerRequest = z.infer<typeof tripPlannerRequestSchema>;
