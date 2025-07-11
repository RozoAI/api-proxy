# Payment API Proxy - Complete API Interface Documentation

## Overview

The Payment API Proxy provides a unified interface for multiple blockchain payment providers (Daimo Pay and Aqua) while maintaining consistent Daimo Pay format across all responses. The API automatically routes requests to the appropriate provider based on the blockchain chain ID.

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## Authentication

Currently, the API does not require authentication for payment operations. Webhook endpoints use provider-specific authentication mechanisms.

## Content Type

All requests and responses use `application/json` content type.

---

## Payment Operations

### 1. Create Payment

Creates a new payment request and routes it to the appropriate provider based on chain ID.

#### Endpoint
```
POST /api/payment
```

#### Request Headers
```
Content-Type: application/json
```

#### Request Body Schema
```typescript
{
  display: {
    intent: string;           // Human-readable payment description
    paymentValue: string;     // Payment amount in human-readable format
    currency: string;         // Currency code (e.g., "USD", "EUR")
  };
  destination: {
    destinationAddress: string;  // Recipient address
    chainId: string;            // Blockchain chain ID
    amountUnits: string;        // Amount in smallest units (wei, stroops, etc.)
    tokenSymbol?: string;       // Required for Aqua chains (XLM, USDC_XLM)
    tokenAddress?: string;      // Required for Daimo chains
  };
  externalId?: string;          // Optional external reference ID
  metadata?: object;            // Optional additional data
}
```

#### Response Schema
```typescript
{
  id: string;                   // Unique payment ID
  status: PaymentStatus;        // Current payment status
  createdAt: string;           // Creation timestamp
  display: {
    intent: string;
    paymentValue: string;
    currency: string;
  };
  source: {                    // null until payment is initiated
    sourceAddress?: string;
    txHash?: string;
    chainId: string;
    amountUnits: string;
    tokenSymbol: string;
    tokenAddress: string;
  } | null;
  destination: {
    destinationAddress: string;
    txHash: string | null;
    chainId: string;
    amountUnits: string;
    tokenSymbol: string;
    tokenAddress: string;
  };
  externalId: string | null;
  metadata: object;
  url: string;                 // Payment URL for user interaction
}
```

#### Payment Status Values
- `payment_unpaid`: Payment created but not yet initiated
- `payment_started`: Payment has been initiated but not completed
- `payment_completed`: Payment has been successfully completed
- `payment_bounced`: Payment failed or was rejected

---

### Example 1: Ethereum Payment (Daimo Provider)

#### Request
```bash
curl -X POST http://localhost:3001/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase at Starbucks",
      "paymentValue": "5.50",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "10",
      "amountUnits": "5500000",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "externalId": "starbucks_order_12345",
    "metadata": {
      "store": "Starbucks Downtown",
      "cashier": "John Doe",
      "items": ["Latte", "Croissant"]
    }
  }'
```

#### Response
```json
{
  "id": "daimo_1699123456789_abc123def",
  "status": "payment_unpaid",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Coffee purchase at Starbucks",
    "paymentValue": "5.50",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "txHash": null,
    "chainId": "10",
    "amountUnits": "5500000",
    "tokenSymbol": "ETH",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "starbucks_order_12345",
  "metadata": {
    "store": "Starbucks Downtown",
    "cashier": "John Doe",
    "items": ["Latte", "Croissant"],
    "provider": "daimo"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

---

### Example 2: Stellar Payment (Aqua Provider)

#### Request
```bash
curl -X POST http://localhost:3001/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Stellar XLM transfer to friend",
      "paymentValue": "25.00",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
      "chainId": "10001",
      "amountUnits": "25000000",
      "tokenSymbol": "XLM"
    },
    "externalId": "friend_transfer_789",
    "metadata": {
      "purpose": "Birthday gift",
      "recipient": "Alice Johnson"
    }
  }'
```

#### Response
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_unpaid",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar XLM transfer to friend",
    "paymentValue": "25.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "25000000",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "friend_transfer_789",
  "metadata": {
    "purpose": "Birthday gift",
    "recipient": "Alice Johnson",
    "aqua_invoice_id": "aqua_invoice_1699123456_xyz789",
    "aqua_mode": "default",
    "aqua_token_id": "xlm"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
```

---

### Example 3: Stellar USDC Payment (Aqua Provider)

#### Request
```bash
curl -X POST http://localhost:3001/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "USDC payment for freelance work",
      "paymentValue": "150.00",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "GBQHFHJOQ4GKDGJGQHFHJOQ4GKDGJGQHFHJOQ4GKDGJGQHFHJOQ4GKD",
      "chainId": "10001",
      "amountUnits": "150000000",
      "tokenSymbol": "USDC_XLM"
    },
    "externalId": "freelance_payment_456",
    "metadata": {
      "project": "Website Design",
      "freelancer": "Bob Smith",
      "hours": 15
    }
  }'
```

