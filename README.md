# Payment API Proxy - Supabase Edge Functions

A multi-provider payment gateway built with Supabase Edge Functions, supporting
Daimo Pay and Aqua payment providers with automatic withdrawal integration.

## 🏗️ Architecture Overview

This service is deployed as Supabase Edge Functions with the following
structure:

```
supabase/
├── functions/
│   ├── payment-api/           # Payment creation & retrieval
│   ├── webhook-handler/       # Daimo & Aqua webhook processing  
│   ├── api-health/            # System health & provider status
│   └── shared/               # Shared utilities & types
├── migrations/              # Database schema & tables
└── config.toml             # Supabase configuration
```

### 🚀 Edge Functions

| Function          | Endpoint                        | Description                                      |
| ----------------- | ------------------------------- | ------------------------------------------------ |
| `payment-api`     | `/functions/v1/payment-api`     | Create payments, get payment status              |
| `webhook-handler` | `/functions/v1/webhook-handler` | Process Daimo/Aqua webhooks, trigger withdrawals |
| `api-health`      | `/functions/v1/api-health`      | System health, provider status                   |

### 🗄️ Database Schema

- **PostgreSQL** (Supabase built-in)
- **Row Level Security (RLS)** enabled
- **Real-time subscriptions** for payment updates
- **Optimized indexes** for performance
- **CHECK constraints** for data integrity

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
supabase secrets set DAIMO_WEBHOOK_TOKEN="your-daimo-webhook-token"

# Aqua Provider  
supabase secrets set AQUA_BASE_URL="https://api.aqua.network"
supabase secrets set AQUA_API_TOKEN="your-aqua-api-token"
supabase secrets set AQUA_WEBHOOK_TOKEN="your-aqua-webhook-token"

# Payment Manager Provider
supabase secrets set PAYMENT_MANAGER_BASE_URL="https://rozo-payment-manager.example.com"
supabase secrets set PAYMENT_MANAGER_API_KEY="your-payment-manager-api-key"
supabase secrets set PAYMENT_MANAGER_SOLANA_ADDRESS="your-solana-destination-address"
supabase secrets set PAYMENT_MANAGER_WEBHOOK_TOKEN="your-payment-manager-webhook-token"

# Withdrawal Integration
supabase secrets set WITHDRAWAL_API_BASE_URL="https://proj-ref.supabase.co"
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
supabase functions deploy api-health

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
curl https://<your-project-ref>.supabase.co/functions/v1/api-health

# Test payment creation
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/payment-api \
  -H "Content-Type: application/json" \
  -d '{
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
curl http://localhost:54321/functions/v1/api-health
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
  "display": {
    "intent": "Coffee purchase",
    "currency": "USD"
  },
  "preferredChain": "8453",
  "preferredToken": "USDC",
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "chainId": "10001",
    "amountUnits": "5500000",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b"
  },
  "metadata": {
    "orderId": "12345"
  }
}
```

#### Payment Manager Example (Solana USDC)

```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "display": {
    "intent": "Premium Subscription Payment",
    "currency": "USD"
  },
  "preferredChain": "10002",
  "preferredToken": "USDC",
  "destination": {
    "destinationAddress": "0x742d35cc6ab4925a59b2a6923e87e11d2a1e3b1f",
    "chainId": "11155111",
    "amountUnits": "25000000",
    "tokenSymbol": "USDC"
  },
  "metadata": {
    "orderId": "subscription_2024_001",
    "userId": "user_12345",
    "planType": "premium",
    "billingCycle": "monthly",
    "email": "user@example.com"
  }
}
```

#### Get Payment by ID

```bash
GET /functions/v1/payment-api/{paymentId}
```

#### Get Payment by External ID

```bash
GET /functions/v1/payment-api/external-id/{externalId}
```

### Webhook Handler

#### Daimo Webhook

```bash
POST /functions/v1/webhook-handler?provider=daimo&token=your-webhook-token
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

#### Payment Manager Webhook

