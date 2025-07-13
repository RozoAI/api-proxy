/**
 * Payment Service
 * Implements cache-first logic with database persistence
 */

import { PaymentRouter } from '../routing/router';
import { PaymentRequest, PaymentResponse } from '../types/payment';
import { PaymentRecord } from '../database/repositories/payments-repository';
import { PaymentsRepository } from '../database/repositories/payments-repository';
import { ProviderRegistry } from '../providers/registry';
import { initializeDatabase } from '../database/connection';

export class PaymentService {
  private paymentsRepository: PaymentsRepository;
  private router: PaymentRouter;
  private registry: ProviderRegistry;

  constructor(router: PaymentRouter, registry: ProviderRegistry) {
    // Initialize database connection
    initializeDatabase();
    this.paymentsRepository = new PaymentsRepository();
    this.router = router;
    this.registry = registry;
  }

  /**
   * Create payment with database persistence
   */
  async createPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Route the payment request to appropriate provider
      const paymentResponse = await this.router.routePaymentRequest(paymentRequest);

      // Determine provider name based on chain ID
      const chainId = parseInt(paymentRequest.destination.chainId);
      const providerName = this.registry.getProviderForChain(chainId)?.name || 'daimo';

      // Save to database after successful creation
      const result = await this.paymentsRepository.createPayment(
        paymentRequest,
        paymentResponse,
        providerName
      );

      console.log(`[PaymentService] Payment ${result.id} saved to database`);

      return { ...paymentResponse, id: result.id };
    } catch (error) {
      console.error('[PaymentService] Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID with cache-first logic
   */
  async getPaymentById(paymentId: string, chainId?: number): Promise<PaymentResponse | null> {
    try {
      // First, check database
      const cachedPayment = await this.paymentsRepository.getPaymentById(paymentId);

      if (!cachedPayment) {
        return null;
      }

      console.log(`[PaymentService] Found payment ${paymentId} in database`);

      // Check if payment is stale (status is 'started' and > 15 mins old)
      if (!this.paymentsRepository.isPaymentStale(cachedPayment, 15)) {
        // Return cached data for recent or completed payments
        console.log(`[PaymentService] Returning cached data for payment ${paymentId}`);
        return this.paymentsRepository.convertToPaymentResponse(cachedPayment);
      }

      console.log(`[PaymentService] Payment ${paymentId} is stale, fetching fresh data`);

      try {
        // Fetch fresh data from provider
        const freshPayment = await this.router.routeGetPayment(paymentId, chainId);

        // Update database with fresh data
        await this.paymentsRepository.updatePaymentStatus(paymentId, freshPayment.status);

        console.log(`[PaymentService] Updated payment ${paymentId} with fresh data`);
        return freshPayment;
      } catch (providerError) {
        console.warn(
          `[PaymentService] Failed to fetch fresh data for ${paymentId}, returning cached data:`,
          providerError
        );
        // Return cached data if provider fails
        return this.paymentsRepository.convertToPaymentResponse(cachedPayment);
      }
    } catch (error) {
      console.error(`[PaymentService] Error getting payment ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * Get payment by external ID with cache-first logic
   */
  async getPaymentByExternalId(externalId: string): Promise<PaymentResponse | null> {
    try {
      // First, check database
      const payment = await this.paymentsRepository.getPaymentByExternalId(externalId);
      if (!payment) {
        return null;
      }

      // Return cached data for recent or completed payments
      console.log(`[PaymentService] Returning cached data for external ID ${externalId}`);
      return this.paymentsRepository.convertToPaymentResponse(payment);
    } catch (error) {
      console.error(`[PaymentService] Error getting payment by external ID ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Update payment status (used by webhooks)
   */
  async updatePaymentStatus(paymentId: string, status: string): Promise<boolean> {
    try {
      const updated = await this.paymentsRepository.updatePaymentStatus(paymentId, status);

      if (updated) {
        console.log(`[PaymentService] Updated payment ${paymentId} status to ${status}`);
      } else {
        console.warn(
          `[PaymentService] Failed to update payment ${paymentId} - not found in database`
        );
      }

      return updated;
    } catch (error) {
      console.error(`[PaymentService] Error updating payment ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * Get payments by status for cleanup/monitoring
   */
  async getPaymentsByStatus(status: string, olderThanMinutes?: number): Promise<PaymentRecord[]> {
    return await this.paymentsRepository.getPaymentsByStatus(status, olderThanMinutes);
  }
}