#### Response
```json
{
  "id": "aqua_invoice_1699123789_usdc456",
  "status": "payment_unpaid",
  "createdAt": "1699123789000",
  "display": {
    "intent": "USDC payment for freelance work",
    "paymentValue": "150.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GBQHFHJOQ4GKDGJGQHFHJOQ4GKDGJGQHFHJOQ4GKDGJGQHFHJOQ4GKD",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "150000000",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": ""
  },
  "externalId": "freelance_payment_456",
  "metadata": {
    "project": "Website Design",
    "freelancer": "Bob Smith",
    "hours": 15,
    "aqua_invoice_id": "aqua_invoice_1699123789_usdc456",
    "aqua_mode": "default",
    "aqua_token_id": "usdc"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123789_usdc456"
}
```

---

### Error Response Example
```json
{
  "error": "Validation failed: Invalid Stellar address format",
  "details": {
    "field": "destination.destinationAddress",
    "code": "INVALID_ADDRESS",
    "provider": "aqua"
  }
}
```

---

## 2. Get Payment by ID

Retrieves a payment by its unique payment ID.

#### Endpoint
```
GET /api/payment/:paymentId
```

#### Path Parameters
- `paymentId` (string): The unique payment ID

---

### Example 1: Get Daimo Payment

#### Request
```bash
curl -X GET http://localhost:3001/api/payment/daimo_1699123456789_abc123def
```

#### Response (Completed Payment)
```json
{
  "id": "daimo_1699123456789_abc123def",
  "status": "payment_completed",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Coffee purchase at Starbucks",
    "paymentValue": "5.50",
    "currency": "USD"
  },
  "source": {
    "sourceAddress": "0x9876543210fedcba9876543210fedcba98765432",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "10",
    "amountUnits": "5500000",
    "tokenSymbol": "ETH",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "10",
    "amountUnits": "5500000",
    "tokenSymbol": "ETH",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "starbucks_order_12345",
  "metadata": {
    "store": "Starbucks Downtown",
    "cashier": "John Doe",
    "items": ["Latte", "Croissant"],
    "provider": "daimo"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

---

### Example 2: Get Aqua Payment

#### Request
```bash
curl -X GET http://localhost:3001/api/payment/aqua_invoice_1699123456_xyz789
```

#### Response (Completed Payment)
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_completed",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar XLM transfer to friend",
    "paymentValue": "25.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": "stellar_tx_hash_abcdef123456789",
    "chainId": "10001",
    "amountUnits": "25000000",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "friend_transfer_789",
  "metadata": {
    "purpose": "Birthday gift",
    "recipient": "Alice Johnson",
    "aqua_invoice_id": "aqua_invoice_1699123456_xyz789",
    "aqua_mode": "default",
    "aqua_token_id": "xlm",
    "aqua_status": "paid",
    "aqua_status_updated_at": 1699123500000
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
```

---

### Error Response Example
```json
{
  "error": "Payment not found",
  "details": {
    "paymentId": "nonexistent_payment_id",
    "code": "PAYMENT_NOT_FOUND"
  }
}
```

---

## 3. Get Payment by External ID

Retrieves a payment by its external reference ID.

#### Endpoint
```
GET /api/payment/external-id/:externalId
```

#### Path Parameters
- `externalId` (string): The external reference ID

---

### Example 1: Get Daimo Payment by External ID

#### Request
```bash
curl -X GET http://localhost:3001/api/payment/external-id/starbucks_order_12345
```

#### Response
```json
{
  "id": "daimo_1699123456789_abc123def",
  "status": "payment_completed",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Coffee purchase at Starbucks",
    "paymentValue": "5.50",
    "currency": "USD"
  },
  "source": {
    "sourceAddress": "0x9876543210fedcba9876543210fedcba98765432",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "10",
    "amountUnits": "5500000",
    "tokenSymbol": "ETH",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "10",
    "amountUnits": "5500000",
    "tokenSymbol": "ETH",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "starbucks_order_12345",
  "metadata": {
    "store": "Starbucks Downtown",
    "cashier": "John Doe",
    "items": ["Latte", "Croissant"],
    "provider": "daimo"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

---

### Example 2: Get Aqua Payment by External ID

#### Request
```bash
curl -X GET http://localhost:3001/api/payment/external-id/friend_transfer_789
```

#### Response
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_completed",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar XLM transfer to friend",
    "paymentValue": "25.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": "stellar_tx_hash_abcdef123456789",
    "chainId": "10001",
    "amountUnits": "25000000",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "friend_transfer_789",
  "metadata": {
    "purpose": "Birthday gift",
    "recipient": "Alice Johnson",
    "aqua_invoice_id": "aqua_invoice_1699123456_xyz789",
    "aqua_mode": "default",
    "aqua_token_id": "xlm",
    "aqua_status": "paid",
    "aqua_status_updated_at": 1699123500000
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
```

