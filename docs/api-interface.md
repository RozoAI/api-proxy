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
  "preferredChain": "8453",
  "preferredToken": "USDC",
  "destination": {
    "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
    "chainId": "10001",
    "amountUnits": "10.00",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
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
| `preferredChain` | string | ✅ | **ROUTING**: Chain ID for payment processing (routes to Daimo/Aqua) |
| `preferredToken` | string | ✅ | **ROUTING**: Token symbol for payment processing (USDC, USDC_XLM, XLM) |
| `destination.destinationAddress` | string | ✅ | **WITHDRAWAL**: Final recipient address for funds withdrawal |
| `destination.chainId` | string | ✅ | **WITHDRAWAL**: Final destination chain ID for withdrawal |
| `destination.amountUnits` | string | ✅ | Payment amount (must be > 0) |
| `destination.tokenSymbol` | string | ✅ | **WITHDRAWAL**: Final token symbol for withdrawal |
| `destination.tokenAddress` | string | ❌ | **WITHDRAWAL**: Final token contract address |
| `metadata` | object | ❌ | Additional payment metadata |

**🔄 Two-Stage Architecture**:
- **Stage 1 - Payment Routing**: `preferredChain` + `preferredToken` determine which provider (Daimo/Aqua) processes the payment
- **Stage 2 - Withdrawal**: After payment completion, funds are withdrawn to `destination` address using stored details

**Payment Routing (preferredChain)**:

| Chain | ID | Provider | Supported Tokens | Use Case |
|-------|----|----------|------------------|----------|
| Ethereum | `1` | Daimo | ETH, USDC, USDT, etc. | EVM payments |
| Optimism | `10` | Daimo | ETH, USDC, USDT, etc. | L2 payments |
| Polygon | `137` | Daimo | MATIC, USDC, USDT, etc. | Low-cost payments |
| Arbitrum | `42161` | Daimo | ETH, USDC, USDT, etc. | L2 payments |
| Base | `8453` | Daimo | ETH, USDC, USDT, etc. | Coinbase ecosystem |
| BSC | `56` | Daimo | BNB, USDC, USDT, etc. | BSC ecosystem |
| Stellar | `10001` | Aqua | XLM, USDC_XLM | Stellar ecosystem |

**🔄 Special Conversion Flow: USDC_XLM**
- **When**: `preferredToken: "USDC"` + `destination.tokenSymbol: "USDC_XLM"`
- **Process**: Payment routed to Daimo as USDC → Converted to XLM → Withdrawn to Stellar address
- **Result**: User pays with any supported token via Daimo, receives XLM on Stellar

**🏦 Base Chain Deposit Address Integration**
- **When**: `preferredChain: "8453"` (Base chain payments via Daimo)
- **Process**: After Daimo payment creation → Fetch deposit address from Rozo API → Set as destination address
- **Result**: User gets deposit address in destination field and expiration time for Base chain payments
- **URL Transformation**: Daimo URLs are automatically transformed to use `https://intentapi.rozo.ai` domain

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
    "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "10.00",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123",
    "provider": "daimo",
    "preferred_chain": "8453",
    "preferred_token": "USDC",
    "is_usdc_xlm_conversion": "true",
    "deposit_expiration": 1753710606
  },
  "url": "https://intentapi.rozo.ai/payment_abc123",
  "depositExpiration": 1753710606
}
```

**🔍 Base Chain Deposit Address**:
- **For Base chain payments only**: System automatically fetches deposit address from Rozo API
- **destination.destinationAddress**: Contains deposit address where user should send payment (Base chain)
- **depositExpiration**: Unix timestamp when deposit address expires
- **Automatic Integration**: No additional configuration required

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
  "source": {
    "payerAddress": "0x46ffEA895b5a2E9966e47eC8a2328D2",
    "txHash": "0x56aaf21e6ae6ffbae98325c8e29678800e50b",
    "chainId": "8453",
    "amountUnits": "10.00",
    "tokenSymbol": "USDC",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b5"
  },
  "destination": {
    "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
    "txHash": "050bbe74da18bc6d9a3543b54b10a8e409a8bf1396f6dac87b6cf8e7b9ede171",
    "chainId": "10001",
    "amountUnits": "10.00",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345",
    "provider": "daimo",
    "preferred_chain": "8453",
    "preferred_token": "USDC",
    "is_usdc_xlm_conversion": "true",
    "withdraw_id": "WD_1753380725494_3ith7x0k6",
    "withdrawal_tx_hash": "050bbe74da18bc6d9a3543b54b10a8e409a8bf1396f6dac87b6cf8e7b9ede171",
    "source_address": "0x46ffEA895b5a2E9966e47eC8a2328D2",
    "source_tx_hash": "0x56aaf21e6ae6ffbae98325c8e29678800e50b"
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

**Response**: Same as Get Payment by ID, including deposit address details for Base chain payments

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
  "paymentId": "4WBeiCJbXiuWDxNrHfpAJZ1mqXZ5D6W4eDUDE7cyD187",
  "chainId": 8453,
  "txHash": "0x03dd8776b732586874771e85458aedff15ec4d887c936eb935c446211a452c0a",
  "payment": {
    "id": "4WBeiCJbXiuWDxNrHfpAJZ1mqXZ5D6W4eDUDE7cyD187",
    "status": "payment_completed",
    "createdAt": "1753290541",
    "display": {
      "intent": "Pay",
      "paymentValue": "0.10",
      "currency": "USD"
    },
    "source": {
      "payerAddress": "0xbf3BA31aA1a54fEe4e8808fe12E3bf852309D572",
      "txHash": "0x48ff9123e4a1ed2fb5476276832d863f55244618d44a964460a1924430a2cbcd",
      "chainId": "8453",
      "amountUnits": "0.1",
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "destination": {
      "destinationAddress": "0xa85160a17bFF4B2924881bB4C1708177927643b7",
      "txHash": "0x03dd8776b732586874771e85458aedff15ec4d887c936eb935c446211a452c0a",
      "chainId": "8453",
      "amountUnits": "0.1",
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "metadata": {
      "preferred_chain": "8453",
      "preferred_token": "USDC",
      "is_usdc_xlm_conversion": "true",
      "withdrawal_destination": "{\"address\":\"GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6\",\"chainId\":\"10001\",\"tokenSymbol\":\"USDC_XLM\"}"
    }
  }
}
```

