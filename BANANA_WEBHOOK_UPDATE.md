# Rozo Banana Webhook Integration Update

## Summary
Updated the webhook handler to properly support the `isRozoBanana` webhook with authentication token from environment variable.

## Changes Made

### 1. Webhook Handler (`supabase/functions/webhook-handler/index.ts`)
- Added proper payload formatting for Rozo Banana webhook
- Added authorization header with token from environment variable (`ROZOBANANA_TOKEN`)
- Webhook now sends properly formatted data to: `https://eslabobvkchgpokxszwv.supabase.co/functions/v1/banana-payment-webhook`

### 2. Environment Configuration
- Added `ROZOBANANA_TOKEN` to `.env` file with value: `e236892023d930sdcf23e23`
- Created `.env.example` with documentation for all required environment variables

### 3. Test Script (`test-banana-webhook.sh`)
- Created test script that loads token from environment
- Automatically reads `.env` file for configuration
- Generates unique order IDs with timestamps
- Shows token preview for security (only first 8 characters)

## Usage

### Running the Test
```bash
# Make sure .env file contains ROZOBANANA_TOKEN
./test-banana-webhook.sh
```

### Expected Webhook Payload Format
```json
{
  "order_id": "test_1234567890_1234",
  "merchant_order_id": "banana_1234567890",
  "price_amount": 20.00,
  "price_currency": "USD",
  "pay_amount": 20.00,
  "pay_currency": "USD",
  "status": "PAID",
  "created_at": "2025-09-24T18:30:00.000Z",
  "meta": {
    "user_address": "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
    "plan_type": "monthly"
  }
}
```

### Security
- Token is stored in environment variable, not hardcoded
- Token is sent in Authorization header as: `Token <token_value>`
- Test script only shows first 8 characters of token for security

## Environment Variables Required
- `ROZOBANANA_TOKEN`: Authentication token for banana-payment-webhook endpoint

## Testing Confirmation
✅ Successfully tested and confirmed working with the banana webhook endpoint
✅ Webhook returns success response with payment processing confirmation