---

## Webhook Endpoints

### 1. Daimo Webhook

Receives payment status updates from Daimo Pay.

#### Endpoint
```
POST /webhooks/daimo
```

#### Authentication
Daimo webhooks use signature verification (implementation details depend on Daimo's webhook specification).

#### Request Headers
```
Content-Type: application/json
X-Daimo-Signature: sha256=<signature>
```

---

### Example: Daimo Webhook Event

#### Request Body
```json
{
  "type": "payment.completed",
  "data": {
    "id": "daimo_1699123456789_abc123def",
    "status": "payment_completed",
    "createdAt": "1699123456789",
    "display": {
      "intent": "Coffee purchase at Starbucks",
      "paymentValue": "5.50",
      "currency": "USD"
    },
    "source": {
      "sourceAddress": "0x9876543210fedcba9876543210fedcba98765432",
      "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
      "chainId": "10",
      "amountUnits": "5500000",
      "tokenSymbol": "ETH",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
      "chainId": "10",
      "amountUnits": "5500000",
      "tokenSymbol": "ETH",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "externalId": "starbucks_order_12345",
    "metadata": {
      "store": "Starbucks Downtown",
      "cashier": "John Doe",
      "items": ["Latte", "Croissant"]
    },
    "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

### 2. Aqua Webhook

Receives payment status updates from Aqua.

#### Endpoint
```
POST /webhooks/aqua?token=<webhook_token>
```

#### Authentication
Token-based authentication via query parameter.

#### Request Headers
```
Content-Type: application/json
```

---

### Example: Aqua Webhook Event

#### Request
```bash
curl -X POST "http://localhost:3001/webhooks/aqua?token=secure-webhook-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "aqua_invoice_1699123456_xyz789",
    "mode": "default",
    "status": "paid",
    "status_updated_at_t": 1699123500000,
    "created_at": "2023-11-04T12:30:56.000Z",
    "address": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "amount": 25.00,
    "callback_url": "http://localhost:3001/webhooks/aqua?token=secure-webhook-token-here",
    "transaction_hash": "stellar_tx_hash_abcdef123456789",
    "token_id": "xlm",
    "metadata": {
      "daimo_external_id": "friend_transfer_789",
      "daimo_intent": "Stellar XLM transfer to friend",
      "daimo_currency": "USD",
      "original_metadata": {
        "purpose": "Birthday gift",
        "recipient": "Alice Johnson"
      }
    }
  }'
