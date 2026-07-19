import { Document, Types } from 'mongoose';

export interface IDestination extends Document {
  title: string;
  slug: string;
  country: string;
  city: string;
  shortDescription: string;
  fullDescription: string;
  images: string[];
  category: string;
  averageDailyCost: number;
  currency: string;
  rating: number;
  reviewCount: number;
  bestSeason: string;
  recommendedDays: number;
  latitude: number;
  longitude: number;
  highlights: string[];
  status: 'draft' | 'published';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDestinationQuery {
  search?: string;
  category?: string;
  country?: string;
  bestSeason?: string;
  minCost?: number;
  maxCost?: number;
  minRating?: number;
  sort?: string;
  page?: number;
  limit?: number;
}
