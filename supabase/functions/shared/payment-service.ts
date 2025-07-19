// Payment Service for Edge Functions
// Combines database operations with provider routing logic
import { PaymentDatabase } from './database.ts';
import { PaymentRouter } from './payment-router.ts';
import type { PaymentRequest, PaymentResponse } from './types.ts';

export class PaymentService {
  private db: PaymentDatabase;
  private router: PaymentRouter;

  constructor() {
    this.db = new PaymentDatabase();
    this.router = new PaymentRouter();
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    console.log('[PaymentService] Creating payment:', paymentData);

    // Route to appropriate provider based on chain ID
    const paymentResponse = await this.router.createPayment(paymentData);

    // Save to database
    const providerName = this.router.getProviderForChain(paymentData.destination.chainId);
    await this.db.createPayment(paymentData, paymentResponse, providerName);

    console.log('[PaymentService] Payment created successfully:', paymentResponse.id);
    return paymentResponse;
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
}
