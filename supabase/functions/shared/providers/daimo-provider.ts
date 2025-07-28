// Daimo Provider for Edge Functions
// Acts as a pure proxy - passes requests through to Daimo using their actual API format
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
    this.logRequest('POST', `${this.config.baseUrl}/api/payment`, paymentData);

    try {
      const response = await this.makeRequest(`${this.config.baseUrl}/api/payment`, {
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

      // For Base chain payments, fetch deposit address from Rozo API
      let depositAddressDetails = null;
      if (paymentData.preferredChain === '8453') {
        // Base chain
        try {
          depositAddressDetails = await this.fetchDepositAddressFromRozo(responseData.id);
        } catch (error) {
          console.warn('[DaimoProvider] Failed to fetch deposit address from Rozo:', error);
          // Don't fail the payment creation if Rozo API fails
        }
      }

      return this.transformFromDaimoResponse(responseData, paymentData, depositAddressDetails);
    } catch (error) {
      this.logError(error as Error, 'createPayment');
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/api/payment/${paymentId}`);

    try {
      const response = await this.makeRequest(`${this.config.baseUrl}/api/payment/${paymentId}`, {
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

  private stringifyMetadata(metadata: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return result;
  }

  private transformToDaimoRequest(paymentData: PaymentRequest): any {
    // Transform our format to match Daimo's actual API format
    // Reference: https://paydocs.daimo.com/payments-api#create-a-payment

    // Check if destination token is USDC_XLM - if so, use USDC Base address from env
    const isUSDCXLMDestination = paymentData.destination.tokenSymbol === 'USDC_XLM';

    console.log('[DEBUG] [daimo] USDC_XLM conversion check:', {
      preferredToken: paymentData.preferredToken,
      destinationTokenSymbol: paymentData.destination.tokenSymbol,
      isUSDCXLMDestination: isUSDCXLMDestination,
      originalAddress: paymentData.destination.destinationAddress,
    });

    const finalDestination = isUSDCXLMDestination
      ? {
          destinationAddress:
            Deno.env.get('USDC_BASE_ADDRESS') || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          chainId: 8453, // Base chain ID
          tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          amountUnits: paymentData.destination.amountUnits,
        }
      : {
          destinationAddress: paymentData.destination.destinationAddress,
          chainId: parseInt(paymentData.destination.chainId),
          tokenAddress: paymentData.destination.tokenAddress,
          amountUnits: paymentData.destination.amountUnits,
        };

    console.log('[DEBUG] [daimo] Final destination:', finalDestination);

    return {
      display: {
        intent: paymentData.display.intent,
        // Map our preferredChain to Daimo's preferredChains array
        preferredChains: [parseInt(paymentData.preferredChain)],
        // For XLM, use USDC Base token; otherwise use original
        ...(finalDestination.tokenAddress && {
          preferredTokens: [
            {
              chain: parseInt(paymentData.preferredChain),
              address: finalDestination.tokenAddress,
            },
          ],
        }),
      },
      destination: finalDestination,
      // Include optional fields from our metadata
      ...(paymentData.metadata?.externalId && { externalId: paymentData.metadata.externalId }),
      metadata: {
        // Convert all metadata values to strings as required by Daimo
        ...this.stringifyMetadata(paymentData.metadata || {}),
        // Store our routing context for tracking
        preferred_chain: String(paymentData.preferredChain),
        preferred_token: String(paymentData.preferredToken),
        // Mark if this is a USDC_XLM conversion
        is_usdc_xlm_conversion: String(isUSDCXLMDestination),
        // Store the ORIGINAL withdrawal destination for later processing
        withdrawal_destination: JSON.stringify({
          address: paymentData.destination.destinationAddress,
          chainId: paymentData.destination.chainId,
          tokenAddress: paymentData.destination.tokenAddress,
          tokenSymbol: paymentData.destination.tokenSymbol,
          isUSDCXLM: isUSDCXLMDestination,
        }),
      },
    };
  }

  private transformFromDaimoResponse(
    daimoResponse: any,
    originalRequest?: PaymentRequest,
    depositAddressDetails?: any
  ): PaymentResponse {
    // Daimo returns the payment object inside a wrapper for create, or directly for get
    const payment = daimoResponse.payment || daimoResponse;

    return {
      id: payment.id || `daimo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: this.mapDaimoStatus(payment.status || 'payment_unpaid') as PaymentStatus,
      createdAt: payment.createdAt?.toString() || Date.now().toString(),
      display: {
        intent: payment.display?.intent || originalRequest?.display.intent || '',
        currency: payment.display?.currency || originalRequest?.display.currency || 'USD',
      },
      source: payment.source || null,
      destination: {
        destinationAddress: depositAddressDetails?.address || '',
        txHash: payment.destination?.txHash || null,
        chainId: payment.destination?.chainId?.toString() || '',
        amountUnits: payment.destination?.amountUnits || '',
        tokenSymbol: payment.destination?.tokenSymbol || '',
        tokenAddress: payment.destination?.tokenAddress || '',
      },
      externalId: payment.externalId || null,
      metadata: {
        ...payment.metadata,
        provider: 'daimo',
        preferred_chain: originalRequest?.preferredChain || payment.metadata?.preferred_chain,
        preferred_token: originalRequest?.preferredToken || payment.metadata?.preferred_token,
        // Add deposit expiration for Base chain payments
        ...(depositAddressDetails && {
          deposit_expiration: depositAddressDetails.expirationS,
        }),
      },
      url:
        daimoResponse.url?.replace('https://pay.daimo.com', 'https://intentapi.rozo.ai') ||
        `${this.config.baseUrl}/checkout?id=${payment.id}`,
      // Add deposit expiration for Base chain payments
      ...(depositAddressDetails && {
        depositExpiration: depositAddressDetails.expirationS,
      }),
    };
  }

  private async fetchDepositAddressFromRozo(orderId: string): Promise<any> {
    const rozoUrl = 'https://intentapi.rozo.ai/getDepositAddressForOrder';
    const params = new URLSearchParams({
      batch: '1',
      input: JSON.stringify({
        '0': {
          orderId: orderId,
          option: 'Base',
        },
      }),
    });

    const fullUrl = `${rozoUrl}?${params.toString()}`;
    console.log('[DaimoProvider] Fetching deposit address from Rozo:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Rozo API error ${response.status}: ${await response.text()}`);
    }

    const responseData = await response.json();
    console.log('[DaimoProvider] Rozo API response:', responseData);

    // Extract the first result from the array
    if (Array.isArray(responseData) && responseData.length > 0) {
      const result = responseData[0];
      if (result.result?.data) {
        return {
          address: result.result.data.address,
          expirationS: result.result.data.expirationS,
        };
      }
    }

    throw new Error('Invalid response format from Rozo API');
  }

  private mapDaimoStatus(daimoStatus: string): string {
    // Daimo status mapping based on their documentation
    const statusMap: Record<string, string> = {
      payment_unpaid: 'payment_unpaid',
      payment_started: 'payment_started',
      payment_completed: 'payment_completed',
      payment_bounced: 'payment_bounced',
      // Note: Daimo doesn't mention payment_refunded in current docs, but keeping for compatibility
      payment_refunded: 'payment_refunded',
    };

    return statusMap[daimoStatus] || daimoStatus;
  }
}
