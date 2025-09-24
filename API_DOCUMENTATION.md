# Rozo Payment API Documentation

## Overview

Rozo Payment API is a multi-chain payment gateway that supports various blockchain networks. This documentation provides complete integration guidelines for external developers.

## Base URL

```
https://intentapiv2.rozo.ai/functions/v1
```

## Authentication

Currently, the API uses open access for payment creation. Future versions will require API key authentication.

## API Endpoints

### 1. Create Payment

Create a new payment request with specified chain and token preferences.

#### Endpoint

```
POST /payment
```

#### Request Headers

```
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `display` | Object | Yes | Display information for the payment |
| `display.intent` | String | Yes | Payment description/purpose |
| `display.currency` | String | No | Display currency (e.g., "USD") |
| `preferredChain` | String | Yes | Chain for payment (e.g., "stellar", "solana", "base", "polygon") |
| `preferredToken` | String | Yes | Token symbol (e.g., "USDC", "USDC_XLM", "XLM") |
| `preferredTokenAddress` | String | No | Explicit token contract address |
| `destination` | Object | Yes | Withdrawal destination details |
| `destination.destinationAddress` | String | Yes | Recipient wallet address |
| `destination.chainId` | String | Yes | Destination chain |
| `destination.amountUnits` | String | Yes | Amount to receive (as string) |
| `destination.tokenAddress` | String | No | Token address on destination chain |
| `destination.tokenSymbol` | String | No | Token symbol on destination chain |
| `metadata` | Object | No | Additional metadata |
| `metadata.orderId` | String | No | Your internal order ID |
| `metadata.externalId` | String | No | External reference ID |
| `callbackUrl` | String | No | Webhook URL for payment status updates |

#### Example Request

```bash
curl -X POST https://intentapiv2.rozo.ai/functions/v1/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Premium Subscription",
      "currency": "USD"
    },
    "preferredChain": "stellar",
    "preferredToken": "USDC_XLM",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "chainId": "stellar",
      "amountUnits": "10.00",
      "tokenSymbol": "USDC_XLM"
    },
    "metadata": {
      "orderId": "order_123456",
      "userId": "user_789"
    },
    "callbackUrl": "https://your-app.com/webhooks/payment-status"
  }'
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "5941be78-9442-479f-8af7-db74368a05dc",
    "url": "https://checkout.rozo.ai?id=5941be78-9442-479f-8af7-db74368a05dc",
    "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
    "memo": "0060595",
    "amount": "10.00",
    "currency": "USDC_XLM",
    "status": "payment_unpaid",
    "createdAt": "2025-01-24T10:30:00.000Z",
    "expiresAt": "2025-01-24T11:30:00.000Z"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Invalid chain provided"
}
```

### 2. Get Payment Status

Retrieve the current status and details of a payment.

#### Endpoint

```
GET /payment/id/{paymentId}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `paymentId` | String | The payment ID returned from create payment |

#### Example Request

```bash
curl https://intentapiv2.rozo.ai/functions/v1/payment/id/5941be78-9442-479f-8af7-db74368a05dc
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "5941be78-9442-479f-8af7-db74368a05dc",
    "amount": 10.00,
    "currency": "USDC_XLM",
    "status": "payment_completed",
    "chain_id": "stellar",
    "provider_name": "payment-manager",
    "created_at": "2025-01-24T10:30:00.000Z",
    "updated_at": "2025-01-24T10:35:00.000Z",
    "transaction_hash": "stellar_tx_hash_here",
    "metadata": {
      "orderId": "order_123456",
      "userId": "user_789"
    }
  }
}
```

### 3. Get Payment by External ID

Retrieve payment information using your external reference ID.

#### Endpoint

