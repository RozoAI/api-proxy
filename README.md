# Payment API Proxy - Supabase Edge Functions

A multi-provider payment gateway built with Supabase Edge Functions, currently configured to use **Payment Manager** as the primary provider for all chains, with support for Daimo and Aqua providers as alternatives.

## 🏗️ Architecture Overview

This service is deployed as Supabase Edge Functions with the following
structure:

```
supabase/
├── functions/
│   ├── payment-api/           # Payment creation & retrieval
│   ├── webhook-handler/       # Payment Manager webhook processing
│   ├── api-health/            # System health & provider status
│   └── shared/               # Shared utilities & types
│       ├── provider-config.ts # Provider configuration & switching
│       └── providers/        # Payment provider implementations
├── migrations/              # Database schema & tables
└── config.toml             # Supabase configuration
```

### 🚀 Edge Functions

| Function          | Endpoint                        | Description                         |
| ----------------- | ------------------------------- | ----------------------------------- |
| `payment-api`     | `/functions/v1/payment-api`     | Create payments, get payment status |
| `webhook-handler` | `/functions/v1/webhook-handler` | Process Payment Manager webhooks    |
| `api-health`      | `/functions/v1/api-health`      | System health, provider status      |

### 🗄️ Database Schema

- **PostgreSQL** (Supabase built-in)
- **Row Level Security (RLS)** enabled
- **Real-time subscriptions** for payment updates
- **Optimized indexes** for performance
- **CHECK constraints** for data integrity

## 🔧 Provider Configuration

The system is currently configured to use **Payment Manager** as the primary provider for all chains. You can easily switch providers by modifying the configuration file.

### Current Setup

- **Primary Provider**: Payment Manager
- **Supported Chains**: All chains (Ethereum, Solana, Stellar, Polygon, etc.)
- **Webhook Structure**: New format compatible with Payment Manager
- **Withdrawal Integration**: Disabled for Payment Manager

### Switching Providers

See [PROVIDER_SWITCHING.md](./PROVIDER_SWITCHING.md) for detailed instructions on how to switch between providers.

Quick switch example:

```typescript
// In supabase/functions/shared/provider-config.ts
export const PROVIDER_CONFIG = {
  primaryProvider: 'payment-manager', // Change to 'daimo' or 'aqua'
  providers: {
    'payment-manager': { enabled: true },
    daimo: { enabled: false },
    aqua: { enabled: false },
  },
};
```

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

# Payment Manager Provider (Primary)
supabase secrets set PAYMENT_MANAGER_BASE_URL="https://rozo-payment-manager.example.com"
supabase secrets set PAYMENT_MANAGER_API_KEY="your-payment-manager-api-key"
supabase secrets set PAYMENT_MANAGER_WEBHOOK_TOKEN="your-payment-manager-webhook-token"

# Optional: Alternative Providers (Disabled by default)
# Daimo Provider
supabase secrets set DAIMO_API_KEY="your-daimo-api-key"
supabase secrets set DAIMO_BASE_URL="https://pay.daimo.com"
supabase secrets set DAIMO_WEBHOOK_TOKEN="your-daimo-webhook-token"

# Aqua Provider
supabase secrets set AQUA_BASE_URL="https://api.aqua.network"
supabase secrets set AQUA_API_TOKEN="your-aqua-api-token"
supabase secrets set AQUA_WEBHOOK_TOKEN="your-aqua-webhook-token"

# Withdrawal Integration (Disabled for Payment Manager)
supabase secrets set WITHDRAWAL_API_BASE_URL="https://proj-ref.supabase.co"
supabase secrets set WITHDRAWAL_API_JWT_TOKEN="your-withdrawal-jwt-token"
supabase secrets set WITHDRAWAL_INTEGRATION_ENABLED="false"

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

#### Request Structure

The Payment Manager API supports the following request structure:

**Required Fields:**

- `display.intent`: Payment description/intent
- `preferredChain`: Chain ID for payment processing
- `preferredToken`: Token symbol (e.g., "USDC", "USDC_XLM", "XLM")
- `destination.destinationAddress`: Address for withdrawal
- `destination.chainId`: Chain ID for withdrawal
- `destination.amountUnits`: Amount for withdrawal

**Optional Fields:**

- `preferredTokenAddress`: Explicit token address (overrides automatic mapping)
- `destination.tokenAddress`: Token address for withdrawal
- `destination.tokenSymbol`: Token symbol for withdrawal
- `metadata`: Additional payment metadata
- `metadata.webhookUrl`: Custom webhook URL
- `metadata.externalId`: External reference ID

