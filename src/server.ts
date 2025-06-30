import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - check for env.dev first if in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.join(__dirname, '..', 'env.dev') });
} else {
  dotenv.config();
}

interface ProxyConfig {
  port: number;
  backendUrl: string;
  logRequests: boolean;
  logResponses: boolean;
  nodeEnv: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  backendUrl: string;
  nodeEnv: string;
  port: number;
}

interface ErrorResponse {
  error: string;
  message: string;
  backendUrl?: string;
}

const app = express();

// Configuration with type safety
const config: ProxyConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8080',
  logRequests: process.env.LOG_REQUESTS === 'true',
  logResponses: process.env.LOG_RESPONSES === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Custom logging middleware - only use morgan in development
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Custom request/response logging middleware
const logRequestResponse = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  
  // Log request
  if (config.logRequests) {
    console.log('\n=== INCOMING REQUEST ===');
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.originalUrl}`);
    console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`Request Body:`, JSON.stringify(req.body, null, 2));
    }
    console.log('========================\n');
  }

  // Intercept response to log it
  res.send = function(data: any) {
    if (config.logResponses) {
      console.log('\n=== OUTGOING RESPONSE ===');
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response Body:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      console.log('=========================\n');
    }
    return originalSend.call(this, data);
  };

  next();
};

app.use(logRequestResponse);

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  const healthResponse: HealthResponse = { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    backendUrl: config.backendUrl,
    nodeEnv: config.nodeEnv,
    port: config.port
  };
  res.json(healthResponse);
});

// Development-only endpoint to show configuration
if (config.nodeEnv === 'development') {
  app.get('/config', (req: Request, res: Response): void => {
    res.json({
      config: {
        ...config,
        // Don't expose sensitive info in production
        timestamp: new Date().toISOString()
      }
    });
  });
}

// Forward all requests to backend
app.all('*', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUrl = `${config.backendUrl}${req.originalUrl}`;
    
    console.log(`\n🔄 Forwarding ${req.method} request to: ${targetUrl}`);

    const axiosConfig: AxiosRequestConfig = {
      method: req.method as any,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined, // Remove original host header
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.get('host'),
      },
      timeout: 30000, // 30 seconds timeout
    };

    // Add request body for methods that support it
    if (['post', 'put', 'patch'].includes(req.method.toLowerCase()) && req.body) {
      axiosConfig.data = req.body;
    }

    // Add query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      axiosConfig.params = req.query;
    }

    const response: AxiosResponse = await axios(axiosConfig);
    
    // Forward response headers (excluding some that shouldn't be forwarded)
    const excludeHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];
    Object.keys(response.headers).forEach(key => {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        res.set(key, response.headers[key]);
      }
    });

    res.status(response.status).send(response.data);
    
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('\n❌ Error forwarding request:', axiosError.message);
    
    if (axiosError.response) {
      // Backend responded with an error
      console.error(`Backend error status: ${axiosError.response.status}`);
      if (config.logResponses) {
        console.error(`Backend error body:`, JSON.stringify(axiosError.response.data, null, 2));
      }
      
      res.status(axiosError.response.status).json(axiosError.response.data);
    } else if (axiosError.request) {
      // Request was made but no response received
      console.error('No response received from backend');
      const errorResponse: ErrorResponse = {
        error: 'Backend unavailable',
        message: 'No response received from backend server',
        backendUrl: config.backendUrl
      };
      res.status(502).json(errorResponse);
    } else {
      // Something else happened
      console.error('Request setup error:', axiosError.message);
      const errorResponse: ErrorResponse = {
        error: 'Internal server error',
        message: axiosError.message
      };
      res.status(500).json(errorResponse);
    }
  }
});

// Start server
app.listen(config.port, (): void => {
  console.log(`\n🚀 API Proxy server running on port ${config.port}`);
  console.log(`🎯 Forwarding requests to: ${config.backendUrl}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📊 Request logging: ${config.logRequests ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📊 Response logging: ${config.logResponses ? 'ENABLED' : 'DISABLED'}`);
  console.log(`\n🔍 Health check available at: http://localhost:${config.port}/health`);
  if (config.nodeEnv === 'development') {
    console.log(`⚙️  Config endpoint available at: http://localhost:${config.port}/config`);
  }
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', (): void => {
  console.log('\n👋 Shutting down API proxy server...');
  process.exit(0);
});

process.on('SIGTERM', (): void => {
  console.log('\n👋 Shutting down API proxy server...');
  process.exit(0);
}); 