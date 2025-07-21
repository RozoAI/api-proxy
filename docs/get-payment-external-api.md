# Get Payment by External ID API

This document provides detailed information about the Get Payment by External ID endpoint in the Payment API Proxy.

## Endpoint

```
GET /functions/v1/payment-api/external-id/{externalId}
```

## Overview

The Get Payment by External ID API retrieves payment information using the external provider payment ID (e.g., Daimo payment ID or Aqua invoice ID). This endpoint is useful when you have the external reference ID from the payment provider and need to retrieve the corresponding payment details.

## Request Format

### Headers

```
Content-Type: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `externalId` | string | ✅ | External provider payment identifier |

### Example Request

```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/external-id/daimo_1699123456789_abc123def
```

## Response Format

### Success Response (200)

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
    "sourceAddress": "0x9876543210fedcba9876543210fedcba98765432",
    "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "chainId": "1",
    "amountUnits": "10.00",
    "tokenSymbol": "ETH",
    "tokenAddress": "0x0000000000000000000000000000000000000000"
  },
  "externalId": "daimo_1699123456789_abc123def",
  "metadata": {
    "orderId": "12345"
  },
  "url": "https://checkout.example.com/payment_abc123"
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Internal payment identifier |
| `status` | string | Current payment status |
| `createdAt` | string | Payment creation timestamp (Unix) |
| `display` | object | Payment display information |
| `source` | object/null | Source payment details (null if payment not started) |
| `destination` | object | Destination payment details |
| `externalId` | string | External provider payment ID |
| `metadata` | object | Payment metadata |
| `url` | string | Payment checkout URL |

### Payment Status Values

- `payment_unpaid` - Payment created but not yet initiated
- `payment_started` - Payment has been initiated but not completed
- `payment_completed` - Payment has been successfully completed
- `payment_bounced` - Payment failed or was rejected
- `payment_refunded` - Payment has been refunded

## Error Responses

### Payment Not Found (404)

```json
{
  "error": "Payment not found",
  "message": "Payment not found",
  "details": {
    "externalId": "nonexistent_external_id",
    "code": "EXTERNAL_ID_NOT_FOUND"
  }
}
```

### Internal Error (500)

```json
{
  "error": "Payment retrieval failed",
  "message": "Failed to retrieve payment",
  "details": {
    "externalId": "external_id_123",
    "code": "INTERNAL_ERROR"
  }
}
```

## External ID Formats

### Daimo Provider External IDs

Daimo external IDs typically follow this format:
```
daimo_{timestamp}_{random_string}
```

**Examples:**
- `daimo_1699123456789_abc123def`
- `daimo_1699123456789_xyz789ghi`

### Aqua Provider External IDs

Aqua external IDs typically follow this format:
```
aqua_invoice_{timestamp}_{random_string}
```

**Examples:**
- `aqua_invoice_1699123456_xyz789`
- `aqua_invoice_1699123789_usdc456`

## Caching Behavior

Similar to the Get Payment by ID endpoint, this API implements a smart caching strategy:

1. **Cache-First**: Always checks the database first for cached payment data
2. **Stale Data Detection**: Considers data stale after 15 minutes
3. **Fresh Data Fetch**: Attempts to fetch fresh data from the provider if cached data is stale
4. **Fallback**: Returns cached data if provider fetch fails
5. **Database Update**: Updates the database with fresh status information

## Examples

### Example 1: Get Daimo Payment by External ID

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/external-id/daimo_1699123456789_abc123def
```

**Response:**
```json
{
  "id": "payment_abc123",
  "status": "payment_completed",
  "createdAt": "1699123456789",
  "display": {
    "intent": "Coffee purchase at Starbucks",
    "currency": "USD"
  },
  "source": {
    "sourceAddress": "0x9876543210fedcba9876543210fedcba98765432",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "1",
    "amountUnits": "5.50",
    "tokenSymbol": "USDC",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "txHash": "0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
    "chainId": "1",
    "amountUnits": "5.50",
    "tokenSymbol": "USDC",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "externalId": "daimo_1699123456789_abc123def",
  "metadata": {
    "store": "Starbucks Downtown",
    "orderId": "SB-12345"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

### Example 2: Get Aqua Payment by External ID

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/external-id/aqua_invoice_1699123456_xyz789
```

