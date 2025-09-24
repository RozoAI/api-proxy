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

**Description**: Creates a new payment request and routes it to the Payment Manager provider based on chain ID.

**Request Body**:

```json
{
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "preferredChain": "1500",
  "preferredToken": "USDC_XLM",
  "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "destination": {
    "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
    "chainId": "1500",
    "amountUnits": "0.01",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123",
    "webhookUrl": "https://your-app.com/webhooks/payment"
  }
}
```

**Field Descriptions**:

| Field                            | Type   | Required | Description                                                              |
| -------------------------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `display.intent`                 | string | ✅       | Human-readable payment description                                       |
| `display.currency`               | string | ✅       | Currency code (USD, EUR, etc.)                                           |
| `preferredChain`                 | string | ✅       | **ROUTING**: Chain ID for payment processing (routes to Payment Manager) |
| `preferredToken`                 | string | ✅       | **ROUTING**: Token symbol for payment processing (USDC, USDC_XLM, XLM)   |
| `preferredTokenAddress`          | string | ❌       | **OVERRIDE**: Explicit token address (overrides automatic mapping)       |
| `destination.destinationAddress` | string | ✅       | **WITHDRAWAL**: Final recipient address for funds withdrawal             |
| `destination.chainId`            | string | ✅       | **WITHDRAWAL**: Final destination chain ID for withdrawal                |
| `destination.amountUnits`        | string | ✅       | Payment amount (must be > 0)                                             |
| `destination.tokenSymbol`        | string | ✅       | **WITHDRAWAL**: Final token symbol for withdrawal                        |
| `destination.tokenAddress`       | string | ❌       | **WITHDRAWAL**: Final token contract address                             |
| `metadata`                       | object | ❌       | Additional payment metadata                                              |
| `metadata.webhookUrl`            | string | ❌       | Custom webhook URL for payment notifications                             |
| `metadata.externalId`            | string | ❌       | External reference ID for the payment                                    |
| `metadata.merchantToken`         | string | ❌       | Merchant token for webhook verification (included in callback payload)   |

**🔄 Payment Manager Architecture**:

- **Single Provider**: All payments are routed to Payment Manager
- **Multi-Chain Support**: Supports Ethereum, Solana, Stellar, Polygon, and other chains
- **Token Mapping**: Automatic token address mapping with override capability
- **No Withdrawal Integration**: Payment Manager handles payments without automatic withdrawal

**Payment Routing (preferredChain)**:

| Chain           | ID         | Provider        | Supported Tokens        | Token Addresses                                                       | Use Case           |
| --------------- | ---------- | --------------- | ----------------------- | --------------------------------------------------------------------- | ------------------ |
| Ethereum        | `1`        | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C`                    | EVM payments       |
| Sepolia         | `11155111` | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`                    | Ethereum testnet   |
| Optimism        | `10`       | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`                    | L2 payments        |
| Polygon         | `137`      | Payment Manager | MATIC, USDC, USDT, etc. | USDC: `0x83ACD773450269b6c141F830192fd07748c0a8b1`                    | Low-cost payments  |
| Mumbai          | `80001`    | Payment Manager | MATIC, USDC, USDT, etc. | USDC: `0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747`                    | Polygon testnet    |
| Arbitrum        | `42161`    | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8`                    | L2 payments        |
| Base            | `8453`     | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`                    | Coinbase ecosystem |
| BSC             | `56`       | Payment Manager | BNB, USDC, USDT, etc.   | USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`                    | BSC ecosystem      |
| Stellar         | `1500`     | Payment Manager | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Stellar ecosystem  |
| Stellar Testnet | `1501`     | Payment Manager | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Stellar testnet    |
| Solana          | `900`      | Payment Manager | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  | Solana ecosystem   |
| Solana Devnet   | `901`      | Payment Manager | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  | Solana testnet     |

**Response**:

