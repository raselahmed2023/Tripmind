import { Response } from 'express';

export interface ApiResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedData<T = unknown> extends ApiResponseData<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiResponse {
  static success<T>(res: Response, message: string, data?: T, statusCode = 200): void {
    const response: ApiResponseData<T> = {
      success: true,
      message,
    };
    if (data !== undefined) {
      response.data = data;
    }
    res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    message: string,
    data: T,
    page: number,
    limit: number,
    total: number,
    statusCode = 200,
  ): void {
    const response: PaginatedData<T> = {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 500): void {
    const response: ApiResponseData = {
      success: false,
      message,
    };
    res.status(statusCode).json(response);
  }
}
