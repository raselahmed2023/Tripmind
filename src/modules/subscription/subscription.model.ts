import mongoose, { Schema } from 'mongoose';
import { ISubscription } from './subscription.interface';

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    plan: {
      type: String,
      required: [true, 'Plan is required'],
      enum: ['free', 'pro_monthly'],
      default: 'free',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['active', 'past_due', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    aiCredits: {
      type: Number,
      required: true,
      default: 3,
      min: [0, 'AI credits cannot be negative'],
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
