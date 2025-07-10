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
    "tokenSymbol": "string",
    "tokenAddress": "string",
    "callData": "string (optional)"
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
| `destination.tokenSymbol` | string | Yes | Token symbol (e.g., "XLM", "USDC") |
| `destination.tokenAddress` | string | Yes | Token contract address (empty string for native tokens) |
| `destination.callData` | string | No | Additional transaction data |
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
    "tokenAddress": "string",
    "callData": "string"
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
| `destination.callData` | string | Additional transaction data |
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

## Example Request

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
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "order_12345",
  "metadata": {
    "orderId": "12345",
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
    "tokenAddress": "",
    "callData": ""
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
      "tokenSymbol": "XLM",
      "tokenAddress": ""
    }
  }'
``` 