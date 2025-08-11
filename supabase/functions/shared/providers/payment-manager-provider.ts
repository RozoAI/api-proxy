// Payment Manager Provider for Edge Functions
// Uses Daimo-like API structure with payinchainid and payintokenaddress
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  ProviderConfig,
  ProviderHealth,
} from '../types.ts';
import { BaseProvider } from './base-provider.ts';

export class PaymentManagerProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest(
      'POST',
      `${this.config.baseUrl}/functions/v1/rozo-payment-manager/api/payment`,
      paymentData
    );

    try {
      const paymentManagerRequest = this.transformToPaymentManagerRequest(paymentData);

      const response = await this.makeRequest(
        `${this.config.baseUrl}/functions/v1/rozo-payment-manager/api/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': this.config.apiKey || '',
          },
          body: JSON.stringify(paymentManagerRequest),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Payment Manager API error ${response.status}: ${errorText || 'Unknown error'}`
        );
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from Payment Manager API');
      }

      const responseData = JSON.parse(responseText);
      this.logResponse(response, responseData);

      return this.transformFromPaymentManagerResponse(responseData, paymentData);
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
          `Payment Manager API error: ${response.status} - ${
            responseData.error || 'Payment not found'
          }`
        );
      }

      return this.transformFromPaymentManagerResponse(responseData);
    } catch (error) {
      this.logError(error as Error, 'getPayment');
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
    };
  }

  private transformToPaymentManagerRequest(paymentData: PaymentRequest): any {
    const preferredChainId = parseInt(paymentData.preferredChain);

    // Build request per new API structure
    const request: any = {
      display: {
        intent: paymentData.display.intent,
        paymentValue: this.formatPaymentValue(paymentData.destination.amountUnits),
        currency: paymentData.display.currency || 'USDC',
      },
      payinchainid: preferredChainId,
      destination: {
        destinationAddress: paymentData.destination.destinationAddress,
        chainId: parseInt(paymentData.destination.chainId),
        tokenAddress: paymentData.destination.tokenAddress,
        amountUnits: this.formatPaymentValue(paymentData.destination.amountUnits),
      },
      externalId: paymentData.metadata?.externalId,
      metadata: {
        ...paymentData.metadata,
        webhookUrl: paymentData.metadata?.webhookUrl || this.getWebhookUrl(),
      },
    };

    // Include payintokenaddress from preferredTokenAddress if provided, else fallback to destination token address
    const payinToken = paymentData.preferredTokenAddress || paymentData.destination.tokenAddress;
    if (payinToken) {
      request.payintokenaddress = payinToken;
    }

    return request;
  }

  private transformFromPaymentManagerResponse(
    paymentManagerResponse: any,
    originalRequest?: PaymentRequest
  ): PaymentResponse {
    const payment = paymentManagerResponse.payment || paymentManagerResponse;

    return {
      id: payment.id,
      status: this.mapPaymentManagerStatus(payment.status),
      createdAt: payment.createdAt || payment.created_at,
      display: {
        intent: payment.display?.intent || '',
        currency: payment.display?.currency || 'USDC',
      },
      source: payment.source || null,
      destination: {
        destinationAddress: payment.receivingAddress || '',
        txHash: payment.destination?.txHash || null,
        chainId: payment.destination?.chainId?.toString() || '',
        amountUnits: payment.destination?.amountUnits || '',
        tokenSymbol: originalRequest?.destination?.tokenSymbol || 'USDC',
        tokenAddress: payment.destination?.tokenAddress || '',
      },
      externalId: payment.externalId || payment.external_id,
      metadata: {
        ...payment.metadata,
        provider: 'payment-manager',
        receivingAddress: payment.receivingAddress,
        forwarderSalt: payment.forwarderSalt,
        masterForwarderAddress: payment.masterForwarderAddress,
        forwarderDeployed: payment.forwarderDeployed,
        destinationChain: payment.destinationChain,
        destinationEcosystem: payment.destinationEcosystem,
      },
      url: paymentManagerResponse.url || payment.url,
    };
  }

  private mapPaymentManagerStatus(paymentManagerStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      payment_unpaid: 'payment_unpaid',
      payment_started: 'payment_started',
      payment_completed: 'payment_completed',
      payment_bounced: 'payment_bounced',
      payment_refunded: 'payment_refunded',
    };

    return statusMap[paymentManagerStatus] || 'payment_unpaid';
  }

  private formatPaymentValue(amount: string): string {
    // If already decimal (contains a dot), pass through
    if (typeof amount === 'string' && amount.includes('.')) return amount;
    // Otherwise assume USDC 6 decimals smallest units and convert
    const units = parseFloat(amount);
    if (!isFinite(units)) return amount;
    return (units / 1_000_000).toFixed(6).replace(/\.0+$/, '');
  }

  private getWebhookUrl(): string {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    return `${baseUrl}/functions/v1/webhook-handler?provider=payment-manager&token=${
      Deno.env.get('PAYMENT_MANAGER_WEBHOOK_TOKEN') || ''
    }`;
  }
}