**🔍 Source Transaction Extraction**:
- **payerAddress**: Extracted from `payment.source.payerAddress` and saved to database
- **txHash**: Extracted from `payment.source.txHash` and saved as source transaction hash
- **Automatic Processing**: Source details are automatically saved when webhook type is `payment_completed`

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
  "paymentId": "4WBeiCJbXiuWDxNrHfpAJZ1mqXZ5D6W4eDUDE7cyD187",
  "status": "payment_completed",
  "processed_at": "2024-01-01T00:00:00.000Z",
  "source_transaction": {
    "address": "0xbf3BA31aA1a54fEe4e8808fe12E3bf852309D572",
    "tx_hash": "0x48ff9123e4a1ed2fb5476276832d863f55244618d44a964460a1924430a2cbcd",
    "saved": true
  },
  "withdrawal_triggered": true
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
  "invoice_id": "27ee63e4-6f47-48b8-aeba-efc91ff844e4",
  "mode": "default",
  "status": "paid",
  "status_updated_at_t": 1753178190000,
  "created_at_t": 1753178189834,
  "address": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
  "from": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FMWXVN4",
  "amount": 0.01,
  "callback_url": "https://your-project.supabase.co/functions/v1/webhook-handler?provider=aqua&token=webhook_token",
  "transaction_hash": "d489f9b6f5401d5f09695a6e3601b9b9f65b9ba940b88adb28a7d2f7fd0d3dd0",
  "token_id": "USDC_XLM",
  "metadata": {
    "daimo_intent": "Pay",
    "daimo_currency": "USD",
    "daimo_external_id": "pay_1753197989500_fbjvbp",
    "original_metadata": {
      "items": [],
      "payer": {},
      "intent": "Pay",
      "daimoOrderId": "1234455666"
    }
  },
  "cover_percent": null,
  "cover_amount": null,
  "cover_operator": "both"
}
```

**🔍 Source Transaction Extraction**:
- **from**: Payer's Stellar address extracted and saved to database
- **transaction_hash**: Stellar transaction hash extracted and saved as source transaction hash
- **Automatic Processing**: Source details are automatically saved when webhook status is `paid`

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
  "invoice_id": "27ee63e4-6f47-48b8-aeba-efc91ff844e4",
  "payment_id": "aqua_invoice_27ee63e4-6f47-48b8-aeba-efc91ff844e4",
  "status": "payment_completed",
  "source_transaction": {
    "address": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FMWXVN4",
    "tx_hash": "d489f9b6f5401d5f09695a6e3601b9b9f65b9ba940b88adb28a7d2f7fd0d3dd0",
    "saved": true
  },
  "withdrawal_triggered": true,
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
      "baseUrl": "https://intentapi.rozo.ai",
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

## 🔄 Transaction Tracking Flow

### Complete Transaction Chain

The system provides end-to-end transaction tracking from initial payment through final withdrawal:

1. **Payment Creation** → `preferredChain` + `preferredToken` routing
2. **Provider Processing** → Daimo/Aqua processes payment
3. **Webhook Receipt** → Source transaction details extracted and saved
4. **Withdrawal Triggered** → Funds sent to final destination
5. **Withdrawal Complete** → Withdrawal transaction hash saved

### Transaction Data Sources

| Stage | Data Source | Fields Extracted | Saved To |
|-------|-------------|------------------|----------|
| **Payment Creation** | API Request | `preferredChain`, `preferredToken`, `destination` | `metadata` |
| **Daimo Webhook** | `payment.source` | `payerAddress`, `txHash` | `source_address`, `source_tx_hash` |
| **Aqua Webhook** | Webhook payload | `from`, `transaction_hash` | `source_address`, `source_tx_hash` |
| **Withdrawal Response** | Withdrawal API | `withdraw_id`, `transaction_hash` | `withdraw_id`, `withdrawal_tx_hash` |

### Enhanced Get Payment Response

After complete transaction flow, the Get Payment API returns:

```json
{
  "id": "payment_abc123",
  "status": "payment_completed",
  "source": {
    "payerAddress": "0x46ffEA895b5a2E9966e47eC8a2328D2", // From webhook
    "txHash": "0x56aaf21e6ae6ffbae98325c8e29678800e50b",     // From webhook
    "chainId": "8453",                                        // Payment routing chain
    "tokenSymbol": "USDC"                                     // Payment token
  },
  "destination": {
    "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6", // Final destination
    "txHash": "050bbe74da18bc6d9a3543b54b10a8e409a8bf1396f6dac87b6cf8e7b9ede171",         // Withdrawal tx hash
    "chainId": "10001",                                                                      // Final destination chain
    "tokenSymbol": "USDC_XLM"                                                               // Final token
  },
  "metadata": {
    "provider": "daimo",                    // Which provider processed payment
    "preferred_chain": "8453",              // Routing chain
    "preferred_token": "USDC",              // Routing token
    "is_usdc_xlm_conversion": "true",       // Special conversion flow
    "withdraw_id": "WD_1753380725494",      // Withdrawal service ID
    "withdrawal_tx_hash": "050bbe74...",    // Withdrawal transaction hash
    "source_address": "0x46ffEA895...",     // Source address (duplicate for convenience)
    "source_tx_hash": "0x56aaf21e6ae..."   // Source transaction hash (duplicate)
  }
}
```

## 📊 Request/Response Examples

### Complete Payment Flow

1. **Create Payment** (USDC_XLM Conversion Example)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase with XLM delivery",
      "currency": "USD"
    },
    "preferredChain": "8453",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
      "chainId": "10001",
      "amountUnits": "5.50",
      "tokenSymbol": "USDC_XLM",
      "tokenAddress": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    }
  }'
```

