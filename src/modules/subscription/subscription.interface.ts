import { Document, Types } from 'mongoose';

export type SubscriptionPlan = 'free' | 'pro_monthly';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  aiCredits: number;
  createdAt: Date;
  updatedAt: Date;
}