```

#### Response
```json
{
  "success": true,
  "message": "Payment aqua_payment_123 updated to payment_completed"
}
```

---

### Webhook Error Response
```json
{
  "success": false,
  "error": "Invalid authentication token"
}
```

---

## Monitoring Endpoints

### 1. Health Check

Returns the overall system health and provider status.

#### Endpoint
```
GET /health
```

#### Example Request
```bash
curl -X GET http://localhost:3001/health
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2023-11-04T12:30:56.789Z",
  "uptime": 86400,
  "version": "1.0.0",
  "providers": {
    "daimo": {
      "status": "healthy",
      "responseTime": 125,
      "lastCheck": "2023-11-04T12:30:55.000Z"
    },
    "aqua": {
      "status": "healthy",
      "responseTime": 89,
      "lastCheck": "2023-11-04T12:30:55.000Z"
    }
  },
  "database": {
    "status": "healthy",
    "responseTime": 12,
    "connectionPool": {
      "active": 2,
      "idle": 8,
      "total": 10
    }
  }
}
```

---

### 2. Provider Status

Returns detailed status information for all providers.

#### Endpoint
```
GET /api/providers/status
```

#### Example Request
```bash
curl -X GET http://localhost:3001/api/providers/status
```

#### Response
```json
{
  "providers": [
    {
      "name": "daimo",
      "status": "healthy",
      "supportedChains": [1, 10, 137, 42161, 8453, 56, 43114, 250, 314, 42220, 100, 1101, 59144, 5000, 534352, 324],
      "config": {
        "baseUrl": "https://api.daimo.com",
        "timeout": 30000
      },
      "healthCheck": {
        "lastCheck": "2023-11-04T12:30:55.000Z",
        "responseTime": 125,
        "status": "healthy"
      }
    },
    {
      "name": "aqua",
      "status": "healthy",
      "supportedChains": [10001],
      "config": {
        "baseUrl": "https://api.aqua.network",
        "timeout": 30000
      },
      "healthCheck": {
        "lastCheck": "2023-11-04T12:30:55.000Z",
        "responseTime": 89,
        "status": "healthy"
      }
    }
  ],
  "routing": {
    "defaultProvider": "daimo",
    "chainMappings": {
      "10001": "aqua"
    }
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message",
  "details": {
    "code": "ERROR_CODE",
    "field": "fieldName",
    "provider": "providerName"
  }
}
```

### Common Error Codes

#### Validation Errors (400)
- `INVALID_ADDRESS`: Invalid blockchain address format
- `INVALID_CHAIN_ID`: Unsupported or invalid chain ID
- `INVALID_AMOUNT`: Invalid amount format or value
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_TOKEN`: Unsupported token for the specified chain

#### Not Found Errors (404)
- `PAYMENT_NOT_FOUND`: Payment ID does not exist
- `EXTERNAL_ID_NOT_FOUND`: External ID does not exist

#### Provider Errors (502)
- `PROVIDER_UNAVAILABLE`: Payment provider is currently unavailable
- `PROVIDER_ERROR`: Error from the payment provider
- `PROVIDER_TIMEOUT`: Provider request timed out

#### Server Errors (500)
- `INTERNAL_ERROR`: Internal server error
- `DATABASE_ERROR`: Database operation failed

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

### Rate Limit Exceeded Response
```json
{
  "error": "Too many requests",
  "details": {
    "code": "RATE_LIMIT_EXCEEDED",
    "limit": 100,
    "window": "15 minutes",
    "retryAfter": 900
  }
}
```

---

## Supported Chains and Providers

### Chain ID Routing

| Chain ID | Blockchain | Provider | Tokens |
|----------|------------|----------|---------|
| 1 | Ethereum Mainnet | Daimo | ETH, ERC-20 |
| 10 | Optimism | Daimo | ETH, ERC-20 |
| 137 | Polygon | Daimo | MATIC, ERC-20 |
| 42161 | Arbitrum One | Daimo | ETH, ERC-20 |
| 8453 | Base | Daimo | ETH, ERC-20 |
| 56 | BSC | Daimo | BNB, BEP-20 |
| 43114 | Avalanche | Daimo | AVAX, ERC-20 |
| 250 | Fantom | Daimo | FTM, ERC-20 |
| 314 | Filecoin | Daimo | FIL, ERC-20 |
| 42220 | Celo | Daimo | CELO, ERC-20 |
| 100 | Gnosis | Daimo | xDAI, ERC-20 |
| 1101 | Polygon zkEVM | Daimo | ETH, ERC-20 |
| 59144 | Linea | Daimo | ETH, ERC-20 |
| 5000 | Mantle | Daimo | MNT, ERC-20 |
| 534352 | Scroll | Daimo | ETH, ERC-20 |
| 324 | zkSync | Daimo | ETH, ERC-20 |
| 10001 | Stellar | Aqua | XLM, USDC_XLM |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Create payment
const createPayment = async (paymentData: PaymentRequest) => {
  const response = await fetch('http://localhost:3001/api/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get payment
const getPayment = async (paymentId: string) => {
  const response = await fetch(`http://localhost:3001/api/payment/${paymentId}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Example usage
const daimoPayment = await createPayment({
  display: {
    intent: "Coffee purchase",
    paymentValue: "5.50",
    currency: "USD"
  },
  destination: {
    destinationAddress: "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    chainId: "10",
    amountUnits: "5500000",
    tokenAddress: "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  externalId: "order_12345"
});

const aquaPayment = await createPayment({
  display: {
    intent: "Stellar transfer",
    paymentValue: "25.00",
    currency: "USD"
  },
  destination: {
    destinationAddress: "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    chainId: "10001",
    amountUnits: "25000000",
    tokenSymbol: "XLM"
  }
});
```

### Python

```python
import requests
import json

def create_payment(payment_data):
    response = requests.post(
        'http://localhost:3001/api/payment',
        headers={'Content-Type': 'application/json'},
        json=payment_data
    )
    response.raise_for_status()
    return response.json()

def get_payment(payment_id):
    response = requests.get(f'http://localhost:3001/api/payment/{payment_id}')
    response.raise_for_status()
    return response.json()

# Example usage
daimo_payment = create_payment({
    "display": {
        "intent": "Coffee purchase",
        "paymentValue": "5.50",
        "currency": "USD"
    },
    "destination": {
        "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
        "chainId": "10",
        "amountUnits": "5500000",
        "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "externalId": "order_12345"
})

aqua_payment = create_payment({
    "display": {
        "intent": "Stellar transfer",
        "paymentValue": "25.00",
        "currency": "USD"
    },
    "destination": {
        "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
        "chainId": "10001",
        "amountUnits": "25000000",
        "tokenSymbol": "XLM"
    }
})
```

---

This comprehensive API documentation covers all endpoints with detailed examples for both Daimo and Aqua providers, including request/response formats, error handling, and SDK examples. 