**Response:**
```json
{
  "id": "payment_xyz789",
  "status": "payment_completed",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar XLM transfer to friend",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": "stellar_tx_hash_abcdef123456789",
    "chainId": "10001",
    "amountUnits": "25.00",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "aqua_invoice_1699123456_xyz789",
  "metadata": {
    "purpose": "Birthday gift",
    "recipient": "Alice Johnson"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
```

### Example 3: External ID Not Found

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/external-id/nonexistent_external_id
```

**Response:**
```json
{
  "error": "Payment not found",
  "message": "Payment not found",
  "details": {
    "externalId": "nonexistent_external_id",
    "code": "EXTERNAL_ID_NOT_FOUND"
  }
}
```

## Use Cases

### 1. Webhook Processing

When processing webhooks from payment providers, you often receive the external ID and need to retrieve the corresponding payment:

```typescript
// Webhook handler receives external ID
const externalId = webhookData.paymentId;

// Retrieve payment details using external ID
const payment = await getPaymentByExternalId(externalId);

// Update payment status
await updatePaymentStatus(payment.id, webhookData.status);
```

### 2. Payment Reconciliation

For reconciliation purposes, you might have external IDs from provider reports:

```typescript
// Provider report contains external IDs
const externalIds = ['daimo_123', 'aqua_456', 'daimo_789'];

// Retrieve all payments
for (const externalId of externalIds) {
  try {
    const payment = await getPaymentByExternalId(externalId);
    console.log(`Payment ${externalId}: ${payment.status}`);
  } catch (error) {
    console.log(`Payment ${externalId}: Not found`);
  }
}
```

### 3. Customer Support

Customer support can use external IDs to look up payment details:

```typescript
// Customer provides external ID from their receipt
const customerExternalId = 'daimo_1699123456789_abc123def';

try {
  const payment = await getPaymentByExternalId(customerExternalId);
  console.log(`Payment found: ${payment.status}`);
  console.log(`Amount: ${payment.destination.amountUnits} ${payment.destination.tokenSymbol}`);
} catch (error) {
  console.log('Payment not found in our system');
}
```

## Performance Considerations

### Response Times

- **Cached Data**: ~5-10ms (database query only)
- **Fresh Data**: ~100-500ms (database + provider API call)
- **Not Found**: ~5-10ms (database query only)

### Indexing

The database has a unique index on the `external_id` column for fast lookups:

```sql
CREATE UNIQUE INDEX idx_payments_external_id_unique ON payments(external_id) WHERE external_id IS NOT NULL;
```

## Best Practices

1. **Store External IDs**: Always save the external ID returned from create payment
2. **Webhook Integration**: Use external IDs from webhook payloads
3. **Error Handling**: Implement proper error handling for 404 responses
4. **Validation**: Validate external ID format before making requests
5. **Caching**: Leverage the built-in caching for better performance

## SDK Examples

### JavaScript/TypeScript

```typescript
interface PaymentResponse {
  id: string;
  status: string;
  createdAt: string;
  display: {
    intent: string;
    currency: string;
  };
  source: any;
  destination: any;
  externalId: string;
  metadata: Record<string, any>;
  url: string;
}

async function getPaymentByExternalId(externalId: string): Promise<PaymentResponse> {
  const response = await fetch(`/functions/v1/payment-api/external-id/${externalId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Payment not found');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Example usage
try {
  const payment = await getPaymentByExternalId('daimo_1699123456789_abc123def');
  console.log('Payment status:', payment.status);
  console.log('External ID:', payment.externalId);
} catch (error) {
  if (error.message === 'Payment not found') {
    console.log('Payment does not exist');
  } else {
    console.error('Error fetching payment:', error);
  }
}
```

### Python

```python
import requests
from typing import Dict, Any

def get_payment_by_external_id(external_id: str) -> Dict[str, Any]:
    response = requests.get(f'/functions/v1/payment-api/external-id/{external_id}')
    
    if response.status_code == 404:
        raise ValueError('Payment not found')
    response.raise_for_status()
    
    return response.json()

# Example usage
try:
    payment = get_payment_by_external_id('daimo_1699123456789_abc123def')
    print(f"Payment status: {payment['status']}")
    print(f"External ID: {payment['externalId']}")
except ValueError as e:
    if str(e) == 'Payment not found':
        print('Payment does not exist')
    else:
        raise
except requests.RequestException as e:
    print(f'Error fetching payment: {e}')
```

## Related Endpoints

- [Create Payment](./create-payment-api.md)
- [Get Payment by ID](./get-payment-api.md)
- [Webhook Handler](./webhook-handler-api.md)
- [Health Check](./health-check-api.md) 