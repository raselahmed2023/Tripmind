import { z } from 'zod';

export const notificationQuerySchema = z.object({
  type: z.enum([
    'ai_generation_started',
    'ai_generation_completed',
    'ai_generation_failed',
    'trip_updated',
    'trip_starting_soon',
    'budget_warning',
    'itinerary_finalized',
    'payment_completed',
    'payment_failed',
    'subscription_activated',
    'subscription_cancelled',
    'ai_credits_added',
  ]).optional(),
  isRead: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
