/**
 * Webhook Middleware
 * Request validation, authentication, logging, and rate limiting for webhooks
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Raw body parser middleware for webhook signature verification
 */
export function rawBodyParser(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.path.startsWith('/webhooks/')) {
    // Store raw body for signature verification
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', (): void => {
      (req as any).rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch (error) {
        console.error('[WebhookMiddleware] Invalid JSON in webhook request:', error);
        res.status(400).json({
          success: false,
          error: 'Invalid JSON payload'
        });
        return;
      }
      next();
    });
  } else {
    next();
  }
}

/**
 * Webhook request logging middleware
 */
export function webhookLogger(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const start = Date.now();
  const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log incoming webhook request
  console.log(`[WebhookMiddleware] ${webhookId} - Incoming ${req.method} ${req.path} from ${req.ip}`);
  console.log(`[WebhookMiddleware] ${webhookId} - Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[WebhookMiddleware] ${webhookId} - Query:`, JSON.stringify(req.query, null, 2));
  
  // Store webhook ID for correlation
  (req as any).webhookId = webhookId;
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[WebhookMiddleware] ${webhookId} - Response ${res.statusCode} - ${duration}ms`);
    
    // Log full payload on errors
    if (res.statusCode >= 400) {
      console.error(`[WebhookMiddleware] ${webhookId} - Error response - Full payload:`, JSON.stringify(req.body, null, 2));
    }
  });
  
  next();
}

/**
 * Webhook authentication middleware
 */
export function webhookAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const webhookId = (req as any).webhookId || 'unknown';
  
  try {
    // Basic request validation
         if (!req.body) {
       console.warn(`[WebhookMiddleware] ${webhookId} - Missing request body`);
       res.status(400).json({
         success: false,
         error: 'Missing request body'
       });
       return;
     }

     // Content-Type validation
     const contentType = req.headers['content-type'];
     if (!contentType || !contentType.includes('application/json')) {
       console.warn(`[WebhookMiddleware] ${webhookId} - Invalid content type: ${contentType}`);
       res.status(400).json({
         success: false,
         error: 'Content-Type must be application/json'
       });
       return;
     }

    // Provider-specific authentication is handled in individual handlers
    next();
    
  } catch (error) {
    console.error(`[WebhookMiddleware] ${webhookId} - Authentication error:`, error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Rate limiting for webhook endpoints
 */
export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many webhook requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.endsWith('/health');
  },
  keyGenerator: (req) => {
    // Use IP address for rate limiting
    return req.ip || 'unknown';
  }
});

/**
 * Error handling middleware for webhooks
 */
export function webhookErrorHandler(
  error: any, 
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
): void {
  const webhookId = (req as any).webhookId || 'unknown';
  
  console.error(`[WebhookMiddleware] ${webhookId} - Unhandled error:`, error);
  console.error(`[WebhookMiddleware] ${webhookId} - Stack trace:`, error.stack);
  console.error(`[WebhookMiddleware] ${webhookId} - Request details:`, {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error processing webhook',
      webhookId
    });
  }
}

/**
 * Webhook monitoring middleware
 */
export function webhookMonitoring(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const webhookId = (req as any).webhookId || 'unknown';
  
  // Track webhook metrics (could be enhanced with actual metrics collection)
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Log webhook processing metrics
    console.log(`[WebhookMetrics] ${webhookId} - Provider: ${req.path.split('/')[2]}, Success: ${success}, Duration: ${duration}ms, Status: ${res.statusCode}`);
    
    // Could integrate with monitoring services here
    // e.g., send metrics to DataDog, Prometheus, etc.
  });
  
  next();
} 