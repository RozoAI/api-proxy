// Payment Service for Edge Functions
// Combines database operations with provider routing logic
import { PaymentDatabase } from './database.ts';
import { PaymentRouter } from './payment-router.ts';
import { AppConfigService } from './app-config.ts';
import type { PaymentRequest, PaymentResponse } from './types.ts';

export class PaymentService {
  private db: PaymentDatabase;
  private router: PaymentRouter;
  private appConfig: AppConfigService;

  constructor() {
    this.db = new PaymentDatabase();
    this.router = new PaymentRouter();
    this.appConfig = AppConfigService.getInstance();
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    console.log('[PaymentService] Creating payment:', paymentData);

    // Handle appId configuration
    const processedPaymentData = await this.processAppIdConfiguration(paymentData);

    // Route to appropriate provider based on chain ID
    const paymentResponse = await this.router.createPayment(processedPaymentData);

    // Save to database with appId
    const providerName = this.router.getProviderForChain(processedPaymentData.destination.chainId);
    await this.db.createPayment(processedPaymentData, paymentResponse, providerName);

    console.log('[PaymentService] Payment created successfully:', paymentResponse.id);
    return paymentResponse;
  }

  private async processAppIdConfiguration(paymentData: PaymentRequest): Promise<PaymentRequest> {
    // If no appId provided, use default
    const appId = paymentData.appId || 'rozoTestStellar';

    // Validate appId
    if (!this.appConfig.validateAppId(appId)) {
      throw new Error(`Invalid appId: ${appId}`);
    }

    // Check if app is enabled
    if (!this.appConfig.isAppEnabled(appId)) {
      throw new Error(`App ${appId} is disabled`);
    }

    // Get app configuration
    const appConfig = this.appConfig.getAppConfig(appId);
    if (!appConfig) {
      throw new Error(`App configuration not found for: ${appId}`);
    }

    console.log('[PaymentService] Using app configuration:', appConfig);

    // If destination address is not provided, use app's payout address
    if (!paymentData.destination.destinationAddress) {
      paymentData.destination.destinationAddress = appConfig.payoutAddress;
      console.log('[PaymentService] Using app payout address:', appConfig.payoutAddress);
    }

    // If token symbol is not provided, default to XLM for Stellar payments
    if (!paymentData.destination.tokenSymbol && paymentData.destination.chainId === '10001') {
      paymentData.destination.tokenSymbol = 'XLM';
      console.log('[PaymentService] Defaulting to XLM token for Stellar payment');
    }

    // Add appId to metadata for tracking
    if (!paymentData.metadata) {
      paymentData.metadata = {};
    }
    paymentData.metadata.appId = appId;
    paymentData.metadata.payoutToken = appConfig.payoutToken;
    paymentData.metadata.payoutAddress = appConfig.payoutAddress;

    return paymentData;
  }

  async getPaymentById(paymentId: string): Promise<PaymentResponse> {
    console.log('[PaymentService] Getting payment by ID:', paymentId);

    // First, check database (cache-first approach)
    const cachedPayment = await this.db.getPaymentById(paymentId);

    if (cachedPayment) {
      // Check if payment is stale and needs fresh data
      if (this.db.isPaymentStale(cachedPayment, 15)) {
        console.log('[PaymentService] Payment is stale, fetching fresh data');

        try {
          // Fetch fresh data from provider
          const freshPayment = await this.router.getPayment(paymentId, cachedPayment.chain_id);

          // Update database with fresh data
          await this.db.updatePaymentStatus(paymentId, freshPayment.status);

          return freshPayment;
        } catch (providerError) {
          console.warn(
            '[PaymentService] Failed to fetch fresh data, returning cached:',
            providerError
          );
          // Return cached data if provider fails
        }
      }

      // Return cached data
      return this.db.convertToPaymentResponse(cachedPayment);
    }

    // Payment not in database, return not found
    throw new Error('Payment not found');
  }

  async getPaymentByExternalId(externalId: string): Promise<PaymentResponse> {
    console.log('[PaymentService] Getting payment by external ID:', externalId);

    // Check database for external ID
    const cachedPayment = await this.db.getPaymentByExternalId(externalId);

    if (cachedPayment) {
      // Check if payment is stale and needs fresh data
      if (this.db.isPaymentStale(cachedPayment, 15)) {
        console.log('[PaymentService] Payment is stale, fetching fresh data');

        try {
          // Fetch fresh data from provider using the payment ID
          const freshPayment = await this.router.getPayment(
            cachedPayment.external_id!,
            cachedPayment.chain_id
          );

          // Update database with fresh data
          await this.db.updatePaymentStatus(cachedPayment.external_id!, freshPayment.status);

          return freshPayment;
        } catch (providerError) {
          console.warn(
            '[PaymentService] Failed to fetch fresh data, returning cached:',
            providerError
          );
          // Return cached data if provider fails
        }
      }

      // Return cached data
      return this.db.convertToPaymentResponse(cachedPayment);
    }

    // Payment not in database, return not found
    throw new Error('Payment not found');
  }

  // Helper method to get app configuration
  getAppConfig(appId: string) {
    return this.appConfig.getAppConfig(appId);
  }

  // Helper method to get all app configurations
  getAllAppConfigs() {
    return this.appConfig.getAllAppConfigs();
  }
}
