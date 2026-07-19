import mongoose, { Schema } from 'mongoose';
import { ITrip } from './trip.interface';

const tripSchema = new Schema<ITrip>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    travelers: {
      type: Number,
      required: [true, 'Number of travelers is required'],
      min: [1, 'Travelers must be at least 1'],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      maxlength: [3, 'Currency code cannot exceed 3 characters'],
    },
    travelStyle: {
      type: String,
      enum: ['budget', 'mid-range', 'luxury'],
      required: [true, 'Travel style is required'],
    },
    interests: {
      type: [String],
      default: [],
    },
    accommodationPreference: {
      type: String,
      default: '',
    },
    transportPreference: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'planned', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: [0, 'Estimated cost cannot be negative'],
    },
    notes: {
      type: String,
      default: '',
    },
    itineraryId: {
      type: Schema.Types.ObjectId,
      ref: 'Itinerary',
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    isPlanPurchased: {
      type: Boolean,
      default: false,
    },
    purchasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const Trip = mongoose.model<ITrip>('Trip', tripSchema);
