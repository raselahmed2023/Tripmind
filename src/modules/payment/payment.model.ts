import mongoose, { Schema } from 'mongoose';
import { IPayment } from './payment.interface';

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    },
    stripeCheckoutSessionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    productType: {
      type: String,
      required: [true, 'Product type is required'],
      enum: ['trip_plan'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      lowercase: true,
      maxlength: 3,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, tripId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
