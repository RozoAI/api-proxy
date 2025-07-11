/**
 * API-related types for Express integration
 */

import { Request, Response } from 'express';
import { PaymentRequest } from './payment.js';

export interface ApiRequest extends Request {
  paymentData?: PaymentRequest;
  selectedProvider?: string;
  chainId?: number;
}

export interface ApiResponse extends Response {
  // Extend if needed for custom response methods
}

export interface RouteHandler {
  (req: ApiRequest, res: ApiResponse): Promise<void>;
}

export interface Middleware {
  (req: ApiRequest, res: ApiResponse, next: (...args: unknown[]) => unknown): Promise<void> | void;
}

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
}

export interface LoggingContext {
  requestId: string;
  method: string;
  url: string;
  chainId?: number;
  provider?: string;
  timestamp: Date;
}

export interface RequestLog {
  context: LoggingContext;
  request: {
    body: any;
    headers: Record<string, string>;
    query: Record<string, string>;
  };
  response: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };
  provider: string;
  responseTime: number;
  error?: string;
}
