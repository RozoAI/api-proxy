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
    console.log('[PaymentService] Creating payment:', {
      preferredChain: paymentData.preferredChain,
      preferredToken: paymentData.preferredToken,
      preferredTokenAddress: paymentData.preferredTokenAddress,
      withdrawalAddress: paymentData.destination.destinationAddress,
      withdrawalAmount: paymentData.destination.amountUnits,
    });

    // Route to appropriate provider based on preferred chain
    const paymentResponse = await this.router.createPayment(paymentData);

    // Save to database with routing information
    const providerName = this.router.getProviderForChain(paymentData.preferredChain);
    await this.db.createPayment(paymentData, paymentResponse, providerName);

    console.log('[PaymentService] Payment created successfully:', {
      paymentId: paymentResponse.id,
      provider: providerName,
      status: paymentResponse.status,
    });
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
          // Fetch fresh data from provider using the original preferred chain
          const originalRequest = cachedPayment.original_request;
          const preferredChain = originalRequest?.preferredChain || cachedPayment.chain_id;

          const freshPayment = await this.router.getPayment(paymentId, preferredChain);

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
          // Fetch fresh data from provider using the external ID and original preferred chain
          const originalRequest = cachedPayment.original_request;
          const preferredChain = originalRequest?.preferredChain || cachedPayment.chain_id;

          const freshPayment = await this.router.getPayment(
            cachedPayment.external_id!,
            preferredChain
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
