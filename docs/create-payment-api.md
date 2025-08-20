# Create Payment API

This document provides detailed information about the payment creation endpoint in the Payment API Proxy.

## Endpoint

```
POST /functions/v1/payment-api
```

## Overview

The Create Payment API allows you to create payment requests that are automatically routed to the Payment Manager provider. The API supports multi-chain payment processing across Ethereum, Solana, Stellar, Polygon, and other blockchain networks with automatic token address mapping and optional token address overrides.

## Key Features

- **Single Provider**: All payments are routed to Payment Manager
- **Multi-Chain Support**: Supports Ethereum, Solana, Stellar, Polygon, Base, and other chains
- **Token Mapping**: Automatic token address mapping with override capability
- **Unified Response Format**: Consistent response format across all chains
- **No Withdrawal Integration**: Payment Manager handles payments without automatic withdrawal

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

### Request Body Schema

```typescript
{
  display: {
    intent: string;           // Human-readable payment description
    currency: string;         // Currency code (e.g., "USD", "EUR")
  };
  preferredChain: string;     // Chain ID for payment routing
  preferredToken: string;     // Preferred token for payment processing
  preferredTokenAddress?: string; // Optional: Explicit token address (overrides automatic mapping)
  destination: {
    destinationAddress: string;  // Final recipient address
    chainId: string;            // Destination chain ID
    amountUnits: string;        // Payment amount (must be > 0)
    tokenSymbol?: string;       // Destination token symbol
    tokenAddress?: string;      // Destination token contract address
  };
  metadata?: object;            // Optional additional data
}
```

### Field Descriptions

| Field                            | Type   | Required | Description                                          | Example                                                         |
| -------------------------------- | ------ | -------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `display.intent`                 | string | ✅       | Human-readable payment description                   | "Coffee purchase"                                               |
| `display.currency`               | string | ✅       | Currency code                                        | "USD", "EUR"                                                    |
| `preferredChain`                 | string | ✅       | Chain ID for payment processing                      | "1500", "900", "1"                                              |
| `preferredToken`                 | string | ✅       | Token to use for payment                             | "USDC", "USDC_XLM", "XLM"                                       |
| `preferredTokenAddress`          | string | ❌       | Explicit token address (overrides automatic mapping) | "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" |
| `destination.destinationAddress` | string | ✅       | Final recipient address                              | "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU"      |
| `destination.chainId`            | string | ✅       | Destination chain ID                                 | "1500", "900", "1"                                              |
| `destination.amountUnits`        | string | ✅       | Payment amount                                       | "0.01" (decimal format)                                         |
| `destination.tokenSymbol`        | string | ❌       | Destination token symbol                             | "USDC_XLM", "XLM", "USDC"                                       |
| `destination.tokenAddress`       | string | ❌       | Destination token contract address                   | "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" |
| `metadata`                       | object | ❌       | Additional payment metadata                          | `{"orderId": "12345"}`                                          |
| `metadata.webhookUrl`            | string | ❌       | Custom webhook URL for payment notifications         | `"https://your-app.com/webhooks/payment"`                       |
| `metadata.externalId`            | string | ❌       | External reference ID for the payment                | `"ext_123"`                                                     |

## Payment Routing Logic

### Payment Manager Provider (All Chains)

All payments are routed to Payment Manager regardless of chain ID:

| Chain ID   | Name            | Supported Tokens        | Token Addresses                                                       |
| ---------- | --------------- | ----------------------- | --------------------------------------------------------------------- |
| `1`        | Ethereum        | ETH, USDC, USDT, etc.   | USDC: `0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8C`                  |
| `11155111` | Sepolia         | ETH, USDC, USDT, etc.   | USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`                    |
| `10`       | Optimism        | ETH, USDC, USDT, etc.   | USDC: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`                    |
| `137`      | Polygon         | MATIC, USDC, USDT, etc. | USDC: `0x83ACD773450269b6c141F830192fd07748c0a8b1`                    |
| `80001`    | Mumbai          | MATIC, USDC, USDT, etc. | USDC: `0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747`                    |
| `42161`    | Arbitrum        | ETH, USDC, USDT, etc.   | USDC: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8`                    |
| `8453`     | Base            | ETH, USDC, USDT, etc.   | USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`                    |
| `56`       | BSC             | BNB, USDC, USDT, etc.   | USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`                    |
| `1500`     | Stellar         | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| `1501`     | Stellar Testnet | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| `900`      | Solana          | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  |
| `901`      | Solana Devnet   | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  |

## Token Address Mapping

The system automatically maps token symbols to their corresponding addresses based on the chain. You can override this behavior by providing the `preferredTokenAddress` field.

### Automatic Token Mapping

- **Stellar (1500, 1501)**:
  - `XLM` → `XLM`
  - `USDC_XLM` or `USDC` → `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`

- **Solana (900, 901)**:
  - `USDC` → `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

- **EVM Chains (1, 10, 137, etc.)**:
  - `USDC` → Chain-specific USDC address (see table above)

## Response Format

### Success Response (201)

