import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { ApiError } from "../utils/ApiError";
import { config } from "../config";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Invalid request parameters",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(config.NODE_ENV === "development" && {
        stack: err.stack,
      }),
    });
    return;
  }

  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(config.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};