#### Create Payment

```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "display": {
    "intent": "Coffee purchase",
    "currency": "USD"
  },
  "preferredChain": "1500",
  "preferredToken": "USDC_XLM",
  "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "destination": {
    "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
    "chainId": "1500",
    "amountUnits": "0.01",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  },
  "metadata": {
    "orderId": "12345",
    "webhookUrl": "https://your-app.com/webhooks/payment"
  }
}
```

#### Payment Manager Example (Stellar USDC)

```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "display": {
    "intent": "Premium Subscription Payment",
    "currency": "USD"
  },
  "preferredChain": "1500",
  "preferredToken": "USDC_XLM",
  "preferredTokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "destination": {
    "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
    "chainId": "1500",
    "amountUnits": "0.01",
    "tokenSymbol": "USDC_XLM",
    "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
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

#### Payment Manager Example (Solana USDC)

```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "display": {
    "intent": "NFT Purchase",
    "currency": "USD"
  },
  "preferredChain": "900",
  "preferredToken": "USDC",
  "preferredTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "destination": {
    "destinationAddress": "BNnbbcbi8yMbft9i58KBpkXyXb5jUqkQ71bmii5aL8dC",
    "chainId": "900",
    "amountUnits": "25.00",
    "tokenSymbol": "USDC",
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "metadata": {
    "orderId": "nft_purchase_001",
    "nftId": "nft_12345"
  }
}
```

#### Payment Manager Example (Ethereum USDC)

```bash
POST /functions/v1/payment-api
Content-Type: application/json

