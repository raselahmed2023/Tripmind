import mongoose, { Schema } from 'mongoose';
import { IItinerary } from './itinerary.interface';

const activitySchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  estimatedCost: { type: Number, default: 0 },
  category: { type: String, required: true },
}, { _id: false });

const dayPlanSchema = new Schema({
  dayNumber: { type: Number, required: true },
  title: { type: String, required: true },
  activities: { type: [activitySchema], default: [] },
}, { _id: false });

const itinerarySchema = new Schema<IItinerary>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
    summary: { type: String, required: true },
    days: { type: [dayPlanSchema], required: true },
    costBreakdown: { type: Schema.Types.Mixed, default: {} },
    warnings: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'finalized', 'archived'], default: 'draft', index: true },
    generatedAt: { type: Date, default: Date.now },
    aiModel: { type: String, default: 'gemini' },
    tokenUsage: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

export const Itinerary = mongoose.model<IItinerary>('Itinerary', itinerarySchema);