```json
{
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "status": "payment_unpaid",
  "createdAt": "2025-08-14T05:17:29.583+00:00",
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
    "txHash": null,
    "chainId": "1500",
    "amountUnits": "0.01",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123",
    "provider": "payment-manager",
    "preferred_chain": "1500",
    "preferred_token": "USDC_XLM",
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc"
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

### Payment Manager Webhook

**Method**: `POST`

**Query Parameters**:

- `provider=payment-manager` (required)
- `token={webhook_token}` (required)

**Headers**:

- `Content-Type`: `application/json`

**Request Body**:

```json
{
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc",
  "payment": {
    "id": "5941be78-9442-479f-8af7-db74368a05dc",
    "status": "payment_unpaid",
    "createdAt": "2025-08-14T05:17:29.583+00:00",
    "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
    "memo": "0060595",
    "display": {
      "name": "Stellar Mainnet USDC Test",
      "description": "Testing USDC payment on Stellar mainnet",
      "logoUrl": "https://example.com/logo.png"
    },
    "source": null,
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "amountUnits": "0.01",
      "chainId": "1500",
      "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    },
    "externalId": null,
    "metadata": null
  }
}
```

**🔍 Payment Manager Webhook Structure**:

- **id**: Payment Manager payment ID
- **url**: Checkout URL for the payment
- **payment.id**: Internal payment ID
- **payment.status**: Current payment status
- **payment.receivingAddress**: Address where payment should be sent
- **payment.memo**: Memo for Stellar/Solana payments
- **payment.payinchainid**: Chain ID for payment processing
- **payment.payintokenaddress**: Token address for payment processing
- **payment.destination**: Withdrawal destination details

**Payment Status Values**:

- `payment_unpaid` - Payment not yet received
- `payment_started` - Payment initiated
- `payment_completed` - Payment successful
- `payment_bounced` - Payment failed
- `payment_refunded` - Payment refunded

**Response**:

```json
{
  "success": true,
  "message": "Payment Manager webhook processed successfully",
  "paymentId": "5941be78-9442-479f-8af7-db74368a05dc",
  "status": "payment_unpaid",
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc",
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
    "payment-manager": {
      "status": "healthy",
      "responseTime": 150,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "baseUrl": "https://rozo-payment-manager.example.com",
      "enabled": true
    }
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

| Error Type            | Status Code | Description              |
| --------------------- | ----------- | ------------------------ |
| `ValidationError`     | 400         | Invalid request data     |
| `AuthenticationError` | 401         | Invalid API key or token |
| `NotFoundError`       | 404         | Resource not found       |
| `ProviderError`       | 502         | External provider error  |
| `InternalError`       | 500         | Internal server error    |

### Error Codes

| Code                   | Description                 |
| ---------------------- | --------------------------- |
| `INVALID_AMOUNT`       | Amount must be positive     |
| `INVALID_ADDRESS`      | Invalid destination address |
| `UNSUPPORTED_CHAIN`    | Chain ID not supported      |
| `PROVIDER_UNAVAILABLE` | Provider service down       |
| `WEBHOOK_INVALID`      | Invalid webhook signature   |
| `PAYMENT_NOT_FOUND`    | Payment record not found    |

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

#### Merchant Token Verification

When creating a payment, merchants can include a `merchantToken` in the metadata:

```json
{
  "metadata": {
    "merchantToken": "your-secret-token-here",
    "orderId": "12345"
  }
}
```

This token will be included in the webhook callback payload sent to your `callback_url`:

```json
{
  "type": "payment_completed",
  "paymentId": "payment_id",
  "merchantToken": "your-secret-token-here",
  "metadata": { ... },
  "payment": { ... }
}
```

Merchants should verify this token matches what they provided during payment creation to ensure the webhook is authentic.

#### Provider Webhooks

**Daimo Webhooks**
- Signature verification using `X-Daimo-Signature` header
- Token-based authentication via query parameter

**Aqua Webhooks**
- Token-based authentication via query parameter
- No signature verification required

**Payment Manager Webhooks**
- Token-based authentication via query parameter

## 🚦 Rate Limiting

### Default Limits

| Endpoint        | Rate Limit    | Window   |
| --------------- | ------------- | -------- |
| Payment API     | 100 requests  | 1 minute |
| Webhook Handler | 1000 requests | 1 minute |
| Health Check    | 60 requests   | 1 minute |

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

### Payment Manager Transaction Flow

The Payment Manager handles the complete payment flow without automatic withdrawal integration:

1. **Payment Creation** → `preferredChain` + `preferredToken` routing to Payment Manager
2. **Payment Processing** → Payment Manager processes payment on specified chain
3. **Webhook Receipt** → Payment status updates received via webhook
4. **Payment Completion** → Payment Manager handles final settlement

### Transaction Data Sources

| Stage                       | Data Source     | Fields Extracted                                             | Saved To             |
| --------------------------- | --------------- | ------------------------------------------------------------ | -------------------- |
| **Payment Creation**        | API Request     | `preferredChain`, `preferredToken`, `destination`            | `metadata`           |
| **Payment Manager Webhook** | Webhook payload | `payment.status`, `payment.receivingAddress`, `payment.memo` | `status`, `metadata` |

### Enhanced Get Payment Response

After Payment Manager processing, the Get Payment API returns:

```json
{
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "status": "payment_completed",
  "createdAt": "2025-08-14T05:17:29.583+00:00",
  "display": {
    "intent": "Payment for services",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
    "txHash": null,
    "chainId": "1500",
    "amountUnits": "0.01",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "externalId": "ext_123",
  "metadata": {
    "orderId": "12345",
    "customerId": "cust_123",
    "provider": "payment-manager",
    "preferred_chain": "1500",
    "preferred_token": "USDC_XLM",
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
    "memo": "0060595"
  },
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc"
}
```

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Payment Manager Documentation](./payment-manager.md)
- [Database Schema](./database-schema.md)
- [Troubleshooting Guide](./troubleshooting.md)