**Flow**: User pays with any token via Daimo (Base chain) → Gets XLM on Stellar

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

# Test payment creation (Standard EVM payment)
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test Payment", "currency": "USD"},
    "preferredChain": "8453",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "chainId": "8453",
      "amountUnits": "10.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  }'

# Test Base chain payment with deposit address (will include depositAddress and depositExpiration)
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test Base Payment with Deposit Address", "currency": "USD"},
    "preferredChain": "8453",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "chainId": "8453",
      "amountUnits": "5.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  }'

# Test USDC_XLM conversion payment
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test USDC→XLM Conversion", "currency": "USD"},
    "preferredChain": "8453",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
      "chainId": "10001",
      "amountUnits": "5.00",
      "tokenSymbol": "USDC_XLM",
      "tokenAddress": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
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
  -d '{"display": {...}, "preferredChain": "8453", "preferredToken": "USDC", "destination": {...}}'

# Test webhook processing (simulate Daimo webhook)
curl -X POST http://localhost:54321/functions/v1/webhook-handler?provider=daimo&token=test_token \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_completed", "paymentId": "test_payment_123", "payment": {"source": {"payerAddress": "0x123...", "txHash": "0xabc..."}}}'

# Test getting payment with transaction details
curl http://localhost:54321/functions/v1/payment-api/external/test_payment_123
```

## 💸 Withdrawal Integration

### Automatic Withdrawal Triggering

When a payment webhook is received with `payment_completed` status, the system automatically:

1. **Saves Source Transaction Details** from webhook payload
2. **Triggers Withdrawal Integration** to external withdrawal service
3. **Saves Withdrawal Transaction Hash** from withdrawal response

### Withdrawal API Integration

The system calls an external withdrawal service with this payload structure:

```json
{
  "amount": 10.00,
  "to_address": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
  "chain": "stellar",
  "token": "XLM",
  "original_payment_id": "payment_abc123",
  "conversion_type": "usdc_base_to_xlm_stellar"
}
```

### Withdrawal Response Processing

Expected withdrawal service response:

```json
{
  "success": true,
  "data": {
    "id": "withdrawal_uuid",
    "withdraw_id": "WD_1753380725494_3ith7x0k6",
    "chain": "stellar",
    "token": "XLM",
    "amount": 10.00,
    "status": "PAID",
    "to_address": "GCOOKXHCGPZJQMLNJVNCYK4JFTCM3GJAUN25W3UEFS2ZX7PL2FLWXVN6",
    "transaction_hash": "050bbe74da18bc6d9a3543b54b10a8e409a8bf1396f6dac87b6cf8e7b9ede171"
  }
}
```

### Environment Configuration

Required environment variables for withdrawal integration:

```bash
WITHDRAWAL_API_BASE_URL=https://withdrawal-service.example.com
WITHDRAWAL_API_TOKEN=your_withdrawal_api_token
WITHDRAWAL_INTEGRATION_ENABLED=true
```

### Special Conversion Handling

**USDC_XLM Conversion Flow**:
- When `destination.tokenSymbol` is `USDC_XLM`
- Withdrawal payload includes `conversion_type: "usdc_base_to_xlm_stellar"`
- Withdrawal service converts USDC to XLM and sends to Stellar address

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Daimo Pay API Documentation](https://paydocs.daimo.com/)
- [Aqua Payment Documentation](./aqua.md)
- [Database Schema](./database-schema.md)
- [Troubleshooting Guide](./troubleshooting.md) 