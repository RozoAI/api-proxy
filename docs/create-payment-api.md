# Create Payment API

This document provides detailed information about the payment creation endpoint in the Payment API Proxy.

## Endpoint

```
POST /functions/v1/payment-api
```

## Overview

The Create Payment API allows you to create payment requests that are automatically routed to the appropriate blockchain provider (Daimo or Aqua) based on the specified chain ID. The API maintains a consistent Daimo Pay format for all responses while supporting multiple blockchain networks.

**New Feature**: The API now supports `appId` configuration, allowing different applications to have their own payout addresses and token configurations.

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (optional)
```

### Request Body Schema

```typescript
{
  display: {
    intent: string;           // Human-readable payment description
    currency: string;         // Currency code (e.g., "USD", "EUR")
  };
  destination: {
    destinationAddress?: string;  // Recipient address (optional if appId provided)
    chainId: string;            // Blockchain chain ID
    amountUnits: string;        // Payment amount (must be > 0)
    tokenSymbol?: string;       // Token symbol (required for Aqua)
    tokenAddress?: string;      // Token contract address (required for EVM chains)
  };
  metadata?: object;            // Optional additional data
  appId?: string;               // Application ID for payout configuration
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `display.intent` | string | ✅ | Human-readable payment description | "Coffee purchase" |
| `display.currency` | string | ✅ | Currency code | "USD", "EUR" |
| `destination.destinationAddress` | string | ❌ | Recipient address (auto-filled from appId) | "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6" |
| `destination.chainId` | string | ✅ | Blockchain chain ID | "1", "10", "10001" |
| `destination.amountUnits` | string | ✅ | Payment amount (must be > 0) | "10.50" |
| `destination.tokenSymbol` | string | ❌ | Token symbol | "ETH", "USDC", "XLM" |
| `destination.tokenAddress` | string | ❌ | Token contract address | "0x0000000000000000000000000000000000000000" |
| `metadata` | object | ❌ | Additional payment metadata | `{"orderId": "12345"}` |
| `appId` | string | ❌ | Application ID for payout config | "rozoDemoStellar" |

## AppId Configuration

### Supported App IDs

| App ID | Name | Payout Token | Payout Address | Payout Chain |
|--------|------|--------------|----------------|--------------|
| `rozoDemoStellar` | Rozo Demo Stellar | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |
| `rozopayStellar` | Rozo Pay Stellar | USDC_BASE | `0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897` | Base (8453) |
| `rozoInvoiceStellar` | Rozo Invoice Stellar | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |
| `rozoInvoice` | Rozo Invoice | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |
| `rozoDemo` | Rozo Demo | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |
| `rozoTestStellar` | Rozo Test Stellar | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |
| `rozoTest` | Rozo Test | Stellar | `GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ` | Stellar (10001) |

### Domain to App ID Mapping

| Domain | Default App ID |
|--------|----------------|
| `invoice.rozo.ai` | `rozoInvoiceStellar` |
| `demo.rozo.ai` | `rozoDemoStellar` |
| `test.rozo.ai` | `rozoTestStellar` |
| Default | `rozoTestStellar` |

### AppId Behavior

When `appId` is provided:

1. **Automatic Payout Address**: If `destinationAddress` is not provided, the app's payout address is automatically used
2. **Token Configuration**: App-specific token configurations are applied
3. **Metadata Tracking**: App information is added to payment metadata
4. **Validation**: App ID is validated and app must be enabled

## Supported Chains and Providers

### Daimo Provider (EVM Chains)

| Chain | ID | Name | Required Fields | Supported Tokens |
|-------|----|------|-----------------|------------------|
| Ethereum | `1` | Ethereum Mainnet | `tokenAddress` | ETH, USDC, USDT, etc. |
| Optimism | `10` | Optimism | `tokenAddress` | ETH, USDC, USDT, etc. |
| Polygon | `137` | Polygon | `tokenAddress` | MATIC, USDC, USDT, etc. |
| Arbitrum | `42161` | Arbitrum One | `tokenAddress` | ETH, USDC, USDT, etc. |
| Base | `8453` | Base | `tokenAddress` | ETH, USDC, USDT, etc. |
| BSC | `56` | BNB Smart Chain | `tokenAddress` | BNB, USDC, USDT, etc. |
| Avalanche | `43114` | Avalanche | `tokenAddress` | AVAX, USDC, USDT, etc. |
| Fantom | `250` | Fantom | `tokenAddress` | FTM, USDC, USDT, etc. |
| Filecoin | `314` | Filecoin | `tokenAddress` | FIL, USDC, USDT, etc. |
| Celo | `42220` | Celo | `tokenAddress` | CELO, USDC, USDT, etc. |
| Gnosis | `100` | Gnosis | `tokenAddress` | xDAI, USDC, USDT, etc. |
| Polygon zkEVM | `1101` | Polygon zkEVM | `tokenAddress` | ETH, USDC, USDT, etc. |
| Linea | `59144` | Linea | `tokenAddress` | ETH, USDC, USDT, etc. |
| Mantle | `5000` | Mantle | `tokenAddress` | MNT, USDC, USDT, etc. |
| Scroll | `534352` | Scroll | `tokenAddress` | ETH, USDC, USDT, etc. |
| zkSync | `324` | zkSync Era | `tokenAddress` | ETH, USDC, USDT, etc. |

### Aqua Provider (Stellar)

| Chain | ID | Name | Required Fields | Supported Tokens |
|-------|----|------|-----------------|------------------|
| Stellar | `10001` | Stellar | `tokenSymbol` | XLM, USDC_XLM |

## Response Format

### Success Response (201)

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
    "appId": "rozoDemoStellar",
    "payoutToken": "stellar",
    "payoutAddress": "GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ"
  },
  "url": "https://checkout.example.com/payment_abc123",
  "appId": "rozoDemoStellar"
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique payment identifier |
| `status` | string | Current payment status |
| `createdAt` | string | Payment creation timestamp (Unix) |
| `display` | object | Payment display information |
| `source` | object/null | Source payment details (null until payment starts) |
| `destination` | object | Destination payment details |
| `externalId` | string/null | External provider payment ID |
| `metadata` | object | Payment metadata (includes appId info) |
| `url` | string | Payment checkout URL |
| `appId` | string | Application ID used for this payment |

