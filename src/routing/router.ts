/**
 * Payment Router Engine
 * Main routing logic for selecting providers and handling requests
 */

import { PaymentProvider } from '../types/provider';
import { PaymentRequest, PaymentResponse } from '../types/payment';
import { ProviderRegistry } from '../providers/registry';
import { RequestResponseTransformer } from '../utils/transformation';

export class PaymentRouter {
  private registry: ProviderRegistry;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  /**
   * Route a payment request to the appropriate provider
   */
  async routePaymentRequest(paymentData: PaymentRequest): Promise<PaymentResponse> {
    console.log(`[Router] Routing payment request for chain ${paymentData.destination.chainId}`);

    // Validate and sanitize the request
    const sanitizedRequest = RequestResponseTransformer.validateAndSanitizeRequest(paymentData);

    // Validate request structure
    const validation = RequestResponseTransformer.validateRequestStructure(sanitizedRequest);
    if (!validation.isValid) {
      throw new Error(`Invalid request structure: ${validation.errors.join(', ')}`);
    }

    // Extract chain ID
    const chainId = parseInt(sanitizedRequest.destination.chainId);
    if (isNaN(chainId)) {
      throw new Error(`Invalid chain ID: ${sanitizedRequest.destination.chainId}`);
    }

    // Select provider for this chain
    const provider = await this.selectProvider(chainId);
    if (!provider) {
      throw new Error(`No provider available for chain ${chainId}`);
    }

    console.log(`[Router] Selected provider: ${provider.name} for chain ${chainId}`);

    try {
      // Validate request with selected provider
      const providerValidation = provider.validateRequest(sanitizedRequest);
      if (!providerValidation.isValid) {
        throw new Error(`Provider validation failed: ${providerValidation.errors.join(', ')}`);
      }

      // Execute the payment request
      const response = await provider.createPayment(sanitizedRequest);

      // Transform response to ensure Daimo Pay format
      const transformedResponse = RequestResponseTransformer.transformToDaimoFormat(
        response,
        provider.name
      );

      transformedResponse.destination.destinationAddress =
        sanitizedRequest.destination.destinationAddress || '';
      transformedResponse.destination.tokenAddress =
        sanitizedRequest.destination.tokenAddress || '';

      console.log(`[Router] Successfully processed payment with ${provider.name}`);
      return transformedResponse;
    } catch (error) {
      console.error(`[Router] Error processing payment with ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Get payment by ID from the appropriate provider
   */
  async routeGetPayment(paymentId: string, chainId?: number): Promise<PaymentResponse> {
    console.log(`[Router] Routing get payment request for ID: ${paymentId}`);

    let provider: PaymentProvider | null = null;

    if (chainId) {
      // If chain ID is provided, use it to select provider
      provider = await this.selectProvider(chainId);
    } else {
      // Try to determine provider from payment ID format
      provider = this.determineProviderFromPaymentId(paymentId);
    }

    if (!provider) {
      throw new Error(`No provider available for payment ID: ${paymentId}`);
    }

    console.log(`[Router] Selected provider: ${provider.name} for payment ID: ${paymentId}`);

    try {
      const response = await provider.getPayment(paymentId);
      const transformedResponse = RequestResponseTransformer.transformToDaimoFormat(
        response,
        provider.name
      );

      console.log(`[Router] Successfully retrieved payment with ${provider.name}`);
      return transformedResponse;
    } catch (error) {
      console.error(`[Router] Error retrieving payment with ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Get payment by external ID from the appropriate provider
   */
  async routeGetPaymentByExternalId(
    externalId: string,
    chainId?: number
  ): Promise<PaymentResponse> {
    console.log(`[Router] Routing get payment by external ID request: ${externalId}`);

    let provider: PaymentProvider | null = null;

    if (chainId) {
      // If chain ID is provided, use it to select provider
      provider = await this.selectProvider(chainId);
    } else {
      // Try all providers to find the payment
      provider = await this.findProviderWithExternalId(externalId);
    }

    if (!provider) {
      throw new Error(`No provider found with external ID: ${externalId}`);
    }

    console.log(`[Router] Selected provider: ${provider.name} for external ID: ${externalId}`);

    try {
      const response = await provider.getPaymentByExternalId(externalId);
      const transformedResponse = RequestResponseTransformer.transformToDaimoFormat(
        response,
        provider.name
      );

      console.log(`[Router] Successfully retrieved payment with ${provider.name}`);
      return transformedResponse;
    } catch (error) {
      console.error(`[Router] Error retrieving payment with ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Select the appropriate provider for a chain ID
   */
  private async selectProvider(chainId: number): Promise<PaymentProvider | null> {
    // First try to get the specific provider for this chain
    const provider = this.registry.getProviderForChain(chainId);

    if (provider) {
      return provider;
    }

    // If no specific provider found, use Daimo as default
    const daimoProvider = this.registry.getProviderByName('daimo');
    if (daimoProvider) {
      console.log(`[Router] Using default provider (Daimo) for chain ${chainId}`);
      return daimoProvider;
    }

    return null;
  }

  /**
   * Determine provider from payment ID format
   */
  private determineProviderFromPaymentId(paymentId: string): PaymentProvider | null {
    // Try to determine provider based on payment ID format
    if (paymentId.startsWith('aqua_')) {
      return this.registry.getProviderByName('aqua');
    }

    // Default to Daimo for other formats
    return this.registry.getProviderByName('daimo');
  }

  /**
   * Find provider that has the external ID
   */
  private async findProviderWithExternalId(externalId: string): Promise<PaymentProvider | null> {
    const providers = this.registry.getAllProviders();

    for (const provider of providers) {
      try {
        // Try to get payment by external ID with each provider
        await provider.getPaymentByExternalId(externalId);
        return provider; // If successful, this provider has the payment
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }

    return null;
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): unknown {
    const stats = this.registry.getStats();
    return {
      ...stats,
      routingEngine: 'PaymentRouter',
      timestamp: new Date().toISOString(),
    };
  }
}
