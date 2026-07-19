import mongoose, { Schema, Document } from 'mongoose';

export interface IToolCall {
  toolName: string;
  result: Record<string, unknown>;
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: IToolCall[];
  createdAt: Date;
}

const toolCallSchema = new Schema<IToolCall>(
  {
    toolName: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'tool'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    toolCalls: {
      type: [toolCallSchema],
      default: [],
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
