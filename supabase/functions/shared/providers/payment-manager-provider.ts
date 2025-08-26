// Payment Manager Provider for Edge Functions
// Updated to handle new webhook structure and be the primary provider
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
        name: paymentData.display.intent,
        description: paymentData.display.intent,
        logoUrl: paymentData.metadata?.logoUrl || 'https://www.rozo.ai/rozo-logo.png',
      },
      payinchainid: this.mapChainIdToPaymentManagerFormat(preferredChainId),
      payintokenaddress:
        paymentData.preferredTokenAddress ||
        this.mapTokenToPaymentManagerFormat(paymentData.preferredToken, preferredChainId),
      destination: {
        destinationAddress: paymentData.destination.destinationAddress,
        amountUnits: this.formatPaymentValue(paymentData.destination.amountUnits),
        chainId: paymentData.destination.chainId,
        tokenAddress: paymentData.destination.tokenAddress,
      },
      externalId: paymentData.metadata?.externalId,
      metadata: {
        ...paymentData.metadata,
        webhookUrl: paymentData.metadata?.webhookUrl || this.getWebhookUrl(),
      },
    };

    // Optional top-level receivingAddress
    if (paymentData.receivingAddress) {
      request.receivingAddress = paymentData.receivingAddress;
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
        intent: payment.display?.name || payment.display?.intent || '',
        currency: payment.display?.currency || 'USDC',
      },
      source: payment.source || null,
      destination: {
        destinationAddress:
          payment.destination?.destinationAddress || payment.receivingAddress || '',
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
        memo: payment.memo,
        payinchainid: payment.payinchainid,
        payintokenaddress: payment.payintokenaddress,
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

  private mapChainIdToPaymentManagerFormat(chainId: number): string {
    // Map chain IDs to Payment Manager format based on the provided table
    const chainMap: Record<number, string> = {
      // EVM Chains
      1: '1', // Ethereum Mainnet
      11155111: '11155111', // Sepolia Testnet
      8453: '8453', // Base
      42161: '42161', // Arbitrum
      10: '10', // Optimism
      137: '137', // Polygon
      56: '56', // BSC
      80001: '80001', // Mumbai Testnet

      // Solana Chains
      900: '900', // Solana Mainnet
      901: '901', // Solana Devnet

      // Stellar Chains
      1500: '1500', // Stellar Mainnet
      1501: '1501', // Stellar Testnet

      // Legacy mappings for backward compatibility
      10001: '1500', // Legacy Stellar mapping
      10002: '900', // Legacy Solana mapping
    };

    return chainMap[chainId] || chainId.toString();
  }

  private mapTokenToPaymentManagerFormat(token: string, chainId: number): string {
    // Map tokens to Payment Manager format based on the new chain IDs
    if (chainId === 1500 || chainId === 1501) {
      // Stellar tokens (Mainnet and Testnet)
      if (token === 'XLM') return 'XLM';
      if (token === 'USDC_XLM' || token === 'USDC')
        return 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    } else if (chainId === 900 || chainId === 901) {
      // Solana tokens (Mainnet and Devnet)
      if (token === 'USDC') return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    } else {
      // EVM tokens
      if (token === 'USDC') {
        const usdcAddresses: Record<number, string> = {
          1: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C', // Ethereum USDC
          10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // Optimism USDC
          137: '0x83ACD773450269b6c141F830192fd07748c0a8b1', // Polygon USDC
          42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum USDC
          8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
          56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC
          11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
          80001: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747', // Mumbai USDC
        };
        return usdcAddresses[chainId] || 'USDC';
      }
    }

    return token;
  }

  // "1000000" =》 "1000000.00"
  // "1" =》 "1.00"
  // "1.5" =》 "1.50"
  private formatPaymentValue(amount: string): string {
    // If already decimal (contains a dot), pass through
    if (typeof amount === 'string' && amount.includes('.')) return amount;
    // Otherwise assume USDC 6 decimals smallest units and convert
    const units = parseFloat(amount);
    if (!isFinite(units)) return amount;
    return (units).toFixed(2);
  }

  private getWebhookUrl(): string {
    const baseUrl = Deno.env.get('SUPABASE_URL') || '';
    return `${baseUrl}/functions/v1/webhook-handler?provider=payment-manager&token=${
      Deno.env.get('PAYMENT_MANAGER_WEBHOOK_TOKEN') || ''
    }`;
  }
}
