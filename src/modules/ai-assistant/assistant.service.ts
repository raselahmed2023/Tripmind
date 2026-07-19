import { Types } from 'mongoose';
import { Conversation } from './conversation.model';
import { Message } from './message.model';
import { Trip } from '../trip/trip.model';
import { ApiError } from '../../utils/ApiError';
import { TOOL_DEFINITIONS, executeTool, ToolResult } from './assistant-tools';
import { safeNotify } from '../notification/notification.service';
import { generateWithFallback, AIInput } from '../../services/ai-provider.service';

const MAX_HISTORY_MESSAGES = 20;
const MAX_PROMPT_LENGTH = 8000;
const MAX_RESPONSE_LENGTH = 4000;

const SYSTEM_PROMPT = `You are TripMind AI Assistant, a helpful travel planning assistant. You help users plan trips, understand their itineraries, manage budgets, and make adjustments.

You have access to tools that can look up the user's trip data, itinerary, and budget. Use them when the user asks about their specific trip.

IMPORTANT RULES:
- Only use tools when the user asks about their specific trip data
- Do not modify the itinerary directly - only suggest changes
- Be helpful, concise, and practical
- If you don't have enough information, ask clarifying questions
- Always consider the user's budget and preferences
- Provide actionable suggestions`;

export const createConversation = async (
  userId: string,
  tripId?: string,
  title?: string,
) => {
  if (tripId) {
    if (!Types.ObjectId.isValid(tripId)) {
      throw ApiError.badRequest('Invalid trip ID');
    }
    const trip = await Trip.findById(tripId);
    if (!trip) throw ApiError.notFound('Trip not found');
    if (trip.userId.toString() !== userId) {
      throw ApiError.forbidden('You can only create conversations for your own trips');
    }
  }

  return Conversation.create({
    userId: new Types.ObjectId(userId),
    tripId: tripId ? new Types.ObjectId(tripId) : null,
    title: title || 'New Conversation',
    status: 'active',
  });
};

export const getConversations = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const filter = { userId: new Types.ObjectId(userId), status: 'active' };
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Conversation.countDocuments(filter),
  ]);

  return {
    conversations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getConversation = async (
  conversationId: string,
  userId: string,
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw ApiError.badRequest('Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  if (conversation.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  return conversation;
};

export const deleteConversation = async (
  conversationId: string,
  userId: string,
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw ApiError.badRequest('Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  if (conversation.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  await Message.deleteMany({ conversationId });
  await Conversation.findByIdAndDelete(conversationId);
};

export const getMessages = async (
  conversationId: string,
  userId: string,
  page = 1,
  limit = 50,
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw ApiError.badRequest('Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  if (conversation.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  const filter = { conversationId: new Types.ObjectId(conversationId) };
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);

  return {
    messages,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const detectToolCalls = (text: string): Array<{ toolName: string; args: Record<string, string> }> => {
  const toolCalls: Array<{ toolName: string; args: Record<string, string> }> = [];
  const lowerText = text.toLowerCase();

  for (const tool of TOOL_DEFINITIONS) {
    if (lowerText.includes(tool.name.replace(/_/g, ' ')) || lowerText.includes(tool.name)) {
      toolCalls.push({ toolName: tool.name, args: {} });
    }
  }

  return toolCalls;
};

export const sendMessage = async (
  conversationId: string,
  userId: string,
  content: string,
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw ApiError.badRequest('Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  if (conversation.userId.toString() !== userId) {
    throw ApiError.forbidden('Access denied');
  }

  // Sanitize input
  const sanitizedContent = content.replace(/[<>{}]/g, '').trim().slice(0, MAX_PROMPT_LENGTH);
  if (!sanitizedContent) {
    throw ApiError.badRequest('Message cannot be empty');
  }

  // Save user message
  await Message.create({
    conversationId: new Types.ObjectId(conversationId),
    role: 'user',
    content: sanitizedContent,
  });

  // Load recent history
  const historyMessages = await Message.find({
    conversationId: new Types.ObjectId(conversationId),
  })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY_MESSAGES);

  // Build context
  let contextBlock = '';
  if (conversation.tripId) {
    try {
      const tripContext = await executeTool('get_trip_context', {}, conversation.tripId.toString(), userId);
      const itineraryResult = await executeTool('get_itinerary', {}, conversation.tripId.toString(), userId);
      contextBlock = '\n\nTRIP CONTEXT:\n' + JSON.stringify(tripContext.result, null, 2);
      contextBlock += '\n\nITINERARY:\n' + JSON.stringify(itineraryResult.result, null, 2);
    } catch {
      // Tools may fail if trip data is incomplete - continue without context
    }
  }

  // Detect if tools should be invoked
  const detectedTools = detectToolCalls(sanitizedContent);
  const toolResults: ToolResult[] = [];

  for (const toolCall of detectedTools.slice(0, 3)) {
    try {
      if (conversation.tripId) {
        const result = await executeTool(toolCall.toolName, toolCall.args, conversation.tripId.toString(), userId);
        toolResults.push(result);
      }
    } catch {
      // Tool execution failed - continue without it
    }
  }

  // Build the prompt
  let prompt = sanitizedContent;
  if (contextBlock) {
    prompt += contextBlock;
  }
  if (toolResults.length > 0) {
    prompt += '\n\nTOOL RESULTS:\n' + JSON.stringify(toolResults.map(t => ({
      tool: t.toolName,
      data: t.result,
    })), null, 2);
  }

  // Save tool results as tool messages
  for (const toolResult of toolResults) {
    await Message.create({
      conversationId: new Types.ObjectId(conversationId),
      role: 'tool',
      content: JSON.stringify(toolResult.result),
      toolCalls: [{ toolName: toolResult.toolName, result: toolResult.result }],
    });
  }

  // Call AI provider with fallback
  let responseText: string;
  try {
    const aiInput: AIInput = {
      prompt,
      systemInstruction: SYSTEM_PROMPT,
    };
    const aiResult = await generateWithFallback(aiInput);
    responseText = aiResult.text.slice(0, MAX_RESPONSE_LENGTH);
  } catch (err) {
    console.error('[AI Assistant] Provider error:', (err as Error).message);
    throw ApiError.internal('AI generation failed. Please try again.');
  }

  // Save assistant response
  const assistantMessage = await Message.create({
    conversationId: new Types.ObjectId(conversationId),
    role: 'assistant',
    content: responseText,
  });

  // Update conversation title if first message
  if (historyMessages.length <= 1 && conversation.title === 'New Conversation') {
    const titlePreview = sanitizedContent.slice(0, 80);
    await Conversation.findByIdAndUpdate(conversationId, { title: titlePreview });
  }

  // Update conversation timestamp
  await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

  // Notify if substantial response
  if (responseText.length > 200 && toolResults.length > 0) {
    safeNotify({
      userId,
      type: 'ai_generation_completed',
      title: 'AI Assistant Response',
      message: 'Your AI assistant has analyzed your trip and provided suggestions.',
      relatedEntityType: 'trip',
      relatedEntityId: conversation.tripId?.toString(),
      metadata: { conversationId },
    });
  }

  return {
    userMessage: {
      _id: (await Message.findOne({ conversationId, role: 'user' }).sort({ createdAt: -1 }))!._id,
      role: 'user' as const,
      content: sanitizedContent,
      createdAt: new Date(),
    },
    assistantMessage: {
      _id: assistantMessage._id,
      role: 'assistant' as const,
      content: responseText,
      toolCalls: toolResults.map(t => ({ toolName: t.toolName, result: t.result })),
      createdAt: assistantMessage.createdAt,
    },
  };
};