```json
{
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "status": "payment_unpaid",
  "createdAt": "2025-08-14T05:17:29.583+00:00",
  "display": {
    "intent": "Stellar USDC Payment",
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
    "provider": "payment-manager",
    "preferred_chain": "1500",
    "preferred_token": "USDC_XLM",
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc"
}
```

### Payment Status Values

- `payment_unpaid` - Payment created but not yet initiated
- `payment_started` - Payment has been initiated but not completed
- `payment_completed` - Payment has been successfully completed
- `payment_bounced` - Payment failed or was rejected
- `payment_refunded` - Payment has been refunded

## Examples

### Example 1: Stellar USDC Payment

**Request:**

```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Stellar USDC payment",
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
      "orderId": "order_12345",
      "webhookUrl": "https://your-app.com/webhooks/payment"
    }
  }'
```

**Response:**

```json
{
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "status": "payment_unpaid",
  "createdAt": "2025-08-14T05:17:29.583+00:00",
  "display": {
    "intent": "Stellar USDC payment",
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
    "orderId": "order_12345",
    "provider": "payment-manager",
    "preferred_chain": "1500",
    "preferred_token": "USDC_XLM",
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc"
}
```

### Example 2: Solana USDC Payment

**Request:**

```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Solana USDC payment",
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

### Example 3: Ethereum USDC Payment

**Request:**

```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Ethereum USDC payment",
      "currency": "USD"
    },
    "preferredChain": "1",
    "preferredToken": "USDC",
    "preferredTokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8C",
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "1",
      "amountUnits": "1000000",
      "tokenSymbol": "USDC",
      "tokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8C"
    },
    "metadata": {
      "orderId": "defi_001",
      "protocol": "uniswap"
    }
  }'
```

## Error Responses

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "message": "Amount must be a positive number",
  "details": {
    "field": "destination.amountUnits",
    "code": "INVALID_AMOUNT"
  }
}
```

### Provider Error (502)

```json
{
  "error": "Payment creation failed",
  "message": "Payment Manager API error 500: Failed to create payment"
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payment Manager Configuration
PAYMENT_MANAGER_BASE_URL=https://rozo-payment-manager.example.com
PAYMENT_MANAGER_API_KEY=your-payment-manager-api-key
PAYMENT_MANAGER_WEBHOOK_TOKEN=your-payment-manager-webhook-token

# CORS Configuration
CORS_ORIGINS=https://your-app.com,https://yourdomain.com
```

## Webhook Integration

Upon payment status changes, the Payment Manager sends webhooks to notify about payment updates:

1. **Receives webhook** from Payment Manager
2. **Updates payment status** in database
3. **Processes payment metadata** (receiving address, memo, etc.)

### Payment Manager Webhook Structure

```json
{
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
}
```

## SDK Examples

### TypeScript

```typescript
interface CreatePaymentRequest {
  display: {
    intent: string;
    currency: string;
  };
  preferredChain: string;
  preferredToken: string;
  preferredTokenAddress?: string;
  destination: {
    destinationAddress: string;
    chainId: string;
    amountUnits: string;
    tokenSymbol?: string;
    tokenAddress?: string;
  };
  metadata?: Record<string, any>;
}

async function createPayment(paymentData: CreatePaymentRequest) {
  const response = await fetch('/functions/v1/payment-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer YOUR_SUPABASE_ANON_KEY',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Stellar USDC Payment Example
const stellarPayment = await createPayment({
  display: {
    intent: 'Stellar USDC payment',
    currency: 'USD',
  },
  preferredChain: '1500', // Stellar
  preferredToken: 'USDC_XLM',
  preferredTokenAddress: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  destination: {
    destinationAddress: 'GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU',
    chainId: '1500', // Stellar
    amountUnits: '0.01', // 0.01 USDC
    tokenSymbol: 'USDC_XLM',
    tokenAddress: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
  metadata: {
    orderId: 'order_12345',
    webhookUrl: 'https://your-app.com/webhooks/payment',
  },
});

// Solana USDC Payment Example
const solanaPayment = await createPayment({
  display: {
    intent: 'Solana USDC payment',
    currency: 'USD',
  },
  preferredChain: '900', // Solana
  preferredToken: 'USDC',
  preferredTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destination: {
    destinationAddress: 'BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC',
    chainId: '900', // Solana
    amountUnits: '25.00', // 25 USDC
    tokenSymbol: 'USDC',
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  metadata: {
    orderId: 'nft_001',
    nftId: 'nft_12345',
  },
});
```

## Best Practices

1. **Use appropriate chain IDs** for your target blockchain
2. **Include meaningful metadata** for tracking and debugging
3. **Handle webhook notifications** for payment status updates
4. **Implement proper error handling** for provider failures
5. **Store payment IDs** for future reference
6. **Use decimal format for amounts** (e.g., "0.01" instead of microunits)
7. **Provide explicit token addresses** when needed for custom tokens
8. **Include webhook URLs** in metadata for payment notifications

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit information included in response headers
- **Exceeded Response**: 429 status code with retry information

## Related Endpoints

- [Get Payment by ID](./get-payment-api.md)
- [Get Payment by External ID](./get-payment-external-api.md)
- [Webhook Handler](./webhook-handler-api.md)
- [Health Check](./health-check-api.md)