### Payment Status Values

- `payment_unpaid` - Payment created but not yet initiated
- `payment_started` - Payment has been initiated but not completed
- `payment_completed` - Payment has been successfully completed
- `payment_bounced` - Payment failed or was rejected
- `payment_refunded` - Payment has been refunded

## Error Responses

### Validation Error (400)

```json
{
  "error": "Validation failed",
  "message": "Invalid appId: invalidAppId"
}
```

### App Disabled Error (400)

```json
{
  "error": "Payment creation failed",
  "message": "App rozoDemoStellar is disabled"
}
```

### Provider Error (502)

```json
{
  "error": "Provider unavailable",
  "message": "Daimo Pay service is currently unavailable",
  "details": {
    "provider": "daimo",
    "code": "PROVIDER_UNAVAILABLE",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Internal Error (500)

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "details": {
    "code": "INTERNAL_ERROR",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Examples

### Example 1: Payment with AppId (Automatic Payout Address)

**Request:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase at Starbucks",
      "currency": "USD"
    },
    "destination": {
      "chainId": "10001",
      "amountUnits": "5.50",
      "tokenSymbol": "XLM"
    },
    "appId": "rozoDemoStellar",
    "metadata": {
      "store": "Starbucks Downtown",
      "orderId": "SB-12345"
    }
  }'
```

**Response:**
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_unpaid",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Coffee purchase at Starbucks",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "5.50",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "starbucks_order_12345",
  "metadata": {
    "store": "Starbucks Downtown",
    "orderId": "SB-12345",
    "appId": "rozoDemoStellar",
    "payoutToken": "stellar",
    "payoutAddress": "GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789",
  "appId": "rozoDemoStellar"
}
```

### Example 2: Payment with Custom Address (AppId for Tracking)

**Request:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Custom payment",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "chainId": "1",
      "amountUnits": "10.00",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "appId": "rozopayStellar",
    "metadata": {
      "orderId": "CUSTOM-123"
    }
  }'
```

