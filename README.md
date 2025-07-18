# Payment API Proxy - Supabase Edge Functions

A multi-provider payment gateway built with Supabase Edge Functions, supporting Daimo Pay and Aqua payment providers with automatic withdrawal integration.

## 🏗️ Architecture Overview

This service is deployed as Supabase Edge Functions with the following structure:

```
supabase/
├── functions/
│   ├── payment-api/           # Payment creation & retrieval
│   ├── webhook-handler/       # Daimo & Aqua webhook processing  
│   ├── health-check/          # System health & provider status
│   └── shared/               # Shared utilities & types
├── migrations/              # Database schema & tables
└── config.toml             # Supabase configuration
```

### 🚀 Edge Functions

| Function | Endpoint | Description |
|----------|----------|-------------|
| `payment-api` | `/functions/v1/payment-api` | Create payments, get payment status |
| `webhook-handler` | `/functions/v1/webhook-handler` | Process Daimo/Aqua webhooks, trigger withdrawals |
| `health-check` | `/functions/v1/health-check` | System health, provider status |

### 🗄️ Database Schema

- **PostgreSQL** (Supabase built-in)
- **Row Level Security (RLS)** enabled
- **Real-time subscriptions** for payment updates

## 📋 Prerequisites

1. **Supabase CLI** installed
2. **Deno** runtime installed  
3. **Supabase Project** created
4. **API Keys** for Daimo and Aqua providers

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (cross-platform)
npm install -g supabase
```

### Install Deno

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows
iwr https://deno.land/install.ps1 -useb | iex
```

## 🚀 Deployment Guide

### Step 1: Initialize Supabase Project

```bash
# Clone this repository
git clone <your-repo-url>
cd payment-api-proxy

# Initialize Supabase
supabase init

# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Login to Supabase (if not already)
supabase login
```

### Step 2: Set Environment Variables

Create environment secrets in your Supabase dashboard or use CLI:

```bash
# Core Configuration
supabase secrets set NODE_ENV=production
supabase secrets set CORS_ORIGINS="https://yourapp.com,https://yourdomain.com"

# Daimo Provider
supabase secrets set DAIMO_API_KEY="your-daimo-api-key"
supabase secrets set DAIMO_BASE_URL="https://pay.daimo.com"

# Aqua Provider  
supabase secrets set AQUA_BASE_URL="https://api.aqua.network"
supabase secrets set AQUA_API_TOKEN="your-aqua-api-token"
supabase secrets set AQUA_WEBHOOK_TOKEN="your-aqua-webhook-token"

# Withdrawal Integration
supabase secrets set WITHDRAWAL_API_BASE_URL="https://jejdgfzaulaqllyibiyk.supabase.co"
supabase secrets set WITHDRAWAL_API_JWT_TOKEN="your-withdrawal-jwt-token"
supabase secrets set WITHDRAWAL_INTEGRATION_ENABLED="true"

# Optional: Logging & Monitoring
supabase secrets set LOG_LEVEL="info"
supabase secrets set ENABLE_REQUEST_LOGGING="true"
```

### Step 3: Deploy Database Schema

```bash
# Run database migrations
supabase db push

# Verify tables created
supabase db status
```

### Step 4: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy payment-api
supabase functions deploy webhook-handler  
supabase functions deploy health-check

# Or deploy all at once
supabase functions deploy
```

### Step 5: Configure Database Policies

```bash
# Apply Row Level Security policies
supabase db reset --linked
```

### Step 6: Test Deployment

```bash
# Test health check
curl https://<your-project-ref>.supabase.co/functions/v1/health-check

# Test payment creation
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "data": {
      "display": {
        "intent": "Test payment",
        "currency": "USD"
      },
      "destination": {
        "destinationAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "chainId": "10",
        "amountUnits": "1000000",
        "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
      }
    }
  }'
```

## 🔧 Local Development

### Start Local Development Server

```bash
# Start Supabase locally (includes database + edge functions)
supabase start

# Your local endpoints will be:
# API: http://localhost:54321
# Database: postgresql://postgres:postgres@localhost:54322/postgres
# Functions: http://localhost:54321/functions/v1/
```

### Develop Functions Locally

```bash
# Serve functions locally with hot reload
supabase functions serve

# Test local function
curl http://localhost:54321/functions/v1/health-check
```

### Local Database Management

```bash
# Reset local database
supabase db reset

# View database in browser
supabase dashboard db
```

## 📡 API Endpoints

### Payment API

#### Create Payment
```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "action": "create",
  "data": {
    "display": {
      "intent": "Coffee purchase",
      "currency": "USD"
    },
    "destination": {
      "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
      "chainId": "10",
      "amountUnits": "5500000",
      "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
    }
  }
}
```

#### Get Payment Status
```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "action": "get",
  "paymentId": "payment_123",
  "chainId": "10"
}
```

### Webhook Handler

#### Daimo Webhook
```bash
POST /functions/v1/webhook-handler?provider=daimo
Content-Type: application/json
X-Daimo-Signature: sha256=...

