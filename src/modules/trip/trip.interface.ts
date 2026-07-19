import { Document, Types } from 'mongoose';

export interface ITrip extends Document {
  userId: Types.ObjectId;
  destinationId: Types.ObjectId;
  title: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  budget: number;
  currency: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
  accommodationPreference: string;
  transportPreference: string;
  status: 'draft' | 'planned' | 'ongoing' | 'completed' | 'cancelled';
  estimatedCost: number;
  notes: string;
  itineraryId: Types.ObjectId | null;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  isPlanPurchased: boolean;
  purchasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripQuery {
  status?: string;
  travelStyle?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export type ITripCreateInput = Omit<ITrip, 'userId' | 'estimatedCost' | 'itineraryId' | 'paymentStatus' | 'isPlanPurchased' | 'purchasedAt' | 'createdAt' | 'updatedAt'>;
