import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'ai_generation_started'
  | 'ai_generation_completed'
  | 'ai_generation_failed'
  | 'trip_updated'
  | 'trip_starting_soon'
  | 'budget_warning'
  | 'itinerary_finalized'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_activated'
  | 'subscription_cancelled'
  | 'ai_credits_added';

export type RelatedEntityType = 'trip' | 'itinerary' | 'destination' | 'system';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: Types.ObjectId | null;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationQuery {
  type?: string;
  isRead?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