{
  "type": "payment_completed",
  "paymentId": "payment_123",
  "chainId": 10,
  "txHash": "0x...",
  "payment": { ... }
}
```

#### Aqua Webhook  
```bash
POST /functions/v1/webhook-handler?provider=aqua&token=your-webhook-token
Content-Type: application/json

{
  "invoice_id": "aqua_invoice_123",
  "status": "paid",
  "amount": 100.50,
  "address": "GXXXXXXX...",
  "token_id": "usdc",
  "transaction_hash": "stellar_tx_hash"
}
```

### Health Check
```bash
GET /functions/v1/health-check

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "providers": {
    "daimo": "healthy",
    "aqua": "healthy"
  },
  "withdrawal_integration": {
    "status": "healthy",
    "enabled": true
  }
}
```

## 🗄️ Database Schema

### Tables

#### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'payment_unpaid',
  external_id TEXT,
  withdraw_id TEXT,
  provider_name TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status_updated_at TIMESTAMPTZ DEFAULT now(),
  provider_response JSONB,
  metadata JSONB,
  original_request JSONB NOT NULL
);
```

#### Payment Status Enum
```sql
CREATE TYPE payment_status AS ENUM (
  'payment_unpaid',
  'payment_started', 
  'payment_completed',
  'payment_bounced',
  'payment_refunded'
);
```

### Row Level Security (RLS)

- **payments**: Public read access for valid payment IDs
- **Real-time**: Enabled for payment status updates
- **API Keys**: Function-level authentication

## 🔄 Automatic Withdrawal Integration

### Flow
```
USDC Stellar Payment Completed (Webhook)
    ↓
Eligibility Check (USDC + Stellar + Aqua provider)
    ↓
POST to External Withdrawal API
    ↓
Save withdraw_id to payment record
    ↓
Log Success/Failure
```

### Supported Conversions
- **USDC Stellar → USDC Base** ✅
- **Future**: USDC Stellar → USDC Solana

## 📊 Monitoring & Observability

### Logs
```bash
# View function logs
supabase functions logs payment-api
supabase functions logs webhook-handler
supabase functions logs health-check

# Real-time logs
supabase functions logs --follow
```

### Metrics
- Function invocation count
- Error rates
- Response times
- Database query performance

### Alerts
- Payment processing failures
- Webhook delivery failures  
- Provider API downtime
- Withdrawal integration errors

## 🔒 Security Features

### Authentication & Authorization
- **API Key Authentication**: For payment creation
- **Webhook Verification**: Signature validation (Daimo) + Token auth (Aqua)
- **Row Level Security**: Database-level access control
- **CORS**: Configurable allowed origins

### Rate Limiting
- **Built-in**: Supabase Edge Functions rate limiting
- **Custom**: Additional rate limiting for webhook endpoints
- **DDoS Protection**: Supabase infrastructure-level protection

## 🚀 Production Checklist

### Pre-Deployment
- [ ] Environment secrets configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] CORS origins configured
- [ ] API keys obtained from providers

### Post-Deployment  
- [ ] Health check passing
- [ ] Test payment flow end-to-end
- [ ] Webhook endpoints responding
- [ ] Withdrawal integration working
- [ ] Monitoring dashboards configured
- [ ] Log aggregation setup

### Ongoing Maintenance
- [ ] Monitor function performance
- [ ] Review error logs regularly  
- [ ] Update provider API configurations
- [ ] Scale function resources as needed
- [ ] Regular database maintenance

## 🔧 Troubleshooting

### Common Issues

#### Function Deployment Fails
```bash
# Check function syntax
deno check supabase/functions/payment-api/index.ts

# View deployment logs
supabase functions logs payment-api --level error
```

#### Database Connection Issues
```bash
# Check database status
supabase db status

# Reset database
supabase db reset --linked
```

#### Provider API Errors
```bash
# Test provider connectivity
curl -H "Authorization: Bearer $DAIMO_API_KEY" https://pay.daimo.com/health

# Check environment secrets
supabase secrets list
```

#### Webhook Processing Failures
```bash
# View webhook logs
supabase functions logs webhook-handler

# Test webhook manually
curl -X POST http://localhost:54321/functions/v1/webhook-handler?provider=daimo \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_completed","paymentId":"test"}'
```

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/manual)  
- [Daimo Pay API Documentation](https://paydocs.daimo.com/)
- [Aqua Payment Documentation](./aqua.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Test locally with `supabase start`
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🚀 Quick Start Commands

```bash
# Complete deployment in one go
git clone <repo> && cd payment-api-proxy
supabase init && supabase link --project-ref <your-ref>
supabase secrets set DAIMO_API_KEY="your-key" AQUA_API_TOKEN="your-token"
supabase db push && supabase functions deploy
curl https://<your-ref>.supabase.co/functions/v1/health-check
```

You're now ready to process payments through multiple blockchain networks with automatic withdrawal integration! 🎉
