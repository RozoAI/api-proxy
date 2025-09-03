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

// Preview order endpoint
app.get('/previewOrder', (req: Request, res: Response): void => {
  try {
    // Extract and parse the input parameter
    const inputParam = req.query.input as string;
    let toUnits = "1"; // default value
    
    if (inputParam) {
      try {
        const decodedInput = decodeURIComponent(inputParam);
        const parsedInput = JSON.parse(decodedInput);
        
        // Extract toUnits from the input structure
        if (parsedInput["0"] && parsedInput["0"].toUnits) {
          toUnits = parsedInput["0"].toUnits; //
        }
      } catch (parseError) {
        console.error('Error parsing input parameter:', parseError);
      }
    }
    const ret = [{"result":{"data":{"orgId":"organization-live-099b8b4a-a4b3-42aa-b315-5bf402ed7e01","mode":"sale","id":"31028208401538883782877931545831136196600609864077037426503372703379424046335","destFinalCallTokenAmount":{"token":{"chainId":8453,"token":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","symbol":"USDC","usd":1,"priceFromUsd":1,"decimals":6,"displayDecimals":2,"logoSourceURI":"https://pay.daimo.com/coin-logos/usdc.png","logoURI":"https://pay.daimo.com/coin-logos/usdc.png","maxAcceptUsd":100000,"maxSendUsd":0},"amount":"1000000","usd":1},"destFinalCall":{"to":"0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897","value":"0","data":"0x"},"nonce":"31028208401538883782877931545831136196600609864077037426503372703379424046335","redirectUri":null,"createdAt":null,"lastUpdatedAt":null,"intentStatus":"payment_unpaid","metadata":{"intent":"Pay","items":[],"payer":{}},"externalId":null,"userMetadata":null,"refundAddr":null}}}];

    ret[0].result.data.destFinalCallTokenAmount.usd = parseFloat(toUnits);
    ret[0].result.data.destFinalCallTokenAmount.amount = (parseInt((parseFloat(toUnits) * 1000000).toString())).toString();
    res.json(ret);
  } catch (error) {
    console.error('Error in previewOrder endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock nav endpoint
app.post('/nav', (req: Request, res: Response): void => {
  res.json([{"result":{}}]);
});

// Mock untronHasAvailableReceivers endpoint
app.get('/untronHasAvailableReceivers', (req: Request, res: Response): void => {
  res.json([{"result":{"data":false}}]);
});

// Mock nav,nav endpoint (comma-separated actions)
app.post('/nav,nav', (req: Request, res: Response): void => {
  res.json([{"result":{}},{"result":{}}]);
});

// Mock getExternalPaymentOptions,getDepositAddressOptions endpoint
app.get('/getExternalPaymentOptions,getDepositAddressOptions', (req: Request, res: Response): void => {
  res.json([
    {
      "result": {
        "data": [
        ]
      }
    },
    {
      "result": {
        "data": [
          {
            "id": "USDT on Tron",
            "logoURI": "https://pay.daimo.com/chain-logos/tronusdt.svg",
            "minimumUsd": 1
          },
          {
            "id": "Arbitrum",
            "logoURI": "https://pay.daimo.com/chain-logos/arbitrum.svg",
            "minimumUsd": 0
          },
          {
            "id": "Base",
            "logoURI": "https://pay.daimo.com/chain-logos/base.svg",
            "minimumUsd": 0
          },
          {
            "id": "Optimism",
            "logoURI": "https://pay.daimo.com/chain-logos/optimism.svg",
            "minimumUsd": 0
          },
          {
            "id": "Polygon",
            "logoURI": "https://pay.daimo.com/chain-logos/polygon.svg",
            "minimumUsd": 0
          },
          {
            "id": "Ethereum",
            "logoURI": "https://pay.daimo.com/chain-logos/ethereum.svg",
            "minimumUsd": 10
          }
        ]
      }
    }
  ]);
});

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