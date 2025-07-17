/**
 * Provider-related types for the payment provider system
 */

import { PaymentRequest, PaymentResponse, ValidationResult } from './payment';

export interface PaymentProvider {
  name: string;
  supportedChains: number[];
  priority: number;

  // Core payment methods matching Daimo Pay API
  createPayment(paymentData: PaymentRequest): Promise<PaymentResponse>;
  getPayment(paymentId: string): Promise<PaymentResponse>;
  getPaymentByExternalId(externalId: string): Promise<PaymentResponse>;

  // Health and validation
  isHealthy(): Promise<boolean>;
  validateRequest(paymentData: PaymentRequest): ValidationResult;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  enabled: boolean;
  priority: number;
  description?: string;
}

export interface ProviderHealth {
  name: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  healthy: boolean;
  supportedChains: number[];
  lastCheck: Date;
}

export interface ProviderError extends Error {
  provider: string;
  statusCode?: number;
  responseData?: any;
}

export type ProviderName = 'daimo' | 'aqua';

export interface ProviderRegistry {
  registerProvider(provider: PaymentProvider): void;
  unregisterProvider(providerName: string): void;
  getProviderForChain(chainId: number): PaymentProvider | null;
  getDefaultProvider(): PaymentProvider;
  getHealthyProviders(): PaymentProvider[];
  getProviderStatus(): ProviderStatus[];
}
