import mongoose, { Schema, Document } from 'mongoose';

export interface IExchangeCode extends Document {
  userId: mongoose.Types.ObjectId;
  codeHash: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const exchangeCodeSchema = new Schema<IExchangeCode>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      unique: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true },
);

export const ExchangeCode = mongoose.model<IExchangeCode>('ExchangeCode', exchangeCodeSchema);