## 📊 Request/Response Examples

### Complete Payment Flow

1. **Create Payment** (Stellar USDC Example)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase with Stellar USDC",
      "currency": "USD"
    },
    "preferredChain": "1500",
    "preferredToken": "USDC_XLM",
    "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "chainId": "1500",
      "amountUnits": "5.50",
      "tokenSymbol": "USDC_XLM",
      "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    },
    "metadata": {
      "orderId": "coffee_001",
      "customerId": "cust_123",
      "merchantToken": "merchant-secret-token-123"
    }
  }'
```

2. **Create Payment** (Solana USDC Example)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "NFT purchase with Solana USDC",
      "currency": "USD"
    },
    "preferredChain": "900",
    "preferredToken": "USDC",
    "preferredTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "destination": {
      "destinationAddress": "BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC",
      "chainId": "900",
      "amountUnits": "25.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    },
    "metadata": {
      "orderId": "nft_001",
      "nftId": "nft_12345"
    }
  }'
```

3. **Check Payment Status**

```bash
curl https://your-project.supabase.co/functions/v1/payment-api/5941be78-9442-479f-8af7-db74368a05dc
```

4. **Webhook Notification** (automated)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhook-handler?provider=payment-manager&token=webhook_token \
  -H "Content-Type: application/json" \
  -d '{
    "id": "5941be78-9442-479f-8af7-db74368a05dc",
    "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc",
    "payment": {
      "id": "5941be78-9442-479f-8af7-db74368a05dc",
      "status": "payment_completed",
      "createdAt": "2025-08-14T05:17:29.583+00:00",
      "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
      "memo": "0060595",
      "display": {
        "name": "Stellar Mainnet USDC Test",
        "description": "Testing USDC payment on Stellar mainnet",
        "logoUrl": "https://example.com/logo.png"
      },
      "source": null,
      "payinchainid": "1500",
      "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "destination": {
        "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
        "amountUnits": "0.01",
        "chainId": "1500",
        "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
      },
      "externalId": null,
      "metadata": null
    }
  }'
```

## 🔧 Testing

### Test Endpoints

```bash
# Health check
curl https://your-project.supabase.co/functions/v1/api-health

# Test payment creation (Stellar USDC)
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test Stellar Payment", "currency": "USD"},
    "preferredChain": "1500",
    "preferredToken": "USDC_XLM",
    "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "chainId": "1500",
      "amountUnits": "0.01",
      "tokenSymbol": "USDC_XLM",
      "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    }
  }'

# Test payment creation (Solana USDC)
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test Solana Payment", "currency": "USD"},
    "preferredChain": "900",
    "preferredToken": "USDC",
    "preferredTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "destination": {
      "destinationAddress": "BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC",
      "chainId": "900",
      "amountUnits": "25.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    }
  }'

# Test payment creation (Ethereum USDC)
curl -X POST http://localhost:54321/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {"intent": "Test Ethereum Payment", "currency": "USD"},
    "preferredChain": "1",
    "preferredToken": "USDC",
    "preferredTokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8C",
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "1",
      "amountUnits": "1000000",
      "tokenSymbol": "USDC",
      "tokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8C"
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
  -d '{"display": {...}, "preferredChain": "1500", "preferredToken": "USDC_XLM", "destination": {...}}'

# Test webhook processing (simulate Payment Manager webhook)
curl -X POST http://localhost:54321/functions/v1/webhook-handler?provider=payment-manager&token=test_token \
  -H "Content-Type: application/json" \
  -d '{"id": "test_payment_123", "url": "http://localhost:54321/checkout?id=test_payment_123", "payment": {"id": "test_payment_123", "status": "payment_completed"}}'

# Test getting payment
curl http://localhost:54321/functions/v1/payment-api/external/test_payment_123
```
