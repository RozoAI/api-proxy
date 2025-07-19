# API Interface Documentation

This document provides detailed API specifications for all Supabase Edge Functions in the Payment API Proxy.

## 📋 Table of Contents

- [Payment API](#payment-api)
- [Webhook Handler](#webhook-handler)
- [Health Check](#health-check)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)

## 🏦 Payment API

**Endpoint**: `/functions/v1/payment-api`

### Create Payment

**Method**: `POST`

**Description**: Creates a new payment request and routes it to the appropriate provider based on chain ID.

**Request Body**:
```json
{
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123"
  }
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display.intent` | string | ✅ | Human-readable payment description |
| `display.currency` | string | ✅ | Currency code (USD, EUR, etc.) |
| `destination.destinationAddress` | string | ✅ | Recipient address (Ethereum/Stellar) |
| `destination.chainId` | string | ✅ | Blockchain chain ID |
| `destination.amountUnits` | string | ✅ | Payment amount (must be > 0) |
| `destination.tokenSymbol` | string | ❌ | Token symbol (ETH, USDC, XLM, etc.) |
| `destination.tokenAddress` | string | ❌ | Token contract address (EVM chains) |
| `metadata` | object | ❌ | Additional payment metadata |

**Supported Chain IDs**:

| Chain | ID | Provider | Supported Tokens |
|-------|----|----------|------------------|
| Ethereum | `1` | Daimo | ETH, USDC, USDT, etc. |
| Optimism | `10` | Daimo | ETH, USDC, USDT, etc. |
| Polygon | `137` | Daimo | MATIC, USDC, USDT, etc. |
| Arbitrum | `42161` | Daimo | ETH, USDC, USDT, etc. |
| Base | `8453` | Daimo | ETH, USDC, USDT, etc. |
| BSC | `56` | Daimo | BNB, USDC, USDT, etc. |
| Stellar | `10001` | Aqua | XLM, USDC_XLM |

**Response**:
```json
{
  "id": "payment_abc123",
  "status": "payment_unpaid",
  "createdAt": "1703123456",
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": null,
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123"
  },
  "url": "https://checkout.example.com/payment_abc123"
}
```

**Status Codes**:
- `201` - Payment created successfully
- `400` - Invalid request data
- `500` - Internal server error

### Get Payment by ID

**Method**: `GET`

**Endpoint**: `/functions/v1/payment-api/{paymentId}`

**Description**: Retrieves payment information by internal payment ID.

**Path Parameters**:
- `paymentId` (string, required): Internal payment ID

**Response**:
```json
{
  "id": "payment_abc123",
  "status": "payment_completed",
  "createdAt": "1703123456",
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": "0x1234567890abcdef...",
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345"
  }
}
```

**Status Codes**:
- `200` - Payment found
- `404` - Payment not found
- `500` - Internal server error

### Get Payment by External ID

**Method**: `GET`

**Endpoint**: `/functions/v1/payment-api/external-id/{externalId}`

**Description**: Retrieves payment information by external provider ID.

**Path Parameters**:
- `externalId` (string, required): External provider payment ID

**Response**: Same as Get Payment by ID

**Status Codes**:
- `200` - Payment found
- `404` - Payment not found
- `500` - Internal server error

## 🔗 Webhook Handler

**Endpoint**: `/functions/v1/webhook-handler`

### Daimo Webhook

**Method**: `POST`

**Query Parameters**:
- `provider=daimo` (required)
- `token={webhook_token}` (required)

**Headers**:
- `X-Daimo-Signature`: SHA256 signature for verification
- `Content-Type`: `application/json`

**Request Body**:
```json
{
  "type": "payment_completed",
  "paymentId": "payment_123",
  "chainId": 10,
  "txHash": "0x1234567890abcdef...",
  "payment": {
    "amount": "1000000",
    "currency": "USD",
    "recipient": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
  }
}
```

**Webhook Event Types**:
- `payment_started` - Payment initiated
- `payment_completed` - Payment successful
- `payment_failed` - Payment failed
- `payment_cancelled` - Payment cancelled

**Response**:
```json
{
  "success": true,
  "message": "Daimo webhook processed successfully",
  "paymentId": "payment_123",
  "status": "payment_completed",
  "processedAt": "2024-01-01T00:00:00.000Z"
}
```

### Aqua Webhook

**Method**: `POST`

**Query Parameters**:
- `provider=aqua` (required)
- `token={webhook_token}` (required)

**Request Body**:
```json
{
  "invoice_id": "aqua_invoice_123",
  "status": "paid",
  "amount": 100.50,
  "address": "GABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890",
  "token_id": "usdc",
  "transaction_hash": "stellar_tx_hash_123"
}
```

**Aqua Status Values**:
- `created` - Invoice created
- `retry` - Payment retry
- `paid` - Payment successful
- `failed` - Payment failed
- `deleted` - Invoice deleted

**Response**:
```json
{
  "success": true,
  "message": "Aqua webhook processed successfully",
  "invoice_id": "aqua_invoice_123",
  "payment_id": "payment_abc123",
  "status": "payment_completed",
  "transaction_hash": "stellar_tx_hash_123",
  "processed_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes**:
- `200` - Webhook processed successfully
- `400` - Invalid webhook data
- `401` - Invalid webhook token
- `404` - Payment not found
- `500` - Internal server error

## 🏥 Health Check

**Endpoint**: `/functions/v1/api-health`

**Method**: `GET`

**Description**: Provides comprehensive system health status including provider connectivity and withdrawal integration status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "responseTime": 5
  },
  "providers": {
    "daimo": {
      "status": "healthy",
      "responseTime": 150,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "baseUrl": "https://pay.daimo.com",
      "enabled": true
    },
    "aqua": {
      "status": "healthy",
      "responseTime": 200,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "baseUrl": "https://api.aqua.network",
      "enabled": true
    }
  },
  "withdrawal_integration": {
    "status": "healthy",
    "enabled": true,
    "baseUrl": "https://withdrawal-api.example.com",
    "lastCheck": "2024-01-01T00:00:00.000Z"
  },
  "system": {
    "uptime": 3600,
    "memory": {
      "used": 512,
      "total": 1024
    },
    "environment": "production"
  }
}
```

**Health Status Values**:
- `healthy` - All systems operational
- `degraded` - Some systems experiencing issues
- `unhealthy` - Critical systems down

**Status Codes**:
- `200` - System healthy
- `503` - System unhealthy

## ❌ Error Handling

### Standard Error Response Format

```json
{
  "error": "Payment processing failed",
  "message": "An error occurred while processing the payment",
  "details": {
    "provider": "daimo",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "errorType": "ValidationError",
    "statusCode": 400,
    "requestId": "req_123",
    "responseData": {}
  }
}
```

### Common Error Types

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| `ValidationError` | 400 | Invalid request data |
| `AuthenticationError` | 401 | Invalid API key or token |
| `NotFoundError` | 404 | Resource not found |
| `ProviderError` | 502 | External provider error |
| `InternalError` | 500 | Internal server error |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_AMOUNT` | Amount must be positive |
| `INVALID_ADDRESS` | Invalid destination address |
| `UNSUPPORTED_CHAIN` | Chain ID not supported |
| `PROVIDER_UNAVAILABLE` | Provider service down |
| `WEBHOOK_INVALID` | Invalid webhook signature |
| `PAYMENT_NOT_FOUND` | Payment record not found |

## 🔐 Authentication

### API Key Authentication

For payment creation endpoints, include your API key in the request headers:

```bash
curl -X POST /functions/v1/payment-api \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"display": {...}, "destination": {...}}'
```

### Webhook Authentication

#### Daimo Webhooks
- Signature verification using `X-Daimo-Signature` header
- Token-based authentication via query parameter

#### Aqua Webhooks
- Token-based authentication via query parameter
- No signature verification required

## 🚦 Rate Limiting

### Default Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| Payment API | 100 requests | 1 minute |
| Webhook Handler | 1000 requests | 1 minute |
| Health Check | 60 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later",
  "retryAfter": 60
}
```

## 📊 Request/Response Examples

### Complete Payment Flow

1. **Create Payment**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "chainId": "10",
      "amountUnits": "5500000",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    }
  }'
```

2. **Check Payment Status**
```bash
curl https://your-project.supabase.co/functions/v1/payment-api/payment_abc123
```

3. **Webhook Notification** (automated)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhook-handler?provider=daimo&token=webhook_token \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_completed","paymentId":"payment_abc123"}'
```

## 🔧 Testing

### Test Endpoints

```bash
# Health check
curl https://your-project.supabase.co/functions/v1/api-health

# Test payment creation
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test", "currency": "USD"},
    "destination": {
      "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "chainId": "1",
      "amountUnits": "1000000",
      "tokenAddress": "0x0000000000000000000000000000000000000000"
    }
  }'
```

### Local Testing

```bash
# Start local development
supabase start

# Test local endpoints
curl http://localhost:54321/functions/v1/api-health
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{"display": {...}, "destination": {...}}'
```

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Daimo Pay API Documentation](https://paydocs.daimo.com/)
- [Aqua Payment Documentation](./aqua.md)
- [Database Schema](./database-schema.md)
- [Troubleshooting Guide](./troubleshooting.md) 