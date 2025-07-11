/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import express from 'express';
import { RequestResponseTransformer } from '../utils/transformation.js';

interface ApiError extends Error {
  statusCode?: number;
  code?: number;
}

interface ErrorResponseDetails {
  provider: string;
  timestamp: string;
  errorType: string;
  request?: {
    method: string;
    path: string;
    ip: string | undefined;
    userAgent: string | null;
  };
}

interface ErrorResponse {
  error: string;
  message: string;
  details: ErrorResponseDetails;
}

export function errorHandler(
  error: ApiError,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Log the error
  console.error(`[ErrorHandler] ${_req.method} ${_req.path} - ${statusCode}: ${message}`);
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
  const errorResponse = RequestResponseTransformer.createErrorResponse(
    error,
    'api'
  ) as ErrorResponse;

  // Add request context
  const requestDetails = {
    method: _req.method || 'UNKNOWN',
    path: _req.path || '/',
    ip: _req.ip,
    userAgent: _req.get('User-Agent') || null,
  };

  errorResponse.details.request = requestDetails;

  res.status(statusCode).json(errorResponse);
}

export const notFoundHandler = (req: express.Request, res: express.Response): void => {
  const error = new Error(`Route ${req.method} ${req.path} not found`) as ApiError;
  error.statusCode = 404;

  const errorResponse = RequestResponseTransformer.createErrorResponse(
    error,
    'api'
  ) as ErrorResponse;
  const requestDetails = {
    method: req.method || 'UNKNOWN',
    path: req.path || '/',
    ip: req.ip,
    userAgent: req.get('User-Agent') || null,
  };

  errorResponse.details.request = requestDetails;
  res.status(404).json(errorResponse);
};

export const asyncHandler = (fn: (...args: unknown[]) => unknown): express.RequestHandler => {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
