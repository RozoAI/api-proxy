/**
 * Express Server Implementation
 * Main server with API endpoints, middleware, and error handling
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'body-parser';
import { PaymentRouter } from './routing/router';
import { ProviderRegistry } from './providers/registry';
import { DaimoProvider, AquaProvider } from './providers';
import { getProviderConfig } from './config/providers';
import { RequestResponseTransformer } from './utils/transformation';
import { PaymentService } from './services/payment-service';
import { checkDatabaseHealth } from './database/connection';
import { WebhookRouter } from './webhooks/router';
import { 
  webhookLogger, 
  webhookAuth, 
  webhookRateLimit, 
  webhookErrorHandler, 
  webhookMonitoring 
} from './middleware/webhook-middleware';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Initialize provider registry and router
const registry = new ProviderRegistry();

// Register providers
try {
  // Register Daimo provider
  const daimoConfig = getProviderConfig('daimo');
  if (daimoConfig) {
    const daimoProvider = new DaimoProvider(daimoConfig);
    registry.registerProvider(daimoProvider);
    console.log('[Server] Daimo provider registered successfully');
  }

  // Register Aqua provider
  const aquaConfig = getProviderConfig('aqua');
  if (aquaConfig) {
    const aquaProvider = new AquaProvider(aquaConfig);
    registry.registerProvider(aquaProvider);
    console.log('[Server] Aqua provider registered successfully');
  }
} catch (error) {
  console.error('[Server] Error registering providers:', error);
}

const router = new PaymentRouter(registry);
const paymentService = new PaymentService(router, registry);
const webhookRouter = new WebhookRouter(paymentService);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const stats = router.getRoutingStats();
    const dbHealthy = await checkDatabaseHealth();
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
      providers: stats.providers,
      routing: {
        totalChains: stats.totalChains,
        defaultProvider: stats.defaultProvider
      }
    };

    res.status(dbHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    console.error('[Health] Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Create payment endpoint
app.post('/api/payment', async (req, res) => {
  try {
    console.log('[API] Creating payment:', req.body);
    
    const response = await paymentService.createPayment(req.body);
    
    res.status(201).json(response);
  } catch (error) {
    console.error('[API] Error creating payment:', error);
    
    const errorResponse = RequestResponseTransformer.createErrorResponse(
      error, 
      'payment_service'
    );
    
    res.status(400).json(errorResponse);
  }
});

// Get payment by ID endpoint
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { chainId } = req.query;
    
    console.log(`[API] Getting payment: ${paymentId}, chainId: ${chainId}`);
    
    const chainIdNum = chainId ? parseInt(chainId as string) : undefined;
    const response = await paymentService.getPaymentById(paymentId, chainIdNum);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[API] Error getting payment:', error);
    
    const errorResponse = RequestResponseTransformer.createErrorResponse(
      error, 
      'payment_service'
    );
    
    res.status(404).json(errorResponse);
  }
});

// Get payment by external ID endpoint
app.get('/api/payment/external-id/:externalId', async (req, res) => {
  try {
    const { externalId } = req.params;
    const { chainId } = req.query;
    
    console.log(`[API] Getting payment by external ID: ${externalId}, chainId: ${chainId}`);
    
    const chainIdNum = chainId ? parseInt(chainId as string) : undefined;
    const response = await paymentService.getPaymentByExternalId(externalId, chainIdNum);

    res.status(200).json(response);
  } catch (error) {
    console.error('[API] Error getting payment by external ID:', error);
    
    const errorResponse = RequestResponseTransformer.createErrorResponse(
      error, 
      'payment_service'
    );
    
    res.status(404).json(errorResponse);
  }
});

// Provider status endpoint
app.get('/api/providers/status', async (req, res) => {
  try {
    const providers = registry.getAllProviders();
    const statusPromises = providers.map(async (provider) => {
      const isHealthy = await provider.isHealthy();
      return {
        name: provider.name,
        healthy: isHealthy,
        supportedChains: provider.supportedChains
      };
    });

    const statuses = await Promise.all(statusPromises);
    
    res.status(200).json({
      providers: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Error getting provider status:', error);
    res.status(500).json({
      error: 'Failed to get provider status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routing statistics endpoint
app.get('/api/routing/stats', (req, res) => {
  try {
    const stats = router.getRoutingStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('[API] Error getting routing stats:', error);
    res.status(500).json({
      error: 'Failed to get routing statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook endpoints with middleware
app.use('/webhooks', 
  webhookRateLimit,
  webhookLogger,
  webhookAuth,
  webhookMonitoring,
  webhookRouter.getRouter(),
  webhookErrorHandler
);

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', error);
  
  const errorResponse = RequestResponseTransformer.createErrorResponse(
    error, 
    'server'
  );
  
  res.status(500).json(errorResponse);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  process.exit(0);
}); 

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Server] Payment API proxy server running on port ${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
    console.log(`[Server] API documentation available at http://localhost:${PORT}/api`);
  });
}

export default app; 