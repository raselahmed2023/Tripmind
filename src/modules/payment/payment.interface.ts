import { Document, Types } from 'mongoose';

export type ProductType = 'subscription' | 'credit_pack';

export type PaymentPlan = 'pro_monthly' | 'ai_credits_10';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  productType: ProductType;
  plan: PaymentPlan;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCheckoutSessionInput {
  productType: ProductType;
}

export interface IPaymentQuery {
  page?: number;
  limit?: number;
}
