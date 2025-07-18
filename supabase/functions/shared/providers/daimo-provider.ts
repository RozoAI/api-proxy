// Daimo Provider for Edge Functions
// Migrated from original Express.js architecture with real API integration
import { BaseProvider } from './base-provider.ts';
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  ProviderConfig,
  ProviderHealth,
} from '../types.ts';

export class DaimoProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/link/create`, paymentData);

    try {
      const response = await this.makeRequest(`${this.config.baseUrl}/link/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey || '',
        },
        body: JSON.stringify(this.transformToDaimoRequest(paymentData)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daimo API error ${response.status}: ${errorText || 'Unknown error'}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from Daimo API');
      }

      const responseData = JSON.parse(responseText);
      this.logResponse(response, responseData);

      if (!response.ok) {
        throw new Error(
          `Daimo API error: ${response.status} - ${responseData.error || 'Unknown error'}`
        );
      }

      return this.transformFromDaimoResponse(responseData, paymentData);
    } catch (error) {
      this.logError(error as Error, 'createPayment');
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/link/${paymentId}`);

    try {
      const response = await this.makeRequest(`${this.config.baseUrl}/link/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey || '',
        },
      });

      const responseData = await response.json();
      this.logResponse(response, responseData);

      if (!response.ok) {
        throw new Error(
          `Daimo API error: ${response.status} - ${responseData.error || 'Payment not found'}`
        );
      }

      return this.transformFromDaimoResponse(responseData);
    } catch (error) {
      this.logError(error as Error, 'getPayment');
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const startTime = performance.now();

      const response = await this.makeRequest(
        `${this.config.baseUrl}/health`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': this.config.apiKey || '',
          },
        },
        5000
      ); // Short timeout for health checks

      const responseTime = Math.round(performance.now() - startTime);

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      this.logError(error as Error, 'healthCheck');

      return {
        status: 'unhealthy',
        responseTime: 5000,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private transformToDaimoRequest(paymentData: PaymentRequest): any {
    return {
      display: paymentData.display,
      destination: {
        destinationAddress: paymentData.destination.destinationAddress,
        chainId: parseInt(paymentData.destination.chainId),
        amountUnits: paymentData.destination.amountUnits,
        tokenAddress: paymentData.destination.tokenAddress,
      },
      metadata: paymentData.metadata || {},
    };
  }

  private transformFromDaimoResponse(
    daimoResponse: any,
    originalRequest?: PaymentRequest
  ): PaymentResponse {
    return {
      id: daimoResponse.id || `daimo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: this.mapDaimoStatus(daimoResponse.status || 'payment_unpaid') as PaymentStatus,
      createdAt: daimoResponse.createdAt?.toString() || Date.now().toString(),
      display: {
        intent: originalRequest?.display.intent || daimoResponse.display?.intent || '',
        currency: originalRequest?.display.currency || daimoResponse.display?.currency || 'USD',
      },
      source: daimoResponse.source || null,
      destination: {
        destinationAddress:
          daimoResponse.destination?.destinationAddress ||
          originalRequest?.destination.destinationAddress ||
          '',
        txHash: daimoResponse.destination?.txHash || null,
        chainId:
          daimoResponse.destination?.chainId?.toString() ||
          originalRequest?.destination.chainId ||
          '',
        amountUnits:
          daimoResponse.destination?.amountUnits || originalRequest?.destination.amountUnits || '',
        tokenSymbol:
          daimoResponse.destination?.tokenSymbol ||
          this.getTokenSymbolFromAddress(originalRequest?.destination.tokenAddress),
        tokenAddress:
          daimoResponse.destination?.tokenAddress ||
          originalRequest?.destination.tokenAddress ||
          '',
      },
      externalId: daimoResponse.externalId || daimoResponse.id || null,
      metadata: {
        ...originalRequest?.metadata,
        ...daimoResponse.metadata,
        provider: 'daimo',
      },
      url: daimoResponse.url || `${this.config.baseUrl}/link/${daimoResponse.id}`,
    };
  }

  private mapDaimoStatus(daimoStatus: string): string {
    const statusMap: Record<string, string> = {
      unpaid: 'payment_unpaid',
      started: 'payment_started',
      completed: 'payment_completed',
      bounced: 'payment_bounced',
      refunded: 'payment_refunded',
    };

    return statusMap[daimoStatus] || daimoStatus;
  }

  private getTokenSymbolFromAddress(tokenAddress?: string): string {
    // Common token address to symbol mapping
    const tokenMap: Record<string, string> = {
      '0xA0b86a33E6441c8C06DD2a8e8B4A6a0b0b1b1b1b': 'USDC',
      '0x0000000000000000000000000000000000000000': 'ETH',
    };

    return tokenMap[tokenAddress || ''] || 'UNKNOWN';
  }
}
