# Create Payment API

This document provides detailed information about the payment creation endpoint in the Payment API Proxy.

## Endpoint

```
POST /functions/v1/payment-api
```

## Overview

The Create Payment API allows you to create payment requests that are automatically routed to the appropriate blockchain provider (Daimo or Aqua) based on the specified `preferredChain`. The API supports cross-chain payment processing with automatic withdrawal integration, including special handling for USDC_XLM tokens that converts Base USDC payments to Stellar XLM withdrawals.

## Key Features

- **Multi-Provider Routing**: Automatically routes to Daimo (EVM chains) or Aqua (Stellar) based on `preferredChain`
- **USDC_XLM Conversion**: Converts USDC_XLM requests to Base USDC payments with Stellar XLM withdrawal
- **Withdrawal Integration**: Automatically triggers withdrawals to destination addresses after successful payment
- **Unified Response Format**: Consistent response format across all providers

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
  preferredChain: string;     // Chain ID for payment routing (determines provider)
  preferredToken: string;     // Preferred token for payment processing
  destination: {
    destinationAddress: string;  // Final recipient address (for withdrawal)
    chainId: string;            // Destination chain ID (for withdrawal)
    amountUnits: string;        // Payment amount (must be > 0)
    tokenSymbol?: string;       // Destination token symbol
    tokenAddress?: string;      // Destination token contract address
  };
  metadata?: object;            // Optional additional data
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `display.intent` | string | ✅ | Human-readable payment description | "Coffee purchase" |
| `display.currency` | string | ✅ | Currency code | "USD", "EUR" |
| `preferredChain` | string | ✅ | Chain ID for payment processing | "10", "10001" |
| `preferredToken` | string | ✅ | Token to use for payment | "USDC", "XLM" |
| `destination.destinationAddress` | string | ✅ | Final recipient address | "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP" |
| `destination.chainId` | string | ✅ | Destination chain ID | "10001", "8453" |
| `destination.amountUnits` | string | ✅ | Payment amount | "5000000" (microunits) |
| `destination.tokenSymbol` | string | ❌ | Destination token symbol | "USDC_XLM", "XLM", "USDC" |
| `destination.tokenAddress` | string | ❌ | Destination token contract address | "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" |
| `metadata` | object | ❌ | Additional payment metadata | `{"orderId": "12345"}` |

## Payment Routing Logic

### Daimo Provider (EVM Chains)
Routes when `preferredChain` is an EVM chain ID:

| Chain ID | Name | Supported Tokens |
|----------|------|------------------|
| `1` | Ethereum | ETH, USDC, USDT, etc. |
| `10` | Optimism | ETH, USDC, USDT, etc. |
| `137` | Polygon | MATIC, USDC, USDT, etc. |
| `42161` | Arbitrum | ETH, USDC, USDT, etc. |
| `8453` | Base | ETH, USDC, USDT, etc. |

### Aqua Provider (Stellar)
Routes when `preferredChain` is `"10001"`:

| Chain ID | Name | Supported Tokens |
|----------|------|------------------|
| `10001` | Stellar | XLM, USDC_XLM |

## Special Handling: USDC_XLM Conversion

When `destination.tokenSymbol` is `"USDC_XLM"`, the system performs a two-stage process:

### Stage 1: Payment Processing (via Daimo)
- Converts destination to USDC Base address from `USDC_BASE_ADDRESS` environment variable
- Processes payment as USDC on Base chain (Chain ID: 8453)
- Stores original Stellar destination in metadata

### Stage 2: Withdrawal (via Webhook)
- Upon successful payment completion, webhook handler detects USDC_XLM conversion
- Calls withdrawal API to convert Base USDC to Stellar XLM
- Sends to original Stellar destination address

```mermaid
graph TD
    A[USDC_XLM Request] --> B[Route to Daimo]
    B --> C[Convert to Base USDC Address]
    C --> D[Process Payment on Base]
    D --> E[Payment Success Webhook]
    E --> F[Detect USDC_XLM Conversion]
    F --> G[Call Withdrawal API]
    G --> H[Convert to Stellar XLM]
    H --> I[Send to Original Stellar Address]
```

## Response Format

### Success Response (201)

```json
{
  "id": "payment_abc123",
  "status": "payment_unpaid",
  "createdAt": "1703123456",
  "display": {
    "intent": "USDC_XLM Payment",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "txHash": null,
    "chainId": "8453",
    "amountUnits": "5000000",
    "tokenSymbol": "USDC",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  "externalId": "ext_123",
  "metadata": {
    "preferred_chain": "10",
    "preferred_token": "USDC",
    "is_usdc_xlm_conversion": "true",
    "withdrawal_destination": "{\"address\":\"GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP\",\"chainId\":\"10001\",\"tokenSymbol\":\"USDC_XLM\",\"isUSDCXLM\":true}"
  },
  "url": "https://pay.daimo.com/payment/payment_abc123"
}
```

### Payment Status Values

- `payment_unpaid` - Payment created but not yet initiated
- `payment_started` - Payment has been initiated but not completed
- `payment_completed` - Payment has been successfully completed
- `payment_bounced` - Payment failed or was rejected
- `payment_refunded` - Payment has been refunded

