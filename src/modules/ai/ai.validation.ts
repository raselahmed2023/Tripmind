import { z } from 'zod';

export const tripPlannerRequestSchema = z.object({
  dietaryPreferences: z.string().optional().default(''),
  accessibilityNeeds: z.string().optional().default(''),
  activityPreferences: z.array(z.string()).optional().default([]),
  additionalNotes: z.string().optional().default(''),
});

export type TripPlannerRequest = z.infer<typeof tripPlannerRequestSchema>;
