/**
 * Logging Middleware
 * Request/response logging and monitoring
 */

import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  statusCode?: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const contentLength = req.headers['content-length'];
  const requestSize = contentLength ? parseInt(contentLength as string) : 0;

  // Log request
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    requestSize
  };

  console.log(`[Request] ${logEntry.method} ${logEntry.path} - ${logEntry.ip} - ${logEntry.userAgent || 'Unknown'}`);

  // Capture response details
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - start;
    const responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
    const statusCode = res.statusCode;

    // Log response
    const responseLog: LogEntry = {
      ...logEntry,
      statusCode,
      responseTime,
      responseSize
    };

    console.log(`[Response] ${responseLog.method} ${responseLog.path} - ${responseLog.statusCode} - ${responseLog.responseTime}ms - ${responseLog.responseSize} bytes`);

    // Log errors
    if (statusCode >= 400) {
      console.error(`[Error] ${responseLog.method} ${responseLog.path} - ${responseLog.statusCode} - ${responseLog.responseTime}ms`);
    }

    return originalSend.call(this, data);
  };

  next();
};

export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log slow requests
    if (duration > 1000) { // More than 1 second
      console.warn(`[Performance] Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }

    // Log very slow requests
    if (duration > 5000) { // More than 5 seconds
      console.error(`[Performance] Very slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
  });

  next();
};

export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log potential security issues
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /document\.cookie/i // Cookie theft attempts
  ];

  const requestString = `${req.method} ${req.path} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn(`[Security] Potential security issue detected: ${req.method} ${req.path} from ${req.ip}`);
      break;
    }
  }

  next();
}; 