## Examples

### Example 1: USDC_XLM Payment (Optimism → Base → Stellar)

**Request:**
```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Cross-chain payment to Stellar",
      "currency": "USD"
    },
    "preferredChain": "10",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
      "chainId": "10001",
      "amountUnits": "5000000",
      "tokenSymbol": "USDC_XLM"
    },
    "metadata": {
      "orderId": "order_12345"
    }
  }'
```

**Response:**
```json
{
  "id": "daimo_payment_1703123456",
  "status": "payment_unpaid",
  "createdAt": "1703123456000",
  "display": {
    "intent": "Cross-chain payment to Stellar",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "txHash": null,
    "chainId": "8453",
    "amountUnits": "5000000",
    "tokenSymbol": "USDC",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  "externalId": "daimo_ext_123",
  "metadata": {
    "orderId": "order_12345",
    "preferred_chain": "10",
    "preferred_token": "USDC",
    "is_usdc_xlm_conversion": "true",
    "withdrawal_destination": "{\"address\":\"GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP\",\"chainId\":\"10001\",\"tokenSymbol\":\"USDC_XLM\",\"isUSDCXLM\":true}"
  },
  "url": "https://pay.daimo.com/payment/daimo_payment_1703123456"
}
```

### Example 2: Direct Stellar Payment (Aqua)

**Request:**
```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Direct Stellar XLM payment",
      "currency": "USD"
    },
    "preferredChain": "10001",
    "preferredToken": "XLM",
    "destination": {
      "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
      "chainId": "10001",
      "amountUnits": "10000000",
      "tokenSymbol": "XLM"
    }
  }'
```

**Response:**
```json
{
  "id": "aqua_invoice_1703123456",
  "status": "payment_unpaid",
  "createdAt": "1703123456000",
  "display": {
    "intent": "Direct Stellar XLM payment",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "10000000",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "aqua_invoice_1703123456",
  "metadata": {
    "preferred_chain": "10001",
    "preferred_token": "XLM",
    "aqua_invoice_id": "aqua_invoice_1703123456"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1703123456"
}
```

### Example 3: Regular EVM Payment (Optimism)

**Request:**
```bash
curl -X POST "http://localhost:54321/functions/v1/payment-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "display": {
      "intent": "Regular USDC payment on Optimism",
      "currency": "USD"
    },
    "preferredChain": "10",
    "preferredToken": "USDC",
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "chainId": "10",
      "amountUnits": "5000000",
      "tokenAddress": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      "tokenSymbol": "USDC"
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
  "message": "Daimo API error 500: {\"error\":\"Failed to generate order. TRPCClientError: UNAUTHORIZED\"}"
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Daimo Configuration
DAIMO_BASE_URL=https://pay.daimo.com
DAIMO_API_KEY=your-daimo-api-key

# Aqua Configuration  
AQUA_BASE_URL=https://api.aqua.network
AQUA_API_TOKEN=your-aqua-api-token
AQUA_XLM_ADDRESS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AQUA_USDC_XLM_ADDRESS=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# USDC_XLM Conversion
USDC_BASE_ADDRESS=0xA0b86a33E6411e3036C4E602F654bA16f98Cc9d1

# Withdrawal Integration
WITHDRAWAL_API_BASE_URL=your-withdrawal-api-url
WITHDRAWAL_API_TOKEN=your-withdrawal-api-token
WITHDRAWAL_INTEGRATION_ENABLED=true
```

## Webhook Integration

Upon successful payment completion, the system automatically:

1. **Receives webhook** from payment provider (Daimo/Aqua)
2. **Updates payment status** in database
3. **Checks for USDC_XLM conversion** in metadata
4. **Triggers withdrawal** if conversion is detected

### USDC_XLM Withdrawal Payload

```json
{
  "amount": "5.00",
  "to_address": "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
  "chain": "stellar",
  "token": "XLM",
  "original_payment_id": "daimo_payment_1703123456",
  "conversion_type": "usdc_base_to_xlm_stellar"
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
      'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// USDC_XLM Payment Example
const usdcXlmPayment = await createPayment({
  display: {
    intent: "Cross-chain payment to Stellar",
    currency: "USD"
  },
  preferredChain: "10", // Optimism
  preferredToken: "USDC",
  destination: {
    destinationAddress: "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
    chainId: "10001", // Stellar
    amountUnits: "5000000", // 5 USDC in microunits
    tokenSymbol: "USDC_XLM"
  },
  metadata: {
    orderId: "order_12345"
  }
});
```

## Best Practices

1. **Use USDC_XLM for cross-chain payments** from EVM to Stellar
2. **Include meaningful metadata** for tracking and debugging
3. **Handle webhook notifications** for payment status updates
4. **Implement proper error handling** for provider failures
5. **Store payment IDs** for future reference and withdrawal tracking
6. **Use appropriate amount units** (typically microunits for precision)

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit information included in response headers
- **Exceeded Response**: 429 status code with retry information

## Related Endpoints

- [Get Payment by ID](./get-payment-api.md)
- [Get Payment by External ID](./get-payment-external-api.md)
- [Webhook Handler](./webhook-handler-api.md)
- [Health Check](./health-check-api.md) 