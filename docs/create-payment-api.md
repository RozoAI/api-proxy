# Create Payment API Interface

## Endpoint

**POST** `/api/payment`

## Description

Creates a new payment request and routes it to the appropriate provider (Daimo Pay or Aqua) based on the blockchain chain ID specified in the request.

## Request Format

```json
{
  "display": {
    "intent": "string",
    "paymentValue": "string",
    "currency": "string"
  },
  "destination": {
    "destinationAddress": "string",
    "chainId": "string",
    "amountUnits": "string",
    "tokenSymbol": "string (required for Aqua chains, optional for Daimo chains)",
    "tokenAddress": "string (required for Daimo chains, optional for Aqua chains)"
  },
  "externalId": "string (optional)",
  "metadata": "object (optional)"
}
```

## Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display.intent` | string | Yes | Human-readable description of the payment |
| `display.paymentValue` | string | Yes | Display value of the payment (e.g., "10.50") |
| `display.currency` | string | Yes | Currency code (e.g., "USD", "XLM") |
| `destination.destinationAddress` | string | Yes | Recipient's blockchain address |
| `destination.chainId` | string | Yes | Blockchain chain ID (determines provider routing) |
| `destination.amountUnits` | string | Yes | Payment amount in smallest units (e.g., "1050000000" for 10.5 tokens) |
| `destination.tokenSymbol` | string | Required for Aqua chains, optional for Daimo chains | Token symbol (e.g., "XLM", "USDC") |
| `destination.tokenAddress` | string | Required for Daimo chains, optional for Aqua chains | Token contract address (empty string for native tokens) |
| `externalId` | string | No | External reference ID for tracking |
| `metadata` | object | No | Additional metadata for the payment |

## Response Format

```json
{
  "id": "string",
  "status": "payment_unpaid|payment_started|payment_completed|payment_bounced",
  "createdAt": "string (ISO 8601)",
  "display": {
    "intent": "string",
    "paymentValue": "string",
    "currency": "string"
  },
  "source": {
    "payerAddress": "string",
    "txHash": "string",
    "chainId": "string",
    "amountUnits": "string",
    "tokenSymbol": "string",
    "tokenAddress": "string"
  } | null,
  "destination": {
    "destinationAddress": "string",
    "txHash": "string | null",
    "chainId": "string",
    "amountUnits": "string",
    "tokenSymbol": "string",
    "tokenAddress": "string"
  },
  "externalId": "string (optional)",
  "metadata": "object (optional)",
  "url": "string (optional)"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique payment identifier |
| `status` | string | Payment status (see status values below) |
| `createdAt` | string | ISO 8601 timestamp of payment creation |
| `display` | object | Display information (same as request) |
| `source` | object/null | Source payment details (null if not yet paid) |
| `source.payerAddress` | string | Payer's blockchain address |
| `source.txHash` | string | Source transaction hash |
| `source.chainId` | string | Source chain ID |
| `source.amountUnits` | string | Source amount in smallest units |
| `source.tokenSymbol` | string | Source token symbol |
| `source.tokenAddress` | string | Source token address |
| `destination` | object | Destination payment details |
| `destination.destinationAddress` | string | Recipient's address |
| `destination.txHash` | string/null | Destination transaction hash (null if not yet processed) |
| `destination.chainId` | string | Destination chain ID |
| `destination.amountUnits` | string | Destination amount in smallest units |
| `destination.tokenSymbol` | string | Destination token symbol |
| `destination.tokenAddress` | string | Destination token address |
| `externalId` | string | External reference ID (if provided) |
| `metadata` | object | Additional metadata (if provided) |
| `url` | string | Payment URL for user interaction (if available) |

## Payment Status Values

- `payment_unpaid`: Payment created but not yet initiated
- `payment_started`: Payment has been initiated but not completed
- `payment_completed`: Payment has been successfully completed
- `payment_bounced`: Payment failed or was rejected

## Chain ID Routing

The system automatically routes requests to providers based on chain IDs:

### Daimo Provider
- Chain ID 1: Ethereum Mainnet
- Chain ID 10: Optimism
- Chain ID 137: Polygon
- Chain ID 42161: Arbitrum One

### Aqua Provider
- Chain ID 10001: Stellar (XLM and USDC_XLM tokens)

## Token Field Requirements

The `tokenSymbol` and `tokenAddress` fields have different requirements based on the chain type:

### For Aqua Chains (Chain ID 10001)
- **`tokenSymbol`**: Required - Must specify the token symbol (e.g., "XLM", "USDC_XLM")
- **`tokenAddress`**: Optional - Can be omitted or set to empty string

### For Daimo Chains (Chain IDs 1, 10, 137, 42161)
- **`tokenSymbol`**: Optional - Can be omitted for native tokens
- **`tokenAddress`**: Required - Must specify the token contract address (use empty string for native tokens like ETH)

## Example Requests

### Aqua Chain Example (Stellar XLM)
```json
{
  "display": {
    "intent": "Payment for coffee",
    "paymentValue": "5.00",
    "currency": "USD"
  },
  "destination": {
    "destinationAddress": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "chainId": "10001",
    "amountUnits": "5000000000",
    "tokenSymbol": "XLM"
  },
  "externalId": "order_12345",
  "metadata": {
    "orderId": "12345",
    "customerId": "user_789"
  }
}
```

### Daimo Chain Example (Ethereum USDC)
```json
{
  "display": {
    "intent": "Payment for coffee",
    "paymentValue": "5.00",
    "currency": "USD"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "chainId": "1",
    "amountUnits": "5000000",
    "tokenAddress": "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8"
  },
  "externalId": "order_12346",
  "metadata": {
    "orderId": "12346",
    "customerId": "user_789"
  }
}
```

## Example Response

```json
{
  "id": "pay_1234567890abcdef",
  "status": "payment_unpaid",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "display": {
    "intent": "Payment for coffee",
    "paymentValue": "5.00",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "5000000000",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "order_12345",
  "metadata": {
    "orderId": "12345",
    "customerId": "user_789"
  },
  "url": "https://aqua.com/pay/pay_1234567890abcdef"
}
```

## Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

## Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `invalid_request` | Invalid request structure | 400 |
| `invalid_chain_id` | Invalid or unsupported chain ID | 400 |
| `provider_unavailable` | No provider available for the chain | 400 |
| `provider_error` | Provider-specific error | 400 |
| `validation_error` | Request validation failed | 400 |

## cURL Example

```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Test payment",
      "paymentValue": "1.00",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "chainId": "10001",
      "amountUnits": "1000000000",
      "tokenSymbol": "XLM"
    }
  }'
``` 