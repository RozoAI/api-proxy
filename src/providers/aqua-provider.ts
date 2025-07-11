/**
 * Aqua Provider Implementation
 * Handles payments for Stellar blockchain (XLM, USDC_XLM) with real API integration
 */

import { BaseProvider } from './base-provider';
import { PaymentRequest, PaymentResponse, ValidationResult } from '../types/payment';
import { ProviderConfig } from '../types/provider';
import { getChainsByProvider, CHAIN_IDS } from '../config/chains';
import { AquaApiClient, AquaApiConfig } from './aqua-api-client';
import { 
  transformDaimoToAquaRequest, 
  transformAquaResponseToDaimo,
  validateStellarAddress,
  validateStellarAmount,
  validateStellarToken
} from '../utils/aqua-transformation';

export class AquaProvider extends BaseProvider {
  private aquaClient: AquaApiClient;
  private webhookToken: string;

  constructor(config: ProviderConfig) {
    // Get all chains configured for Aqua
    const aquaChains = getChainsByProvider('aqua').map(chain => chain.chainId);
    super(config, aquaChains);
    
    // Initialize Aqua API client
    const apiConfig: AquaApiConfig = {
      baseUrl: process.env.AQUA_BASE_URL || config.baseUrl,
      apiToken: process.env.AQUA_API_TOKEN || '',
      timeout: parseInt(process.env.AQUA_TIMEOUT || '30000')
    };
    
    this.aquaClient = new AquaApiClient(apiConfig);
    this.webhookToken = process.env.AQUA_WEBHOOK_TOKEN || 'default-webhook-token';
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    this.logRequest('POST', `${this.config.baseUrl}/api/payment`, paymentData);

    try {
      // Validate Stellar-specific requirements
      const validation = this.validateRequest(paymentData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Transform Daimo request to Aqua format
      const aquaRequest = transformDaimoToAquaRequest(paymentData, this.webhookToken);

      // Create invoice via Aqua API
      const aquaResponse = await this.aquaClient.createInvoice(aquaRequest);

      // Transform Aqua response back to Daimo format
      const daimoResponse = transformAquaResponseToDaimo(aquaResponse, paymentData);

      this.logResponse(200, daimoResponse);
      console.log('[AquaProvider] Payment created successfully:', daimoResponse.id);
      
      return daimoResponse;

    } catch (error) {
      console.error('[AquaProvider] Error creating payment:', error);
      this.logResponse(500, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to create Aqua payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/api/payment/${paymentId}`);

    try {
      // Get fresh data from Aqua API
      const aquaResponse = await this.aquaClient.getInvoice(paymentId);
      
      // Transform Aqua response back to Daimo format
      const daimoResponse = transformAquaResponseToDaimo(aquaResponse);

      this.logResponse(200, daimoResponse);
      console.log('[AquaProvider] Payment retrieved successfully:', paymentId);
      
      return daimoResponse;

    } catch (error) {
      console.error('[AquaProvider] Error getting payment:', error);
      this.logResponse(500, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Failed to get Aqua payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPaymentByExternalId(externalId: string): Promise<PaymentResponse> {
    this.logRequest('GET', `${this.config.baseUrl}/api/payment/external-id/${externalId}`);

    try {
      // Note: Aqua API doesn't have external ID lookup, so we'll need to maintain
      // a mapping in the database or use metadata search
      // For now, throw an error to indicate this needs to be implemented
      throw new Error('External ID lookup not yet implemented for Aqua provider');

    } catch (error) {
      console.error('[AquaProvider] Error getting payment by external ID:', error);
      this.logResponse(500, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  override validateRequest(paymentData: PaymentRequest): ValidationResult {
    const baseValidation = super.validateRequest(paymentData);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors: string[] = [];

    // Aqua-specific validations
    const chainId = parseInt(paymentData.destination.chainId);
    
    // Only support Stellar chain for now
    if (chainId !== CHAIN_IDS.STELLAR) {
      errors.push(`Chain ID ${chainId} is not supported by Aqua provider (only ${CHAIN_IDS.STELLAR} supported)`);
    }

    // Validate Stellar address format
    if (!validateStellarAddress(paymentData.destination.destinationAddress)) {
      errors.push('Invalid Stellar address format');
    }

    // Validate supported tokens
    const tokenSymbol = 'tokenSymbol' in paymentData.destination ? paymentData.destination.tokenSymbol : undefined;
    if (!tokenSymbol || !validateStellarToken(tokenSymbol)) {
      errors.push(`Token ${tokenSymbol || 'undefined'} is not supported by Aqua provider. Supported: XLM, USDC_XLM`);
    }

    // Validate amount
    if (!validateStellarAmount(paymentData.destination.amountUnits)) {
      errors.push('Invalid amount: must be positive and within Stellar limits');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  override async isHealthy(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Check Aqua API health
      const isHealthy = await this.aquaClient.healthCheck();
      
      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        console.log(`[${this.name}] Health check passed in ${responseTime}ms`);
      } else {
        console.warn(`[${this.name}] Health check failed in ${responseTime}ms`);
      }
      
      return isHealthy;
      
    } catch (error) {
      console.error(`[${this.name}] Health check failed:`, error);
      return false;
    }
  }

  /**
   * Get Aqua API client configuration (for debugging)
   */
  getApiConfig(): Partial<AquaApiConfig> {
    return this.aquaClient.getConfig();
  }

  /**
   * Get webhook token (for debugging)
   */
  getWebhookToken(): string {
    return this.webhookToken;
  }

  /**
   * Handle webhook events from Aqua
   */
  async handleWebhookEvent(eventData: any): Promise<void> {
    try {
      console.log('[AquaProvider] Processing webhook event:', eventData);

      // Transform Aqua webhook event to internal format
      const paymentResponse = transformAquaResponseToDaimo(eventData);

      // Log the webhook event
      console.log('[AquaProvider] Webhook event processed:', {
        invoiceId: paymentResponse.id,
        status: paymentResponse.status,
        txHash: paymentResponse.destination.txHash
      });

      // Here you could emit events or update database
      // For now, just log the successful processing

    } catch (error) {
      console.error('[AquaProvider] Error processing webhook event:', error);
      throw error;
    }
  }
} 