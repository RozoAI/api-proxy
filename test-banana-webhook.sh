#!/bin/bash

# Test script for Rozo Banana webhook with authentication token from environment
# This script tests the banana payment webhook endpoint with proper authentication

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if token is set
if [ -z "$ROZOBANANA_TOKEN" ]; then
  echo "❌ Error: ROZOBANANA_TOKEN not found in environment"
  echo "Please set ROZOBANANA_TOKEN in your .env file"
  exit 1
fi

echo "=== Testing Rozo Banana Webhook ==="
echo "Using token from environment: Token ${ROZOBANANA_TOKEN:0:8}..."
echo ""

# Generate unique IDs
TIMESTAMP=$(date +%s)
ORDER_ID="test_${TIMESTAMP}_1234"
MERCHANT_ORDER_ID="banana_${TIMESTAMP}"

echo "Testing webhook with:"
echo "  Order ID: $ORDER_ID"
echo "  Merchant Order ID: $MERCHANT_ORDER_ID"
echo ""

# Make the webhook request with token from environment
curl -X POST 'https://eslabobvkchgpokxszwv.supabase.co/functions/v1/banana-payment-webhook' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Token $ROZOBANANA_TOKEN" \
    -d '{
      "order_id": "'"$ORDER_ID"'",
      "merchant_order_id": "'"$MERCHANT_ORDER_ID"'",
      "price_amount": 20.00,
      "price_currency": "USD", 
      "pay_amount": 20.00,
      "pay_currency": "USD",
      "status": "PAID",
      "created_at": "'"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"'",
      "meta": {
        "user_address": "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897",
        "plan_type": "monthly"
      }
    }'

echo ""
echo ""
echo "✅ Webhook request sent with authentication token from environment"