**Response:**
```json
{
  "id": "daimo_1699123456789_abc123def",
  "status": "payment_unpaid",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Custom payment",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": null,
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "USDC",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "custom_order_123",
  "metadata": {
    "orderId": "CUSTOM-123",
    "appId": "rozopayStellar",
    "payoutToken": "USDC_BASE",
    "payoutAddress": "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def",
  "appId": "rozopayStellar"
}
```

### Example 3: Payment without AppId (Uses Default)

**Request:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Test payment",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "chainId": "1",
      "amountUnits": "1.00",
      "tokenAddress": "0x0000000000000000000000000000000000000000"
    }
  }'
```

**Response:**
```json
{
  "id": "daimo_1699123456789_def456ghi",
  "status": "payment_unpaid",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Test payment",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": null,
    "chainId": "1",
    "amountUnits": "1.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "externalId": "test_payment_456",
  "metadata": {
    "appId": "rozoTestStellar",
    "payoutToken": "stellar",
    "payoutAddress": "GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_def456ghi",
  "appId": "rozoTestStellar"
}
```

## Validation Rules

### Amount Validation
- Must be a positive number
- Must be greater than 0
- Supports decimal values
- Maximum precision depends on the token

### Address Validation
- **Ethereum addresses**: Must be valid 0x-prefixed hex string (40 characters)
- **Stellar addresses**: Must be valid G-prefixed base32 string (56 characters)

### Chain ID Validation
- Must be a supported chain ID
- Must match the provider requirements

### Token Validation
- **EVM chains**: `tokenAddress` is required and must be valid contract address
- **Stellar**: `tokenSymbol` is required and must be supported (XLM, USDC_XLM)

### AppId Validation
- Must be a valid app ID from the supported list
- App must be enabled
- If not provided, defaults to `rozoTestStellar`

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit information included in response headers
- **Exceeded Response**: 429 status code with retry information

## Best Practices

1. **Always validate amounts** before sending requests
2. **Use appropriate token addresses** for EVM chains
3. **Include meaningful metadata** for tracking
4. **Handle webhook notifications** for payment status updates
5. **Implement retry logic** for failed requests
6. **Store payment IDs** for future reference
7. **Use appId for automatic payout configuration**
8. **Validate appId** before making requests

## SDK Examples

### JavaScript/TypeScript

```typescript
interface CreatePaymentRequest {
  display: {
    intent: string;
    currency: string;
  };
  destination: {
    destinationAddress?: string;
    chainId: string;
    amountUnits: string;
    tokenSymbol?: string;
    tokenAddress?: string;
  };
  metadata?: Record<string, any>;
  appId?: string;
}

async function createPayment(paymentData: CreatePaymentRequest) {
  const response = await fetch('/functions/v1/payment-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Example usage with appId
const payment = await createPayment({
  display: {
    intent: "Coffee purchase",
    currency: "USD"
  },
  destination: {
    chainId: "10001",
    amountUnits: "5.50",
    tokenSymbol: "XLM"
  },
  appId: "rozoDemoStellar",
  metadata: {
    orderId: "12345"
  }
});
```

### Python

```python
import requests
from typing import Dict, Any

def create_payment(payment_data: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(
        '/functions/v1/payment-api',
        headers={'Content-Type': 'application/json'},
        json=payment_data
    )
    response.raise_for_status()
    return response.json()

# Example usage with appId
payment = create_payment({
    "display": {
        "intent": "Coffee purchase",
        "currency": "USD"
    },
    "destination": {
        "chainId": "10001",
        "amountUnits": "5.50",
        "tokenSymbol": "XLM"
    },
    "appId": "rozoDemoStellar",
    "metadata": {
        "orderId": "12345"
    }
})
```

## Related Endpoints

- [Get Payment by ID](./get-payment-api.md)
- [Get Payment by External ID](./get-payment-external-api.md)
- [Webhook Handler](./webhook-handler-api.md)
- [Health Check](./health-check-api.md) 