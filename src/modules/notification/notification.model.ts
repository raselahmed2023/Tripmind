import mongoose, { Schema } from 'mongoose';
import { INotification } from './notification.interface';

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'ai_generation_started',
        'ai_generation_completed',
        'ai_generation_failed',
        'trip_updated',
        'trip_starting_soon',
        'budget_warning',
        'itinerary_finalized',
        'payment_completed',
        'payment_verification_failed',
      ],
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntityType: { type: String, required: true, enum: ['trip', 'itinerary', 'destination', 'system'] },
    relatedEntityId: { type: Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
