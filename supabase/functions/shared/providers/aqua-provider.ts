// Aqua Provider for Edge Functions
// Migrated from original Express.js architecture with real API integration
import { BaseProvider } from './base-provider.ts';
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  ProviderConfig,
  ProviderHealth,
} from '../types.ts';

export class AquaProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/payment/invoice`, paymentData);

    try {
      const aquaRequest = this.transformToAquaRequest(paymentData);

      const response = await this.makeRequest(`${this.config.baseUrl}/payment/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(aquaRequest),
      });

      const responseData = await response.json();
      this.logResponse(response, responseData);

      if (!response.ok) {
        throw new Error(
          `Aqua API error: ${response.status} - ${responseData.error || 'Unknown error'}`
        );
      }

      return this.transformFromAquaResponse(responseData, paymentData);
    } catch (error) {
      this.logError(error as Error, 'createPayment');
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/payment/invoice/${paymentId}`);

    try {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/payment/invoice/${paymentId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const responseData = await response.json();
      this.logResponse(response, responseData);

      if (!response.ok) {
        throw new Error(
          `Aqua API error: ${response.status} - ${responseData.error || 'Payment not found'}`
        );
      }

      return this.transformFromAquaResponse(responseData);
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
            Authorization: `Bearer ${this.config.apiKey}`,
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

  private transformToAquaRequest(paymentData: PaymentRequest): any {
    const tokenId = this.getAquaTokenId(paymentData.destination.tokenSymbol || '');

    return {
      recipient: paymentData.destination.destinationAddress,
      token: tokenId,
      amount: paymentData.destination.amountUnits,
      description: paymentData.display.intent,
      callback_url: this.getCallbackUrl(),
      metadata: {
        daimo_external_id: this.generateExternalId(paymentData),
        daimo_intent: paymentData.display.intent,
        daimo_currency: paymentData.display.currency,
        original_metadata: paymentData.metadata || {},
      },
    };
  }

  private transformFromAquaResponse(
    aquaResponse: any,
    originalRequest?: PaymentRequest
  ): PaymentResponse {
    const paymentId = `aqua_invoice_${aquaResponse.invoice_id || Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    return {
      id: paymentId,
      status: this.mapAquaStatus(aquaResponse.status || 'created') as PaymentStatus,
      createdAt: aquaResponse.created_at
        ? Math.floor(new Date(aquaResponse.created_at).getTime()).toString()
        : Date.now().toString(),
      display: {
        intent: originalRequest?.display.intent || aquaResponse.metadata?.daimo_intent || '',
        currency:
          originalRequest?.display.currency || aquaResponse.metadata?.daimo_currency || 'USD',
      },
      source: null, // Aqua doesn't provide source information
      destination: {
        destinationAddress:
          aquaResponse.address || originalRequest?.destination.destinationAddress || '',
        txHash: aquaResponse.transaction_hash || null,
        chainId: '10001', // Stellar chain ID
        amountUnits:
          aquaResponse.amount?.toString() || originalRequest?.destination.amountUnits || '',
        tokenSymbol: this.mapAquaTokenToSymbol(aquaResponse.token_id),
        tokenAddress: '', // Stellar doesn't use token addresses
      },
      externalId: aquaResponse.metadata?.daimo_external_id || aquaResponse.invoice_id || null,
      metadata: {
        ...originalRequest?.metadata,
        ...aquaResponse.metadata?.original_metadata,
        aqua_invoice_id: aquaResponse.invoice_id,
        aqua_mode: 'default',
        aqua_token_id: aquaResponse.token_id,
        aqua_status: aquaResponse.status,
        aqua_status_updated_at: aquaResponse.status_updated_at_t,
      },
      url: `${this.config.baseUrl}/checkout?id=${aquaResponse.invoice_id}`,
    };
  }

  private mapAquaStatus(aquaStatus: string): string {
    const statusMap: Record<string, string> = {
      created: 'payment_unpaid',
      retry: 'payment_started',
      paid: 'payment_completed',
      failed: 'payment_bounced',
      deleted: 'payment_bounced',
    };

    return statusMap[aquaStatus] || 'payment_unpaid';
  }

  private getAquaTokenId(tokenSymbol: string): string {
    const tokenMap: Record<string, string> = {
      XLM: 'xlm',
      USDC_XLM: 'usdc',
      USDC: 'usdc',
    };

    return tokenMap[tokenSymbol] || 'xlm';
  }

  private mapAquaTokenToSymbol(aquaTokenId: string): string {
    const tokenMap: Record<string, string> = {
      xlm: 'XLM',
      usdc: 'USDC_XLM',
    };

    return tokenMap[aquaTokenId] || 'XLM';
  }

  private generateExternalId(paymentData: PaymentRequest): string {
    const intent = paymentData.display.intent.toLowerCase().replace(/\s+/g, '_');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);

    return `${intent}_${timestamp}_${random}`;
  }

  private getCallbackUrl(): string {
    // Use environment variable or construct from current function URL
    const baseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
    return `${baseUrl}/functions/v1/webhook-handler?provider=aqua&token=${Deno.env.get('AQUA_WEBHOOK_TOKEN') || 'webhook-token'}`;
  }

  // Stellar address validation
  isValidStellarAddress(address: string): boolean {
    // Basic Stellar address validation (56 characters, starts with G)
    const stellarRegex = /^G[A-Z0-9]{55}$/;
    return stellarRegex.test(address);
  }

  // Stellar amount validation (7 decimal places max)
  isValidStellarAmount(amount: string): boolean {
    try {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) return false;

      // Check decimal places (Stellar supports up to 7)
      const decimalPlaces = (amount.split('.')[1] || '').length;
      return decimalPlaces <= 7;
    } catch {
      return false;
    }
  }
}
