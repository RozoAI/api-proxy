/**
 * Daimo Pay Provider Implementation
 * Implements the Daimo Pay API exactly as specified
 */

import { BaseProvider } from './base-provider';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentSource,
  PaymentResponseDestination,
  PaymentStatus,
  ValidationResult,
} from '../types/payment';
import { ProviderConfig } from '../types/provider';
import { ChainConfig, getChainsByProvider } from '../config/chains';
import { getChainConfig } from '../config/chains';

export class DaimoProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    // Get all chains configured for Daimo
    const daimoChains = getChainsByProvider('daimo').map((chain) => chain.chainId);
    super(config, daimoChains);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/api/payment`, paymentData);

    const response = await fetch(`${this.config.baseUrl}/api/payment`, {
      method: 'POST',
      headers: this.getDefaultHeaders(),
      body: JSON.stringify(paymentData),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createProviderError(
        `Daimo createPayment failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const responseData = await response.json();
    this.logResponse(response.status, responseData);

    // Transform to match Daimo Pay response format
    return this.transformDaimoResponse(responseData);
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/api/payment/${paymentId}`);

    const response = await fetch(`${this.config.baseUrl}/api/payment/${paymentId}`, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createProviderError(
        `Daimo getPayment failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const responseData = await response.json();
    this.logResponse(response.status, responseData);

    return this.transformDaimoResponse(responseData);
  }

  async getPaymentByExternalId(externalId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/api/payment/external-id/${externalId}`);

    const response = await fetch(`${this.config.baseUrl}/api/payment/external-id/${externalId}`, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createProviderError(
        `Daimo getPaymentByExternalId failed: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const responseData = await response.json();
    this.logResponse(response.status, responseData);

    return this.transformDaimoResponse(responseData);
  }

  override validateRequest(paymentData: PaymentRequest): ValidationResult {
    const baseValidation = super.validateRequest(paymentData);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors: string[] = [];

    // Daimo-specific validations
    if (!this.config.apiKey) {
      errors.push('Daimo API key is required');
    }

    // Validate chain ID is supported by Daimo
    const chainId = parseInt(paymentData.destination.chainId);
    if (!this.supportedChains.includes(chainId)) {
      errors.push(`Chain ID ${chainId} is not supported by Daimo provider`);
    }

    // Validate token exists for this chain
    const chainConfig = this.getChainConfig(chainId);
    if (
      chainConfig &&
      chainConfig.tokens &&
      paymentData.destination.tokenSymbol &&
      !chainConfig.tokens.includes(paymentData.destination.tokenSymbol)
    ) {
      errors.push(`Token ${paymentData.destination.tokenSymbol} not supported on chain ${chainId}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  override async isHealthy(): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Daimo-specific health check
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.getDefaultHeaders(),
        signal: AbortSignal.timeout(5000), // Shorter timeout for health check
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        console.error(`[${this.name}] Health check failed with status ${response.status}`);
        return false;
      }

      console.log(`[${this.name}] Health check passed in ${responseTime}ms`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] Health check failed:`, error);
      return false;
    }
  }

  private transformDaimoResponse(responseData: unknown): PaymentResponse {
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Invalid response data from Daimo provider');
    }

    const response = responseData as Record<string, unknown>;

    return {
      id: typeof response.id === 'string' ? response.id : '',
      status:
        typeof response.status === 'string' ? (response.status as PaymentStatus) : 'payment_unpaid',
      createdAt:
        typeof response.createdAt === 'string' ? response.createdAt : Date.now().toString(),
      display: this.extractDisplay(response.display),
      source: this.extractSource(response.source),
      destination: this.extractDestination(response.destination),
      externalId: typeof response.externalId === 'string' ? response.externalId : undefined,
      metadata:
        response.metadata && typeof response.metadata === 'object' ? response.metadata : undefined,
      url: typeof response.url === 'string' ? response.url : undefined,
    };
  }

  private extractDisplay(display: unknown): { intent: string; currency: string } {
    if (!display || typeof display !== 'object') {
      return { intent: 'Payment', currency: 'USD' };
    }

    const d = display as Record<string, unknown>;
    return {
      intent: typeof d.intent === 'string' ? d.intent : 'Payment',
      currency: typeof d.currency === 'string' ? d.currency : 'USD',
    };
  }

  private extractSource(source: unknown): PaymentSource | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const s = source as Record<string, unknown>;
    return {
      payerAddress: typeof s.payerAddress === 'string' ? s.payerAddress : '',
      txHash: typeof s.txHash === 'string' ? s.txHash : '',
      chainId: typeof s.chainId === 'string' ? s.chainId : '',
      amountUnits: typeof s.amountUnits === 'string' ? s.amountUnits : '0',
      tokenSymbol: typeof s.tokenSymbol === 'string' ? s.tokenSymbol : '',
      tokenAddress: typeof s.tokenAddress === 'string' ? s.tokenAddress : '',
    };
  }

  private extractDestination(destination: unknown): PaymentResponseDestination {
    if (!destination || typeof destination !== 'object') {
      return {
        destinationAddress: '',
        txHash: null,
        chainId: '',
        amountUnits: '0',
        tokenSymbol: '',
        tokenAddress: '',
      };
    }

    const d = destination as Record<string, unknown>;
    return {
      destinationAddress: typeof d.destinationAddress === 'string' ? d.destinationAddress : '',
      txHash: typeof d.txHash === 'string' ? d.txHash : null,
      chainId: typeof d.chainId === 'string' ? d.chainId : '',
      amountUnits: typeof d.amountUnits === 'string' ? d.amountUnits : '0',
      tokenSymbol: typeof d.tokenSymbol === 'string' ? d.tokenSymbol : '',
      tokenAddress: typeof d.tokenAddress === 'string' ? d.tokenAddress : '',
    };
  }

  private getChainConfig(chainId: number): ChainConfig | undefined {
    return getChainConfig(chainId);
  }

  protected override getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders();

    // Daimo requires Api-Key header
    if (this.config.apiKey) {
      headers['Api-Key'] = this.config.apiKey;
    }

    return headers;
  }
}
