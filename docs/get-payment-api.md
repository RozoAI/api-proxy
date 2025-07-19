# Get Payment by ID API

This document provides detailed information about the Get Payment by ID endpoint in the Payment API Proxy.

## Endpoint

```
GET /functions/v1/payment-api/{paymentId}
```

## Overview

The Get Payment by ID API retrieves payment information by the internal payment ID. The API uses a cache-first approach, returning cached data from the database and optionally fetching fresh data from the provider if the cached data is stale.

## Request Format

### Headers

```
Content-Type: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paymentId` | string | ✅ | Internal payment identifier |

### Example Request

```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/payment_abc123
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
  "externalId": "ext_123",
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
| `externalId` | string/null | External provider payment ID |
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
  "message": "Payment not found"
}
```

### Internal Error (500)

```json
{
  "error": "Payment retrieval failed",
  "message": "Failed to retrieve payment"
}
```

## Caching Behavior

The API implements a smart caching strategy:

1. **Cache-First**: Always checks the database first for cached payment data
2. **Stale Data Detection**: Considers data stale after 15 minutes
3. **Fresh Data Fetch**: Attempts to fetch fresh data from the provider if cached data is stale
4. **Fallback**: Returns cached data if provider fetch fails
5. **Database Update**: Updates the database with fresh status information

### Cache Logic

```typescript
// Check if payment is stale (15 minutes)
if (this.db.isPaymentStale(cachedPayment, 15)) {
  // Fetch fresh data from provider
  const freshPayment = await this.router.getPayment(paymentId, chainId);
  
  // Update database with fresh data
  await this.db.updatePaymentStatus(paymentId, freshPayment.status);
  
  return freshPayment;
}
```

## Examples

### Example 1: Get Completed Payment

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/daimo_1699123456789_abc123def
```

**Response:**
```json
{
  "id": "daimo_1699123456789_abc123def",
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
  "externalId": "starbucks_order_12345",
  "metadata": {
    "store": "Starbucks Downtown",
    "orderId": "SB-12345"
  },
  "url": "https://pay.daimo.com/link/daimo_1699123456789_abc123def"
}
```

### Example 2: Get Pending Payment

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/aqua_invoice_1699123456_xyz789
```

**Response:**
```json
{
  "id": "aqua_invoice_1699123456_xyz789",
  "status": "payment_unpaid",
  "createdAt": "1699123456000",
  "display": {
    "intent": "Stellar XLM transfer to friend",
    "currency": "USD"
  },
  "source": null,
  "destination": {
    "destinationAddress": "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOAO7MZLU4BGBMFDVBEADFQZJJPD",
    "txHash": null,
    "chainId": "10001",
    "amountUnits": "25.00",
    "tokenSymbol": "XLM",
    "tokenAddress": ""
  },
  "externalId": "friend_transfer_789",
  "metadata": {
    "purpose": "Birthday gift",
    "recipient": "Alice Johnson"
  },
  "url": "https://api.aqua.network/checkout?id=aqua_invoice_1699123456_xyz789"
}
```

### Example 3: Payment Not Found

**Request:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/payment-api/nonexistent_payment
```

**Response:**
```json
{
  "error": "Payment not found",
  "message": "Payment not found"
}
```

## Performance Considerations

### Response Times

- **Cached Data**: ~5-10ms (database query only)
- **Fresh Data**: ~100-500ms (database + provider API call)
- **Not Found**: ~5-10ms (database query only)

### Caching Benefits

- **Reduced Provider Load**: Minimizes API calls to external providers
- **Faster Response Times**: Cached data returns quickly
- **Improved Reliability**: Fallback to cached data if provider is down
- **Cost Optimization**: Reduces external API costs

## Best Practices

1. **Store Payment IDs**: Always save the payment ID returned from create payment
2. **Polling Strategy**: Use reasonable polling intervals (30-60 seconds)
3. **Webhook Integration**: Prefer webhooks over polling for real-time updates
4. **Error Handling**: Implement proper error handling for 404 responses
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
  externalId: string | null;
  metadata: Record<string, any>;
  url: string;
}

async function getPayment(paymentId: string): Promise<PaymentResponse> {
  const response = await fetch(`/functions/v1/payment-api/${paymentId}`);

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
  const payment = await getPayment('payment_abc123');
  console.log('Payment status:', payment.status);
  console.log('Payment amount:', payment.destination.amountUnits);
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

def get_payment(payment_id: str) -> Dict[str, Any]:
    response = requests.get(f'/functions/v1/payment-api/{payment_id}')
    
    if response.status_code == 404:
        raise ValueError('Payment not found')
    response.raise_for_status()
    
    return response.json()

# Example usage
try:
    payment = get_payment('payment_abc123')
    print(f"Payment status: {payment['status']}")
    print(f"Payment amount: {payment['destination']['amountUnits']}")
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
- [Get Payment by External ID](./get-payment-external-api.md)
- [Webhook Handler](./webhook-handler-api.md)
- [Health Check](./health-check-api.md) 