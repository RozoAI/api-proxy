/**
 * Daimo Pay Provider Implementation
 * Implements the Daimo Pay API exactly as specified
 */

import { BaseProvider } from './base-provider';
import { PaymentRequest, PaymentResponse, ValidationResult } from '../types/payment';
import { ProviderConfig } from '../types/provider';
import { getChainsByProvider } from '../config/chains';

export class DaimoProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    // Get all chains configured for Daimo
    const daimoChains = getChainsByProvider('daimo').map(chain => chain.chainId);
    super(config, daimoChains);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/api/payment`, paymentData);

    const response = await fetch(`${this.config.baseUrl}/api/payment`, {
      method: 'POST',
      headers: this.getDefaultHeaders(),
      body: JSON.stringify(paymentData),
      signal: AbortSignal.timeout(this.config.timeout)
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
      signal: AbortSignal.timeout(this.config.timeout)
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
      signal: AbortSignal.timeout(this.config.timeout)
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

    // Validate token symbol is supported for the chain
    const chainConfig = this.getChainConfig(chainId);
    if (chainConfig && chainConfig.tokens) {
      if (!chainConfig.tokens.includes(paymentData.destination.tokenSymbol)) {
        errors.push(`Token ${paymentData.destination.tokenSymbol} is not supported on chain ${chainId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  override async isHealthy(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Daimo-specific health check
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.getDefaultHeaders(),
        signal: AbortSignal.timeout(5000) // Shorter timeout for health check
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

  private transformDaimoResponse(responseData: any): PaymentResponse {
    // Daimo response is already in the correct format, just ensure all required fields
    return {
      id: responseData.id,
      status: responseData.status,
      createdAt: responseData.createdAt,
      display: responseData.display,
      source: responseData.source,
      destination: responseData.destination,
      externalId: responseData.externalId,
      metadata: responseData.metadata,
      url: responseData.url
    };
  }

  private getChainConfig(chainId: number) {
    const { getChainConfig } = require('../config/chains');
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