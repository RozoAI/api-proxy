# API Proxy

A Node.js/Express API proxy server that provides enhanced wallet payment options and forwards requests to a backend service.

## Features

- **Health Check**: Monitor server status and configuration
- **Wallet Payment Options**: Enhanced endpoint that returns detailed token balance and payment information
- **Request Forwarding**: Proxy requests to backend services
- **Multi-chain Support**: Support for Base, Polygon, Arbitrum, and Solana networks
- **Token Management**: Comprehensive token configuration system

## API Endpoints

### Core Endpoints

#### `GET /health`

Returns server health status and configuration.

#### `GET /getWalletPaymentOptions`

Enhanced endpoint that returns detailed wallet payment options with token balances.

**Query Parameters:**

- `input`: JSON string containing payment options input

**Input Format:**

```json
{
  "0": {
    "payerAddress": "0xdC4313EfB37836615d820F38A6016EE76598887B",
    "usdRequired": 5,
    "destChainId": 8453
  }
}
```

**Response Format:**

```json
[
  {
    "result": {
      "data": [
        {
          "required": {
            "token": {
              "chainId": 42161,
              "token": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
              "symbol": "USDC",
              "usd": 1,
              "priceFromUsd": 1,
              "decimals": 6,
              "displayDecimals": 2,
              "logoSourceURI": "https://pay.daimo.com/coin-logos/usdc.png",
              "logoURI": "https://pay.daimo.com/coin-logos/usdc.png",
              "maxAcceptUsd": 100000,
              "maxSendUsd": 0
            },
            "amount": "5000000",
            "usd": 5
          },
          "balance": {
            "token": {
              /* same token object */
            },
            "amount": "1820475",
            "usd": 1.820475
          },
          "minimumRequired": {
            "token": {
              /* same token object */
            },
            "amount": "100000",
            "usd": 0.1
          },
          "fees": {
            "token": {
              /* same token object */
            },
            "amount": "0",
            "usd": 0
          },
          "disabledReason": "Balance too low: $1.82"
        }
      ]
    }
  }
]
```

### Mock Endpoints

- `GET /previewOrder` - Returns mock order preview data
- `POST /nav` - Mock navigation endpoint
- `GET /untronHasAvailableReceivers` - Mock Tron receivers check
- `POST /nav,nav` - Mock multiple navigation actions
- `GET /getExternalPaymentOptions,getDepositAddressOptions` - Mock external payment and deposit options

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `BACKEND_URL` - Backend service URL (default: http://localhost:8080)
- `NODE_ENV` - Environment mode (development/production)
- `LOG_REQUESTS` - Enable request logging (true/false)
- `LOG_RESPONSES` - Enable response logging (true/false)
- `ALCHEMY_API_KEY` - Alchemy API key for blockchain data (required)

### Development Environment

Create an `env.dev` file in the root directory for development configuration:

```env
PORT=3000
BACKEND_URL=http://localhost:8080
NODE_ENV=development
LOG_REQUESTS=true
LOG_RESPONSES=true
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

## Lib Folder Structure

The `src/lib/` folder contains core configuration modules:

### `chain.ts`

Defines supported blockchain networks and their configurations.

**Supported Chains:**

- **Base** (chainId: 8453) - Base Mainnet
- **Polygon** (chainId: 137) - Polygon Mainnet
- **Arbitrum** (chainId: 42161) - Arbitrum One
- **Solana** (chainId: 501) - Solana Mainnet

**Chain Configuration:**

```typescript
export type Chain = {
  type: "evm" | "solana";
  chainId: number;
  name: string;
  cctpDomain: number | null;
  alchemyNetwork: Network;
};
```

### `token.ts`

Manages token configurations across supported chains.

**Supported Tokens:**

- **USDC** on Base, Polygon, Arbitrum, and Solana
- Extensible architecture for adding more tokens

**Token Configuration:**

```typescript
export type Token = {
  chainId: number;
  token: `0x${string}` | string;
  name?: string;
  symbol: string;
  decimals: number;
  fiatISO?: string;
  logoURI: TokenLogo | string;
  logoSourceURI: string;
  alchemyNetwork: Network;
};
```

**Key Exports:**

- `knownTokens` - All supported tokens across chains
- `knownAlchemyTokens` - Tokens with Alchemy network mappings
- `knownTokensByAlchemyNetwork` - Tokens grouped by Alchemy network

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production

```bash
npm start
```

## Features in Detail

### Enhanced Wallet Payment Options

The `/getWalletPaymentOptions` endpoint provides comprehensive payment information including:

1. **Required Amount**: The exact amount needed for the payment
2. **Current Balance**: User's current token balance in the wallet
3. **Minimum Required**: Minimum amount required for transactions (typically $0.10)
4. **Fees**: Transaction fees (currently set to $0)
5. **Disabled Reason**: Explanation if payment option is unavailable

### Multi-chain Token Support

The system supports tokens across multiple blockchains:

- Automatic token detection based on chain ID
- Real-time balance fetching via Alchemy API
- USD value calculations for supported stablecoins
- Extensible token configuration system

### Request Logging

Comprehensive logging system for debugging:

- Request/response logging (configurable)
- Error handling and forwarding
- Health check monitoring