```bash
POST /functions/v1/webhook-handler?provider=payment-manager&token=your-webhook-token
Content-Type: application/json

{
  "event": "UPDATE",
  "timestamp": "2024-01-15T10:35:00Z",
  "payment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "payment_completed",
    "externalId": "order-123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z",
    "completedAt": "2024-01-15T10:35:00Z",
    "display": { ... },
    "source": { ... },
    "destination": { ... },
    "metadata": { ... },
    "payerAddress": "0x1234...5678",
    "transactionHash": "0xabc...def"
  },
  "previousStatus": "payment_started"
}
```

### Health Check

```bash
GET /functions/v1/api-health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "providers": {
    "daimo": {
      "status": "healthy",
      "responseTime": 150,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    },
    "aqua": {
      "status": "healthy", 
      "responseTime": 200,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    }
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
  amount DECIMAL(20,8) NOT NULL CHECK (amount > 0),
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

### Optimized Indexes

```sql
-- Main status query optimization
CREATE INDEX idx_payments_status_created_at ON payments(status, created_at DESC);

-- Unique external_id constraint
CREATE UNIQUE INDEX idx_payments_external_id_unique ON payments(external_id) WHERE external_id IS NOT NULL;

-- Stale payment detection
CREATE INDEX idx_payments_status_status_updated ON payments(status, status_updated_at);

-- Provider and chain specific queries
CREATE INDEX idx_payments_provider_status ON payments(provider_name, status);
CREATE INDEX idx_payments_chain_status ON payments(chain_id, status);

-- Partial indexes for specific status values
CREATE INDEX idx_payments_status_unpaid ON payments(created_at DESC) WHERE status = 'payment_unpaid';
CREATE INDEX idx_payments_status_started ON payments(created_at DESC) WHERE status = 'payment_started';
CREATE INDEX idx_payments_status_completed ON payments(created_at DESC) WHERE status = 'payment_completed';
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
supabase functions logs api-health

# Real-time logs
supabase functions logs --follow
```

### Metrics

- Function invocation count
- Error rates
- Response times
- Database query performance
- Provider health status

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

### Data Integrity

- **CHECK constraints**: Amount must be positive
- **Unique constraints**: External IDs are unique
- **Input validation**: Application-level validation
- **Type safety**: TypeScript throughout

## 🚀 Production Checklist

### Pre-Deployment

- [ ] Environment secrets configured
- [ ] Database migrations applied
- [ ] Database improvements applied (`./apply-db-improvements.sh`)
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
- [ ] Monitor index usage

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
- [API Interface Documentation](./docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Test locally with `supabase start`
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code patterns
- Add tests for new functionality
- Update documentation for API changes
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

---

## 🚀 Quick Start Commands

```bash
# Complete deployment in one go
git clone <repo> && cd payment-api-proxy
supabase init && supabase link --project-ref <your-ref>
supabase secrets set DAIMO_API_KEY="your-key" AQUA_API_TOKEN="your-token"
supabase db push && supabase functions deploy
curl https://<your-ref>.supabase.co/functions/v1/api-health
```

You're now ready to process payments through multiple blockchain networks with
automatic withdrawal integration! 🎉

**Payment Routing (preferredChain)**:

| Chain    | ID      | Provider        | Supported Tokens        | Use Case           |
| -------- | ------- | --------------- | ----------------------- | ------------------ |
| Ethereum | `1`     | Daimo           | ETH, USDC, USDT, etc.   | EVM payments       |
| Optimism | `10`    | Daimo           | ETH, USDC, USDT, etc.   | L2 payments        |
| Polygon  | `137`   | Daimo           | MATIC, USDC, USDT, etc. | Low-cost payments  |
| Arbitrum | `42161` | Daimo           | ETH, USDC, USDT, etc.   | L2 payments        |
| Base     | `8453`  | Daimo           | ETH, USDC, USDT, etc.   | Coinbase ecosystem |
| BSC      | `56`    | Daimo           | BNB, USDC, USDT, etc.   | BSC ecosystem      |
| Stellar  | `10001` | Aqua            | XLM, USDC_XLM           | Stellar ecosystem  |
| Solana   | `10002` | Payment Manager | USDC                    | Solana ecosystem   |
