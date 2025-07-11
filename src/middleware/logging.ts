/**
 * Logging Middleware
 * Request/response logging and monitoring
 */

import express from 'express';

export interface LogEntry {
  method: string;
  path: string;
  contentLength?: string;
  duration?: number;
  statusCode?: number;
}

export const performanceLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const start = process.hrtime.bigint();

  res.on('finish', (): void => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    console.log(`[Performance] ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
  });

  next();
};

export const securityLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  // Log potential security issues
  const suspiciousPatterns = ['/admin', '/config', '/settings', '/.env', '/backup'];
  const path = req.path.toLowerCase();

  if (suspiciousPatterns.some((pattern) => path.includes(pattern))) {
    console.warn(
      `[Security] Suspicious request detected: ${req.method} ${req.path} from ${req.ip}`
    );
  }

  next();
};

export const loggingMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const start = Date.now();
  const contentLength = req.headers['content-length'];

  // Log request details
  console.log(`[Request] ${req.method} ${req.path} - Content-Length: ${contentLength || 'N/A'}`);

  // Log response details on finish
  res.on('finish', (): void => {
    const duration = Date.now() - start;
    console.log(
      `[Response] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`
    );
  });

  next();
};
