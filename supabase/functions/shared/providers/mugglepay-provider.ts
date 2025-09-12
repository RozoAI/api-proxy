// MugglePay Provider for Edge Functions
// Supports BSC/BNB chain with USDT_BNB token payments
import { BaseProvider } from './base-provider.ts';
import type {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  ProviderConfig,
  ProviderHealth,
} from '../types.ts';

export class MugglePayProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/v1/orders`, paymentData);

    try {
      const mugglePayRequest = this.transformToMugglePayRequest(paymentData);

      const response = await this.makeRequest(`${this.config.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': `${this.config.apiKey}`,
        },
        body: JSON.stringify(mugglePayRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MugglePay API error ${response.status}: ${errorText || 'Unknown error'}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from MugglePay API');
      }

      const responseData = JSON.parse(responseText);
      this.logResponse(response, responseData);

      return this.transformFromMugglePayResponse(responseData, paymentData);
    } catch (error) {
      this.logError(error as Error, 'createPayment');
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    // Extract order ID from our internal payment ID format
    const orderId = paymentId.replace('mugglepay_order_', '');
    this.logRequest('GET', `${this.config.baseUrl}/v1/orders/${orderId}`);

    try {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/v1/orders/${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'token': `${this.config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MugglePay API error ${response.status}: ${errorText || 'Payment not found'}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from MugglePay API');
      }

      const responseData = JSON.parse(responseText);
      this.logResponse(response, responseData);

      return this.transformFromMugglePayResponse(responseData);
    } catch (error) {
      this.logError(error as Error, 'getPayment');
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const startTime = performance.now();

      // MugglePay doesn't have a dedicated health endpoint, so we'll use the merchant info endpoint
      const response = await this.makeRequest(
        `${this.config.baseUrl}/v1/user`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'token': `${this.config.apiKey}`,
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

  private transformToMugglePayRequest(paymentData: PaymentRequest): any {
    const paymentToken = this.getMugglePayToken(paymentData.preferredChain, paymentData.preferredToken);
    const merchantOrderId = this.generateMerchantOrderId(paymentData);
    
    return {
      merchant_order_id: merchantOrderId,
      price_amount: paymentData.destination.amountUnits,
      price_currency: paymentData.display.currency || 'USD',
      pay_currency: paymentToken, // e.g., "USDT_BNB" for BSC USDT
      title: paymentData.display.intent || 'Payment',
      description: `${paymentData.display.intent} - ${paymentData.destination.amountUnits} ${paymentData.display.currency}`,
      callback_url: this.getCallbackUrl(),
      cancel_url: this.getCancelUrl(),
      success_url: this.getSuccessUrl(),
      token: paymentToken,
      metadata: {
        rozo_external_id: this.generateExternalId(paymentData),
        rozo_intent: paymentData.display.intent,
        rozo_currency: paymentData.display.currency,
        // Store withdrawal information for later use
        withdrawal_destination: {
          address: paymentData.destination.destinationAddress,
          chainId: paymentData.destination.chainId,
          tokenSymbol: paymentData.destination.tokenSymbol,
          amountUnits: paymentData.destination.amountUnits,
        },
        preferred_chain: paymentData.preferredChain,
        preferred_token: paymentData.preferredToken,
        original_metadata: paymentData.metadata || {},
      },
    };
  }

  private getMugglePayToken(chainId: string, token: string): string {
    // Map chain and token combinations to MugglePay token format
    const tokenMap: Record<string, Record<string, string>> = {
      '56': { // BSC
        'USDT': 'USDT_BNB',
        'USDC': 'USDC_BNB',
        'BNB': 'BNB',
      },
      '1': { // Ethereum
        'USDT': 'USDT_ERC20',
        'USDC': 'USDC_ERC20',
        'ETH': 'ETH',
      },
      '137': { // Polygon
        'USDT': 'USDT_POLYGON',
        'USDC': 'USDC_POLYGON',
        'MATIC': 'MATIC',
      },
    };

    const chainTokens = tokenMap[chainId];
    if (chainTokens && chainTokens[token]) {
      return chainTokens[token];
    }

    // Default fallback - assume it's BSC USDT if not found
    console.warn(`[MugglePayProvider] Unknown chain/token combination: ${chainId}/${token}, defaulting to USDT_BNB`);
    return 'USDT_BNB';
  }

  private transformFromMugglePayResponse(
    mugglePayResponse: any,
    originalRequest?: PaymentRequest
  ): PaymentResponse {
    const paymentId = `mugglepay_order_${mugglePayResponse.order_id || mugglePayResponse.id || Date.now()}`;

    return {
      id: paymentId,
      status: this.mapMugglePayStatus(mugglePayResponse.status || 'NEW') as PaymentStatus,
      createdAt: mugglePayResponse.created_at
        ? Math.floor(new Date(mugglePayResponse.created_at).getTime()).toString()
        : Date.now().toString(),
      display: {
        intent: originalRequest?.display.intent || mugglePayResponse.metadata?.rozo_intent || mugglePayResponse.title || '',
        currency: originalRequest?.display.currency || mugglePayResponse.metadata?.rozo_currency || mugglePayResponse.price_currency || 'USD',
      },
      source: null, // MugglePay doesn't provide source information initially
      destination: {
        destinationAddress: originalRequest?.destination.destinationAddress || '',
        txHash: mugglePayResponse.txid || mugglePayResponse.transaction_hash || null,
        chainId: originalRequest?.preferredChain || this.getChainIdFromToken(mugglePayResponse.pay_currency || mugglePayResponse.token),
        amountUnits: originalRequest?.destination.amountUnits || mugglePayResponse.price_amount?.toString() || '',
        tokenSymbol: this.mapMugglePayTokenToSymbol(mugglePayResponse.pay_currency || mugglePayResponse.token),
        tokenAddress: this.getTokenAddress(mugglePayResponse.pay_currency || mugglePayResponse.token),
      },
      externalId: mugglePayResponse.metadata?.rozo_external_id || mugglePayResponse.merchant_order_id || null,
      metadata: {
        ...originalRequest?.metadata,
        ...mugglePayResponse.metadata?.original_metadata,
        mugglepay_order_id: mugglePayResponse.order_id || mugglePayResponse.id,
        mugglepay_status: mugglePayResponse.status,
        mugglepay_pay_currency: mugglePayResponse.pay_currency || mugglePayResponse.token,
        mugglepay_callback_url: mugglePayResponse.callback_url,
        provider: 'mugglepay',
      },
      url: mugglePayResponse.invoice_url || mugglePayResponse.payment_url || `${this.config.baseUrl}/invoice?order_id=${mugglePayResponse.order_id}`,
    };
  }

  private mapMugglePayStatus(mugglePayStatus: any): string {
    const statusMap: Record<string, string> = {
      'NEW': 'payment_unpaid',
      'PENDING': 'payment_started',
      'PAID': 'payment_completed',
      'EXPIRED': 'payment_bounced',
      'CANCELLED': 'payment_bounced',
      'FAILED': 'payment_bounced',
    };

    if (!mugglePayStatus || typeof mugglePayStatus !== 'string') {
      return 'payment_unpaid';
    }

    return statusMap[mugglePayStatus.toUpperCase()] || 'payment_unpaid';
  }

  private getChainIdFromToken(token: string): string {
    const tokenChainMap: Record<string, string> = {
      'USDT_BNB': '56',
      'USDC_BNB': '56',
      'BNB': '56',
      'USDT_ERC20': '1',
      'USDC_ERC20': '1',
      'ETH': '1',
      'USDT_POLYGON': '137',
      'USDC_POLYGON': '137',
      'MATIC': '137',
    };

    return tokenChainMap[token] || '56'; // Default to BSC
  }

  private mapMugglePayTokenToSymbol(mugglePayToken: string): string {
    if (!mugglePayToken || typeof mugglePayToken !== 'string') {
      return 'USDT';
    }

    const tokenMap: Record<string, string> = {
      'USDT_BNB': 'USDT',
      'USDC_BNB': 'USDC',
      'BNB': 'BNB',
      'USDT_ERC20': 'USDT',
      'USDC_ERC20': 'USDC',
      'ETH': 'ETH',
      'USDT_POLYGON': 'USDT',
      'USDC_POLYGON': 'USDC',
      'MATIC': 'MATIC',
    };

    return tokenMap[mugglePayToken] || 'USDT';
  }

  private getTokenAddress(mugglePayToken: string): string {
    if (!mugglePayToken || typeof mugglePayToken !== 'string') {
      return '';
    }

    // Common token addresses for different chains
    const tokenAddressMap: Record<string, string> = {
      // BSC
      'USDT_BNB': '0x55d398326f99059fF775485246999027B3197955',
      'USDC_BNB': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      'BNB': '0x0000000000000000000000000000000000000000',
      // Ethereum
      'USDT_ERC20': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'USDC_ERC20': '0xA0b86a33E6441Ecc94d7aADF96c825E7c5F4e7B3',
      'ETH': '0x0000000000000000000000000000000000000000',
      // Polygon
      'USDT_POLYGON': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      'USDC_POLYGON': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      'MATIC': '0x0000000000000000000000000000000000000000',
    };

    return tokenAddressMap[mugglePayToken] || '';
  }

  private generateExternalId(paymentData: PaymentRequest): string {
    const intent = (paymentData.display?.intent || 'payment').toLowerCase().replace(/\s+/g, '_');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);

    return `mugglepay_${intent}_${timestamp}_${random}`;
  }

  private generateMerchantOrderId(paymentData: PaymentRequest): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    
    return `rozo_${timestamp}_${random}`;
  }

  private getCallbackUrl(): string {
    // Use environment variable or construct from current function URL
    const baseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
    return `${baseUrl}/functions/v1/webhook-handler?provider=mugglepay&token=${Deno.env.get('MUGGLEPAY_WEBHOOK_TOKEN') || 'webhook-token'}`;
  }

  private getCancelUrl(): string {
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://bridge.rozo.ai';
    return `${frontendUrl}/payment/cancel`;
  }

  private getSuccessUrl(): string {
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://bridge.rozo.ai';
    return `${frontendUrl}/payment/success`;
  }

  // BSC/BNB address validation
  isValidBSCAddress(address: string): boolean {
    // Basic BSC/Ethereum address validation (42 characters, starts with 0x)
    const bscRegex = /^0x[a-fA-F0-9]{40}$/;
    return bscRegex.test(address);
  }

  // BSC amount validation (18 decimal places max for most tokens)
  isValidBSCAmount(amount: string): boolean {
    try {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) return false;

      // Check decimal places (most BSC tokens support up to 18)
      const decimalPlaces = (amount.split('.')[1] || '').length;
      return decimalPlaces <= 18;
    } catch {
      return false;
    }
  }
}