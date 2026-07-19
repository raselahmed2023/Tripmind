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
    stripeCheckoutSessionId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
    productType: {
      type: String,
      required: [true, 'Product type is required'],
      enum: ['subscription', 'credit_pack'],
    },
    plan: {
      type: String,
      required: [true, 'Plan is required'],
      enum: ['pro_monthly', 'ai_credits_10'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'usd',
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, productType: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
