import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as assistantService from './assistant.service';

export const createConversation = async (req: Request, res: Response) => {
  const conversation = await assistantService.createConversation(
    req.user!.userId,
    req.body.tripId,
    req.body.title,
  );
  ApiResponse.success(res, 'Conversation created', conversation, 201);
};

export const getConversations = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await assistantService.getConversations(req.user!.userId, page, limit);

  ApiResponse.paginated(
    res,
    'Conversations fetched',
    result.conversations,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const getConversation = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const conversation = await assistantService.getConversation(
    conversationId,
    req.user!.userId,
  );
  ApiResponse.success(res, 'Conversation fetched', conversation);
};

export const deleteConversation = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  await assistantService.deleteConversation(
    conversationId,
    req.user!.userId,
  );
  ApiResponse.success(res, 'Conversation deleted');
};

export const getMessages = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await assistantService.getMessages(
    conversationId,
    req.user!.userId,
    page,
    limit,
  );

  ApiResponse.paginated(
    res,
    'Messages fetched',
    result.messages,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
  );
};

export const sendMessage = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const result = await assistantService.sendMessage(
    conversationId,
    req.user!.userId,
    req.body.content,
  );
  ApiResponse.success(res, 'Message sent', result, 201);
};
