import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export const notFound = (req: Request, _res: Response) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
};
