import { Document, Types } from 'mongoose';

export type ProductType = 'trip_plan';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  tripId: Types.ObjectId;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  productType: ProductType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentQuery {
  page?: number;
  limit?: number;
}
