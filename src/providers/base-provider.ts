/**
 * Abstract base provider class
 * All payment providers must extend this class
 */

import { PaymentProvider, ProviderConfig, ProviderError } from '../types/provider';
import { PaymentRequest, PaymentResponse, ValidationResult } from '../types/payment';

export abstract class BaseProvider implements PaymentProvider {
  public readonly name: string;
  public readonly supportedChains: number[];
  public readonly priority: number;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig, supportedChains: number[]) {
    this.name = config.name;
    this.supportedChains = supportedChains;
    this.priority = config.priority;
    this.config = config;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract createPayment(paymentData: PaymentRequest): Promise<PaymentResponse>;
  abstract getPayment(paymentId: string): Promise<PaymentResponse>;
  abstract getPaymentByExternalId(externalId: string): Promise<PaymentResponse>;

  // Default health check implementation
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - can be overridden by providers
      const startTime = Date.now();
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      console.log(`[${this.name}] Health check passed in ${responseTime}ms`);
      return true;
    } catch (error) {
      console.error(`[${this.name}] Health check failed:`, error);
      return false;
    }
  }

  // Default validation implementation
  validateRequest(paymentData: PaymentRequest): ValidationResult {
    const errors: string[] = [];

    // Basic validation - can be extended by providers
    if (!paymentData.display?.intent) {
      errors.push('Display intent is required');
    }

    if (!paymentData.display?.paymentValue) {
      errors.push('Payment value is required');
    }

    if (!paymentData.display?.currency) {
      errors.push('Currency is required');
    }

    if (!paymentData.destination?.destinationAddress) {
      errors.push('Destination address is required');
    }

    if (!paymentData.destination?.chainId) {
      errors.push('Chain ID is required');
    }

    if (!paymentData.destination?.amountUnits) {
      errors.push('Amount units is required');
    }

    if (!paymentData.destination?.tokenSymbol) {
      errors.push('Token symbol is required');
    }

    if (!paymentData.destination?.tokenAddress) {
      errors.push('Token address is required');
    }

    // Check if chain is supported
    const chainId = parseInt(paymentData.destination.chainId);
    if (!this.supportedChains.includes(chainId)) {
      errors.push(`Chain ID ${chainId} is not supported by provider ${this.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Protected methods for common functionality
  protected async performHealthCheck(): Promise<void> {
    // Default implementation - can be overridden
    // Simple GET request to provider's health endpoint
    const response = await fetch(`${this.config.baseUrl}/health`, {
      method: 'GET',
      headers: this.getDefaultHeaders(),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'api-proxy/1.0.0'
    };

    if (this.config.apiKey) {
      headers['Api-Key'] = this.config.apiKey;
    }

    return headers;
  }

  protected createProviderError(message: string, statusCode?: number, responseData?: any): ProviderError {
    const error = new Error(message) as ProviderError;
    error.provider = this.name;
    error.statusCode = statusCode;
    error.responseData = responseData;
    return error;
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[${this.name}] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  protected logRequest(method: string, url: string, data?: any): void {
    console.log(`[${this.name}] ${method} ${url}`, data ? JSON.stringify(data, null, 2) : '');
  }

  protected logResponse(statusCode: number, data?: any): void {
    console.log(`[${this.name}] Response ${statusCode}`, data ? JSON.stringify(data, null, 2) : '');
  }
} 