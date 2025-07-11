/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { RequestResponseTransformer } from '../utils/transformation';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  responseData?: any;
  code?: number;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public responseData?: any;

  constructor(message: string, statusCode: number = 500, responseData?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.responseData = responseData;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Log the error
  console.error(`[ErrorHandler] ${req.method} ${req.path} - ${statusCode}: ${message}`);
  console.error(`[ErrorHandler] Stack trace:`, error.stack);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Create standardized error response
  const errorResponse = RequestResponseTransformer.createErrorResponse(error, 'api');

  // Add request context
  errorResponse.details.request = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(`Route ${req.method} ${req.path} not found`, 404);
  
  const errorResponse = RequestResponseTransformer.createErrorResponse(error, 'api');
  errorResponse.details.request = {
    method: req.method,
    path: req.path,
    ip: req.ip
  };

  res.status(404).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 