# Payment API Proxy

A TypeScript-based Express API proxy that routes payment requests to multiple providers (Daimo Pay and Aqua) based on chain ID, maintaining Daimo Pay's request/response format.

## Features

- **Multi-Provider Support**: Routes requests to Daimo Pay (default) and Aqua (Stellar) providers
- **Chain-Based Routing**: Automatically selects provider based on blockchain chain ID
- **Format Consistency**: Maintains Daimo Pay API format for all responses
- **Fallback Support**: Automatic fallback to default provider if primary fails
- **Health Monitoring**: Built-in health checks for all providers
- **Comprehensive Logging**: Request/response logging with performance monitoring
- **Rate Limiting**: Built-in rate limiting for API protection
- **Security**: Helmet.js security headers and input validation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Proxy     │    │   Providers     │
│                 │    │                 │    │                 │
│ Daimo Pay       │───▶│ Payment Router  │───▶│ Daimo Pay       │
│ Format          │    │                 │    │ (Ethereum, etc) │
│                 │    │                 │    │                 │
│                 │    │ Provider        │    │ Aqua            │
│                 │    │ Registry        │    │ (Stellar)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Supported Chains

### Daimo Pay Provider
- Ethereum (1)
- Optimism (10)
- Polygon (137)
- Arbitrum (42161)
- Base (8453)
- BSC (56)
- Avalanche (43114)
- Fantom (250)
- Filecoin (314)
- Celo (42220)
- Gnosis (100)
- Polygon zkEVM (1101)
- Linea (59144)
- Mantle (5000)
- Scroll (534352)
- zkSync Era (324)

### Aqua Provider (Stellar)
- Stellar (10001) - Supports XLM and USDC_XLM tokens

## API Endpoints

### Create Payment
```http
POST /api/payment
```

**Request Body:**
```json
{
  "display": {
    "intent": "Payment for services",
    "paymentValue": "10.00",
    "currency": "USD"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "callData": "0x"
  },
  "metadata": {
    "orderId": "12345"
  }
}
```

**Response:**
```json
{
  "id": "payment-id",
  "status": "payment_unpaid",
  "createdAt": "1703123456",
  "display": {
    "intent": "Payment for services",
    "paymentValue": "10.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": null,
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "callData": "0x"
  },
  "metadata": {
    "orderId": "12345"
  },
  "url": "https://checkout.example.com/payment-id"
}
```

### Get Payment by ID
```http
GET /api/payment/{paymentId}
```

### Get Payment by External ID
```http
GET /api/payment/external-id/{externalId}
```

### Health Check
```http
GET /health
```

### Provider Status
```http
GET /api/providers/status
```

### Routing Statistics
```http
GET /api/routing/stats
```

## Environment Variables

Create a `.env` file or use `env.dev` for development:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Provider Configuration
DAIMO_BASE_URL=https://api.daimo.com
DAIMO_API_KEY=your-daimo-api-key
DAIMO_TIMEOUT=30000
DAIMO_RETRIES=3

AQUA_BASE_URL=https://api.aqua.com
AQUA_TIMEOUT=30000
AQUA_RETRIES=3

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Routing
DEFAULT_PROVIDER=daimo
ENABLE_FALLBACK=true
MAX_RETRIES=3
TIMEOUT=30000
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=60000
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.dev .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running with Environment File
```bash
npm run dev:env
```

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Integration Tests Only
```bash
npm run test:integration
```

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── chains.ts     # Chain definitions
│   ├── providers.ts  # Provider configurations
│   ├── routing.ts    # Routing rules
│   └── index.ts      # Config exports
├── providers/        # Provider implementations
│   ├── base-provider.ts    # Abstract base provider
│   ├── daimo-provider.ts   # Daimo Pay provider
│   ├── aqua-provider.ts    # Aqua provider
│   ├── registry.ts         # Provider registry
│   └── index.ts           # Provider exports
├── routing/          # Routing engine
│   └── router.ts     # Main router
├── types/            # TypeScript type definitions
│   ├── api.ts        # API types
│   ├── payment.ts    # Payment types
│   └── provider.ts   # Provider types
├── utils/            # Utility functions
│   └── transformation.ts  # Request/response transformers
├── middleware/       # Express middleware
│   ├── error-handler.ts   # Error handling
│   └── logging.ts         # Logging middleware
├── tests/            # Test files
│   ├── setup.ts           # Test setup
│   └── integration.test.ts # Integration tests
└── server.ts         # Main server file
```

## Provider Integration

### Adding a New Provider

1. Create a new provider class extending `BaseProvider`:
```typescript
export class NewProvider extends BaseProvider {
  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    // Implementation
  }
  
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    // Implementation
  }
  
  async getPaymentByExternalId(externalId: string): Promise<PaymentResponse> {
    // Implementation
  }
}
```

2. Add provider configuration in `src/config/providers.ts`

3. Add routing rules in `src/config/routing.ts`

4. Register the provider in `src/server.ts`

### Aqua Provider Integration

The Aqua provider is currently a placeholder implementation. To integrate with the actual Aqua API:

1. Update `src/providers/aqua-provider.ts` with actual API calls
2. Implement proper response transformation
3. Add authentication if required
4. Update health check implementation

## Error Handling

The API uses standardized error responses:

```json
{
  "error": "Payment processing failed",
  "message": "An error occurred while processing the payment",
  "details": {
    "provider": "daimo",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "errorType": "ValidationError",
    "statusCode": 400,
    "responseData": {}
  }
}
```

## Monitoring and Logging

### Request Logging
All requests are logged with:
- Method and path
- IP address
- User agent
- Response time
- Status code

### Performance Monitoring
- Slow request detection (>1s)
- Very slow request alerts (>5s)
- Response time tracking

### Security Logging
- Potential security threats detection
- Suspicious pattern matching
- Rate limiting violations

## Health Checks

### Provider Health
Each provider implements health checks:
- HTTP endpoint availability
- Response time monitoring
- Error rate tracking

### System Health
Overall system health includes:
- Provider status
- Routing statistics
- System uptime
- Memory usage

## Rate Limiting

Built-in rate limiting:
- 100 requests per 15 minutes per IP
- Configurable limits
- Custom error responses

## Security Features

- Helmet.js security headers
- CORS configuration
- Input validation and sanitization
- Rate limiting
- Security logging
- Request size limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
