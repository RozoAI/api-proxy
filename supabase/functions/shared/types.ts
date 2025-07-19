// Shared types for Edge Functions
// Converted from Node.js to Deno-compatible imports

export interface PaymentRequest {
  display: {
    intent: string;
    currency: string;
  };
  destination: PaymentDestination;
  metadata?: Record<string, any>;
  appId?: string;
}

export interface PaymentDestination {
  destinationAddress: string;
  chainId: string;
  amountUnits: string;
  tokenAddress?: string;
  tokenSymbol?: string;
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
  appId?: string;
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

// App configuration for different applications
export interface AppConfig {
  appId: string;
  name: string;
  payoutToken: 'XLM' | 'USDC_XLM' | 'USDC_BASE' | 'USDC_SOLANA';
  payoutAddress: string;
  payoutChainId: string;
  enabled: boolean;
  description?: string;
}

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
  app_id?: string; // New field for app tracking
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
  transaction_hash?: string;
  amount: number;
  address: string;
  token_id: string;
  mode: 'default' | 'web3';
  created_at: string;
  callback_url: string;
  metadata?: Record<string, any>;
  cover_percent?: number;
  cover_amount?: number;
  cover_operator?: 'both' | 'one';
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