{
  "display": {
    "intent": "DeFi Protocol Payment",
    "currency": "USD"
  },
  "preferredChain": "1",
  "preferredToken": "USDC",
  "preferredTokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C",
  "destination": {
    "destinationAddress": "0x742d35Cc6634C0532925a3b8D6Cd1C3b5123456",
    "chainId": "1",
    "amountUnits": "1000000",
    "tokenSymbol": "USDC",
    "tokenAddress": "0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C"
  },
  "metadata": {
    "orderId": "defi_payment_001",
    "protocol": "uniswap"
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
  "id": "5941be78-9442-479f-8af7-db74368a05dc",
  "url": "http://aoqfamebfrwdrqxevngc.supabase.co/checkout?id=5941be78-9442-479f-8af7-db74368a05dc",
  "payment": {
    "id": "5941be78-9442-479f-8af7-db74368a05dc",
    "status": "payment_unpaid",
    "createdAt": "2025-08-14T05:17:29.583+00:00",
    "receivingAddress": "GDHXR2VIJIGMHSNCPJ747EYCNFFFVCTSZWJDSG3YGUXS6A4B2YE3WMZZ",
    "memo": "0060595",
    "display": {
      "name": "Stellar Mainnet USDC Test",
      "description": "Testing USDC payment on Stellar mainnet",
      "logoUrl": "https://example.com/logo.png"
    },
    "source": null,
    "payinchainid": "1500",
    "payintokenaddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "destination": {
      "destinationAddress": "GDFLZTLVMLR3OVO4VSODYB7SGVIOI2AS652WODBCGBUQAMKQL6O3QYPU",
      "amountUnits": "0.01",
      "chainId": "1500",
      "tokenAddress": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    },
    "externalId": null,
    "metadata": null
  }
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
supabase secrets set PAYMENT_MANAGER_API_KEY="your-key" PAYMENT_MANAGER_WEBHOOK_TOKEN="your-token"
supabase db push && supabase functions deploy
curl https://<your-ref>.supabase.co/functions/v1/api-health
```

You're now ready to process payments through multiple blockchain networks with
automatic withdrawal integration! 🎉

**Payment Routing (preferredChain)**:

| Chain           | ID         | Provider        | Supported Tokens        | Token Addresses                                                       | Use Case           |
| --------------- | ---------- | --------------- | ----------------------- | --------------------------------------------------------------------- | ------------------ |
| Ethereum        | `1`        | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C`                    | EVM payments       |
| Sepolia         | `11155111` | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`                    | Ethereum testnet   |
| Optimism        | `10`       | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`                    | L2 payments        |
| Polygon         | `137`      | Payment Manager | MATIC, USDC, USDT, etc. | USDC: `0x83ACD773450269b6c141F830192fd07748c0a8b1`                    | Low-cost payments  |
| Mumbai          | `80001`    | Payment Manager | MATIC, USDC, USDT, etc. | USDC: `0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747`                    | Polygon testnet    |
| Arbitrum        | `42161`    | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8`                    | L2 payments        |
| Base            | `8453`     | Payment Manager | ETH, USDC, USDT, etc.   | USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`                    | Coinbase ecosystem |
| BSC             | `56`       | Payment Manager | BNB, USDC, USDT, etc.   | USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`                    | BSC ecosystem      |
| Stellar         | `1500`     | Payment Manager | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Stellar ecosystem  |
| Stellar Testnet | `1501`     | Payment Manager | XLM, USDC_XLM           | USDC: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Stellar testnet    |
| Solana          | `900`      | Payment Manager | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  | Solana ecosystem   |
| Solana Devnet   | `901`      | Payment Manager | USDC                    | USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`                  | Solana testnet     |

_Note: All chains are currently routed to Payment Manager. See [PROVIDER_SWITCHING.md](./PROVIDER_SWITCHING.md) to switch to alternative providers._

---

## ✅ Transaction Verification - August 18th, 2024

The following transactions have been successfully verified and tested on the Payment Manager integration:

### 1. Stellar (with memo) → Base

**Stellar payin (memo) and base payout - working**

- **Payin Transaction**: [StellarExpert | Stellar XLM block explorer and analytics platform](https://stellar.expert)
- **Payout Transaction**: [https://basescan.org/tx/0xbe5c38dde8235a9cf007df7e7553eddc46588658432ef4b66fa9dbc6ccee9f98](https://basescan.org/tx/0xbe5c38dde8235a9cf007df7e7553eddc46588658432ef4b66fa9dbc6ccee9f98)

### 2. Base → Stellar

**Base payin and stellar payout - working**

- **Order ID**: `0aeb1da6-cbfa-4b4f-b17b-76f0d9d1a1c3`
- **Payin Transaction**: [https://basescan.org/tx/0x51d8606daf59573c150847e851f489ebe97bb77a0ad649b0f87218bfe7341280](https://basescan.org/tx/0x51d8606daf59573c150847e851f489ebe97bb77a0ad649b0f87218bfe7341280)
- **Payout Transaction**: [StellarExpert | Stellar XLM block explorer and analytics platform](https://stellar.expert)

### 3. Solana (with memo) → Base

**Solana pay in and base payout - working**

- **Order ID**: `54540054-4b74-424c-bd16-1139e63a4170`
- **Payin Transaction**: `3AH3TbBmKVic9N488M5pPJveVo6CWuDwq8V1JLFrUEm4u6qe6xC5rhSc7SXV28obdC3jLBXVBo6Q3zf97rvFMh9u`
- **Payout Transaction**: [https://basescan.org/tx/0xe14b2618467444174b1b1363762f6446a7d4a757b1c8b8c15433374be0f7ba72](https://basescan.org/tx/0xe14b2618467444174b1b1363762f6446a7d4a757b1c8b8c15433374be0f7ba72)

### 4. Polygon → Base

**Polygon pay in and base payout - working**

- **Order ID**: `54540054-4b74-424c-bd16-1139e63a4170`
- **Payin Transaction**: [https://polygonscan.com/tx/0x682480482aa2b831a82a8a39e5bb8a8bc82629cd02308255f1bfbc134b8077e7](https://polygonscan.com/tx/0x682480482aa2b831a82a8a39e5bb8a8bc82629cd02308255f1bfbc134b8077e7)
- **Payout Transaction**: [https://basescan.org/tx/0x8a2da4d58b3012f2e9e7548b7a4f62ea8b1ae7247eb3d38428023993575e2377](https://basescan.org/tx/0x8a2da4d58b3012f2e9e7548b7a4f62ea8b1ae7247eb3d38428023993575e2377)

### 5. Polygon → Stellar

**Polygon pay in and stellar payout - working**

- **Order ID**: `4c88e53c-3852-4296-afe9-ba54d64b9ce2`
- **Payin Transaction**: [https://polygonscan.com/tx/0xd165ce6b7bb6812070ce77434849e2670f6a1f809b8beffbae5815f2db50d2f1](https://polygonscan.com/tx/0xd165ce6b7bb6812070ce77434849e2670f6a1f809b8beffbae5815f2db50d2f1)
- **Payout Transaction**: [StellarExpert | Stellar XLM block explorer and analytics platform](https://stellar.expert)

---