```
GET /payment/external-id/{externalId}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `externalId` | String | Your external reference ID |

#### Example Request

```bash
curl https://intentapiv2.rozo.ai/functions/v1/payment/external-id/order_123456
```

#### Response

Same format as Get Payment Status response.

## Webhook Notifications

If you provide a `callbackUrl` when creating a payment, you will receive webhook notifications for payment status updates.

### Webhook Request Format

Your webhook endpoint will receive a POST request with the following structure:

#### Headers

```
Content-Type: application/json
X-Rozo-Signature: sha256=<signature>
```

#### Webhook Payload

```json
{
  "event": "payment.completed",
  "timestamp": "2025-01-24T10:35:00.000Z",
  "data": {
    "paymentId": "5941be78-9442-479f-8af7-db74368a05dc",
    "externalId": "order_123456",
    "status": "payment_completed",
    "amount": "10.00",
    "currency": "USDC_XLM",
    "chainId": "stellar",
    "transactionHash": "stellar_tx_hash_here",
    "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
    "memo": "0060595",
    "metadata": {
      "orderId": "order_123456",
      "userId": "user_789"
    }
  }
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `payment.created` | Payment request created |
| `payment.started` | User has initiated payment |
| `payment.completed` | Payment successfully completed |
| `payment.bounced` | Payment returned/bounced |
| `payment.refunded` | Payment refunded |

### Webhook Security

To verify webhook authenticity, validate the `X-Rozo-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## Payment Status Flow

```
payment_unpaid → payment_started → payment_completed
                              ↓
                        payment_bounced
                              ↓
                        payment_refunded
```

## Supported Chains and Tokens

| Chain | Supported Tokens | Example Token Address |
|-------|------------------|----------------------|
| Ethereum | ETH, USDC, USDT | USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Optimism | ETH, USDC | USDC: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607` |
| Polygon | MATIC, USDC, USDT | USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| Base | ETH, USDC | USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Arbitrum | ETH, USDC | USDC: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8` |
| BSC | BNB, USDC, USDT | USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| Stellar | XLM, USDC_XLM | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| Solana | SOL, USDC | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'https://intentapiv2.rozo.ai/functions/v1';

// Create payment
async function createPayment(paymentData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/payment`,
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Payment creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get payment status
async function getPaymentStatus(paymentId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/payment/id/${paymentId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get payment status:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
async function main() {
  const payment = await createPayment({
    display: {
      intent: 'Product Purchase',
      currency: 'USD'
    },
    preferredChain: 'stellar',
    preferredToken: 'USDC_XLM',
    destination: {
      destinationAddress: 'GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU',
      chainId: 'stellar',
      amountUnits: '25.00',
      tokenSymbol: 'USDC_XLM'
    },
    metadata: {
      orderId: 'order_' + Date.now()
    },
    callbackUrl: 'https://your-app.com/webhooks/payment'
  });
  
  console.log('Payment created:', payment);
  
  // Check status after 5 seconds
  setTimeout(async () => {
    const status = await getPaymentStatus(payment.data.id);
    console.log('Payment status:', status);
  }, 5000);
}

main().catch(console.error);
```

### Python

```python
import requests
import json

API_BASE_URL = 'https://intentapiv2.rozo.ai/functions/v1'

def create_payment(payment_data):
    """Create a new payment request"""
    response = requests.post(
        f'{API_BASE_URL}/payment',
        json=payment_data,
        headers={'Content-Type': 'application/json'}
    )
    response.raise_for_status()
    return response.json()

def get_payment_status(payment_id):
    """Get payment status by ID"""
    response = requests.get(f'{API_BASE_URL}/payment/id/{payment_id}')
    response.raise_for_status()
    return response.json()

# Example usage
if __name__ == '__main__':
    payment = create_payment({
        'display': {
            'intent': 'Subscription Payment',
            'currency': 'USD'
        },
        'preferredChain': 'solana',
        'preferredToken': 'USDC',
        'destination': {
            'destinationAddress': 'BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC',
            'chainId': 'solana',
            'amountUnits': '50.00',
            'tokenSymbol': 'USDC'
        },
        'callbackUrl': 'https://your-app.com/webhooks/payment'
    })
    
    print(f"Payment created: {payment['data']['id']}")
    print(f"Payment URL: {payment['data']['url']}")
```

### cURL Examples

#### Create Stellar USDC Payment

```bash
curl -X POST https://intentapiv2.rozo.ai/functions/v1/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Premium Plan - Monthly",
      "currency": "USD"
    },
    "preferredChain": "stellar",
    "preferredToken": "USDC_XLM",
    "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "chainId": "stellar",
      "amountUnits": "29.99",
      "tokenSymbol": "USDC_XLM",
      "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    },
    "metadata": {
      "planType": "premium",
      "billingCycle": "monthly"
    },
    "callbackUrl": "https://your-app.com/webhooks/subscription-payment"
  }'
```

#### Create Solana USDC Payment

```bash
curl -X POST https://intentapiv2.rozo.ai/functions/v1/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "NFT Purchase",
      "currency": "USD"
    },
    "preferredChain": "solana",
    "preferredToken": "USDC",
    "preferredTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "destination": {
      "destinationAddress": "BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC",
      "chainId": "solana",
      "amountUnits": "100.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    },
    "metadata": {
      "nftId": "nft_12345",
      "collection": "CoolNFTs"
    },
    "callbackUrl": "https://your-app.com/webhooks/nft-payment"
  }'
```

#### Create Base Chain USDC Payment

```bash
curl -X POST https://intentapiv2.rozo.ai/functions/v1/payment \
  -H "Content-Type: application/json" \
  -d '{
    "display": {
      "intent": "Service Payment",
      "currency": "USD"
    },
    "preferredChain": "base",
    "preferredToken": "USDC",
    "preferredTokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "base",
      "amountUnits": "150.00",
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "callbackUrl": "https://your-app.com/webhooks/payment"
  }'
```

## Error Handling

### Common Error Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| 400 | Bad Request | Check request format and required fields |
| 404 | Payment Not Found | Verify payment ID is correct |
| 500 | Internal Server Error | Contact support if persists |
| 503 | Service Unavailable | Provider temporarily unavailable, retry later |

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "errorCode": "INVALID_CHAIN"
}
```

## Best Practices

1. **Always store the payment ID** returned from the create payment endpoint
2. **Implement webhook handlers** for real-time payment status updates
3. **Use idempotency keys** in metadata to prevent duplicate payments
4. **Validate addresses** before creating payments to avoid errors
5. **Handle all payment statuses** in your application logic
6. **Implement retry logic** with exponential backoff for failed requests
7. **Store transaction hashes** from completed payments for reconciliation

## Rate Limits

- **Create Payment**: 100 requests per minute per IP
- **Get Payment Status**: 300 requests per minute per IP
- **Webhook Delivery**: Max 3 retries with exponential backoff

## Support

For technical support or questions:
- Email: hi@rozo.ai
- Documentation: https://docs.rozo.ai

## Changelog

### Version 1.1.0 (2025-09-24)
- webhook support


### Version 1.0.0 (2025-07-24)
- Initial public release
- Support for multiple blockchain networks
- Webhook notifications with custom callbacks
- Multi-token support across chains

---

## Quick Start Checklist

- [ ] Choose your preferred chain and token
- [ ] Implement create payment endpoint
- [ ] Set up webhook handler for status updates
- [ ] Monitor payment status
- [ ] Go live with production