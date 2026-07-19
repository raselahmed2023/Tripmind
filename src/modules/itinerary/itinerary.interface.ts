import { Document, Types } from 'mongoose';

export interface IActivity {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  category: string;
  location: string;
  notes: string;
}

export interface IDayPlan {
  dayNumber: number;
  date: string;
  title: string;
  activities: IActivity[];
}

export interface IItinerary extends Document {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  destinationId: Types.ObjectId;
  summary: string;
  days: IDayPlan[];
  costBreakdown: Record<string, number>;
  warnings: string[];
  recommendations: string[];
  status: 'draft' | 'finalized' | 'archived';
  generatedAt: Date;
  aiModel: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IItineraryQuery {
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}