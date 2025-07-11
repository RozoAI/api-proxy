/**
 * Aqua API Client
 * Implements actual Aqua API calls based on aqua.md
 */

import { PaymentRequest, PaymentResponse } from '../types/payment';

// Aqua API request interfaces based on aqua.md
export interface AquaInvoiceRequest {
  mode: 'default' | 'web3';
  amount: number;
  address: string;
  token_id: string;
  metadata?: any;
  callback_url?: string;
  cover_percent?: number;
  cover_amount?: number;
  cover_operator?: 'both' | 'one';
}

// Aqua API response interfaces based on aqua.md
export interface AquaInvoiceResponse {
  invoice_id: string;
  mode: 'default' | 'web3';
  status: 'failed' | 'paid' | 'created' | 'retry' | 'deleted';
  status_updated_at_t: number;
  created_at: string;
  address: string;
  amount: number;
  callback_url: string;
  transaction_hash?: string;
  token_id: string;
  metadata?: any;
  cover_percent?: number;
  cover_amount?: number;
  cover_operator?: 'both' | 'one';
}

export interface AquaApiConfig {
  baseUrl: string;
  apiToken: string;
  timeout: number;
}

export class AquaApiClient {
  private config: AquaApiConfig;

  constructor(config: AquaApiConfig) {
    this.config = config;
  }

  /**
   * Create invoice using Aqua API
   */
  async createInvoice(invoiceData: AquaInvoiceRequest): Promise<AquaInvoiceResponse> {
    try {
      console.log('[AquaApiClient] Creating invoice:', invoiceData);

      const response = await fetch(`${this.config.baseUrl}/api/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify(invoiceData),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Aqua API createInvoice failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json() as AquaInvoiceResponse;
      console.log('[AquaApiClient] Invoice created successfully:', responseData.invoice_id);

      return responseData;

    } catch (error) {
      console.error('[AquaApiClient] Error creating invoice:', error);
      this.handleApiError(error, 'createInvoice');
      throw error;
    }
  }

  /**
   * Get invoice by ID using Aqua API
   */
  async getInvoice(invoiceId: string): Promise<AquaInvoiceResponse> {
    try {
      console.log('[AquaApiClient] Getting invoice:', invoiceId);

      const response = await fetch(`${this.config.baseUrl}/api/invoice/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Aqua API getInvoice failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json() as AquaInvoiceResponse;
      console.log('[AquaApiClient] Invoice retrieved successfully:', invoiceId);

      return responseData;

    } catch (error) {
      console.error('[AquaApiClient] Error getting invoice:', error);
      this.handleApiError(error, 'getInvoice');
      throw error;
    }
  }

  /**
   * Generic error handling for Aqua API responses
   */
  private handleApiError(error: any, operation: string): void {
    // Log detailed error information
    console.error(`[AquaApiClient] ${operation} error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });

    // Could integrate with error monitoring services here
    // e.g., Sentry, DataDog, etc.
  }

  /**
   * Health check for Aqua API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
      });

      return response.ok;
    } catch (error) {
      console.error('[AquaApiClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get API configuration (for debugging)
   */
  getConfig(): Partial<AquaApiConfig> {
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout
      // Don't expose API token
    };
  }
} 