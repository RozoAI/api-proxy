# Create Payment API Documentation

## Overview
Creates a new payment request through the Payment API Proxy. The API automatically routes the request to the appropriate provider (Daimo or Aqua) based on the chain ID.

## Endpoint
```
POST /api/payment
```

## Request Format

### Request Body Schema
```json
{
  "display": {
    "intent": "string",
    "currency": "string"
  },
  "destination": {
    "destinationAddress": "string",
    "chainId": "string", 
    "amountUnits": "string",
    "tokenSymbol": "string",
    "tokenAddress": "string"
  },
  "externalId": "string",
  "metadata": {}
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display.intent` | string | Yes | Human-readable description of the payment |
| `display.currency` | string | Yes | Currency code (e.g., "USD", "EUR") |
| `destination.destinationAddress` | string | Yes | Recipient wallet address |
| `destination.chainId` | string | Yes | Blockchain chain ID (determines provider routing) |
| `destination.amountUnits` | string | Yes | Payment amount in regular decimal units (e.g., "10.50") |
| `destination.tokenSymbol` | string | Conditional | Token symbol (required for Aqua/Stellar chains) |
| `destination.tokenAddress` | string | Conditional | Token contract address (required for Daimo/EVM chains) |
| `externalId` | string | No | External reference ID for tracking |
| `metadata` | object | No | Additional metadata for the payment |

### Amount Units Format
- **Regular decimal units**: Use standard decimal notation (e.g., "1.00", "10.50", "0.01")
- **Precision**: Must match the token's supported decimal places
- **Examples**: 
  - USDC: "10.50" (6 decimal places supported)
  - ETH: "0.001" (18 decimal places supported)
  - XLM: "25.00" (7 decimal places supported)

## Response Format

### Success Response Schema
```json
{
  "id": "string",
  "status": "string",
  "createdAt": "string",
  "display": {
    "intent": "string",
    "currency": "string"
  },
  "source": null,
  "destination": {
    "destinationAddress": "string",
    "txHash": null,
    "chainId": "string",
    "amountUnits": "string",
    "tokenSymbol": "string",
    "tokenAddress": "string"
  },
  "externalId": "string",
  "metadata": {},
  "url": "string"
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique payment identifier |
| `status` | string | Payment status (payment_unpaid, payment_started, payment_completed, payment_bounced) |
| `createdAt` | string | Payment creation timestamp |
| `display.intent` | string | Human-readable payment description |
| `display.currency` | string | Payment currency |
| `source` | object\|null | Source payment details (null until payment initiated) |
| `source.amountUnits` | string | Source amount in regular decimal units |
| `destination` | object | Destination payment details |
| `destination.amountUnits` | string | Destination amount in regular decimal units |
| `destination.txHash` | string\|null | Transaction hash (null until completed) |
| `externalId` | string\|null | External reference ID |
| `metadata` | object | Payment metadata |
| `url` | string | Payment URL for user interaction |

## Examples

### Example 1: Ethereum USDC Payment (Daimo Provider)

#### Request
```bash
curl -X POST http://localhost:3002/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Coffee purchase",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "10",
      "amountUnits": "5.00",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    },
    "externalId": "coffee_order_123"
  }'
```

#### Response
```json
{
  "id": "daimo_1699123456789_abc123def",
  "status": "payment_unpaid", 
  "createdAt": "1699123456789",
  "display": {
    "intent": "Coffee purchase",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "txHash": null,
    "chainId": "10",
    "amountUnits": "5.00",
    "tokenSymbol": "USDC",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "coffee_order_123",
  "metadata": {
    "provider": "daimo"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

---

### Example 2: Stellar XLM Payment (Aqua Provider)

#### Request
```bash
curl -X POST http://localhost:3002/api/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Stellar transfer",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
      "chainId": "10001",
      "amountUnits": "1.00",
      "tokenSymbol": "XLM"
    },
    "externalId": "stellar_transfer_456"
  }'
```

#### Response
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_unpaid",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar transfer",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "1.00",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "stellar_transfer_456",
  "metadata": {
    "aqua_invoice_id": "aqua_invoice_1699123456_xyz789",
    "aqua_mode": "default",
    "aqua_token_id": "xlm"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
``` 