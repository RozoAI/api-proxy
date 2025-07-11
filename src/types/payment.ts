/**
 * Payment-related types matching Daimo Pay API structure
 */

import { CHAIN_IDS } from '../config/chains';

// Base destination interface without token fields
interface BaseDestination {
  destinationAddress: string;
  chainId: string;
  amountUnits: string;
}

// Destination for non-Aqua chains (Daimo) - tokenAddress required
export interface DaimoDestination extends BaseDestination {
  tokenAddress: string;
  tokenSymbol?: string; // Optional for Daimo chains
}

// Destination for Aqua chains - tokenSymbol required
export interface AquaDestination extends BaseDestination {
  tokenSymbol: string;
  tokenAddress?: string; // Optional for Aqua chains
}

// Union type for destination based on chain
export type PaymentDestination = DaimoDestination | AquaDestination;

export interface PaymentRequest {
  display: {
    intent: string;
    currency: string;
  };
  destination: PaymentDestination;
  externalId?: string;
  metadata?: Record<string, any>;
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
  | 'payment_bounced';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Helper function to determine if a destination is for Aqua chain
export function isAquaChain(chainId: string | number): boolean {
  const chainIdNum = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  return chainIdNum === CHAIN_IDS.STELLAR; // Aqua chain ID
}

// Helper function to determine if a destination is for Daimo chain
export function isDaimoChain(chainId: string | number): boolean {
  const chainIdNum = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  const daimoChainIds = [
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.OPTIMISM,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.ARBITRUM,
  ];
  return daimoChainIds.includes(chainIdNum as any); // Daimo chain IDs
}
