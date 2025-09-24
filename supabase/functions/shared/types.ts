// Shared types for Edge Functions
// Converted from Node.js to Deno-compatible imports

export interface PaymentRequest {
  display: {
    intent: string;
    currency: string;
  };
  preferredChain: string; // Chain for payment processing routing (e.g., "10", "10001")
  preferredToken: string; // Token for payment processing (e.g., "USDC", "USDC_XLM", "XLM")
  preferredTokenAddress?: string; // Optional: explicit token address for preferred token on preferredChain
  receivingAddress?: string; // Optional: explicit receiving address for provider (e.g., Payment Manager)
  destination: PaymentDestination; // For withdrawal after payment completion
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface PaymentDestination {
  destinationAddress: string; // Address for withdrawal
  chainId: string; // Chain for withdrawal
  amountUnits: string; // Amount for withdrawal
  tokenAddress?: string; // Token address for withdrawal (EVM chains)
  tokenSymbol?: string; // Token symbol for withdrawal
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  createdAt: string;
  display: {
    intent: string;
    currency: string;
  };
  source: PaymentSource | null;
  destination: PaymentResponseDestination;
  externalId?: string;
  metadata?: Record<string, any>;
  url?: string;
  // Deposit expiration for Base chain payments (Daimo provider)
  depositExpiration?: number;
}

export interface PaymentSource {
  payerAddress: string;
  txHash: string;
  chainId: string;
  amountUnits: string;
  tokenSymbol: string;
  tokenAddress: string;
}

export interface PaymentResponseDestination {
  destinationAddress: string;
  txHash: string | null;
  chainId: string;
  amountUnits: string;
  tokenSymbol: string;
  tokenAddress: string;
}

export type PaymentStatus =
  | 'payment_unpaid'
  | 'payment_started'
  | 'payment_completed'
  | 'payment_bounced'
  | 'payment_refunded';

// Database record interface
export interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  status: string;
  external_id?: string;
  withdraw_id?: string;
  provider_name: string;
  chain_id: string;
  created_at: string;
  updated_at: string;
  status_updated_at: string;
  provider_response?: any;
  metadata?: any;
  original_request: any;
  // Source transaction details (from payment provider)
  source_address?: string;
  source_tx_hash?: string;
  // Withdrawal transaction details
  withdrawal_tx_hash?: string;
  callback_url?: string;
}

// Webhook types
export interface DaimoWebhookEvent {
  type: 'payment_started' | 'payment_completed' | 'payment_bounced' | 'payment_refunded';
  paymentId: string;
  chainId: number;
  txHash: string;
  payment: PaymentResponse;
}

export interface AquaWebhookEvent {
  invoice_id: string;
  status: 'failed' | 'paid' | 'created' | 'retry' | 'deleted';
  status_updated_at_t: number;
  created_at_t: number;
  transaction_hash?: string;
  amount: number;
  address: string;
  from: string; // Payer's address (source address)
  token_id: string;
  mode: 'default' | 'web3';
  callback_url: string;
  metadata?: Record<string, any>;
  cover_percent?: number;
  cover_amount?: number;
  cover_operator?: 'both' | 'one';
}

export interface PaymentManagerWebhookEvent {
  id: string;
  url: string;
  payment: {
    id: string;
    status: PaymentStatus;
    createdAt: string;
    receivingAddress: string;
    memo: string;
    display: {
      name: string;
      description: string;
      logoUrl: string;
    };
    source: any | null;
    payinchainid: string;
    payintokenaddress: string;
    destination: {
      destinationAddress: string;
      amountUnits: string;
    };
    externalId: string | null;
    metadata: any | null;
  };
}

// Withdrawal API types
export interface CreateWithdrawalRequest {
  chain: 'stellar' | 'base' | 'solana';
  token: 'USDC';
  amount: number;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  data: {
    id: string;
    withdraw_id: string;
    chain: string;
    token: string;
    amount: string;
    status: 'NEW' | 'PENDING' | 'PAID' | 'FAILED';
    created_at: string;
    available_balance?: number;
  };
}

// Provider configuration
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  enabled: boolean;
}

// Provider health status
export interface ProviderHealth {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

// Chain configuration
export interface ChainConfig {
  chainId: number;
  name: string;
  provider: string;
  enabled: boolean;
  tokens?: string[];
}

// Error response
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
}
