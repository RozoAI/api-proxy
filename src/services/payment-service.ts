/**
 * Payment Service
 * Implements cache-first logic with database persistence
 */

import { PaymentRouter } from '../routing/router';
import { PaymentRequest, PaymentResponse } from '../types/payment';
import { PaymentRecord } from '../database/repositories/payments-repository.js';
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
      await this.paymentsRepository.createPayment(paymentRequest, paymentResponse, providerName);

      console.log(`[PaymentService] Payment ${paymentResponse.id} saved to database`);

      return paymentResponse;
    } catch (error) {
      console.error('[PaymentService] Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID with cache-first logic
   */
  async getPaymentById(paymentId: string, chainId?: number): Promise<PaymentResponse> {
    try {
      // First, check database
      const cachedPayment = await this.paymentsRepository.getPaymentById(paymentId);

      if (cachedPayment) {
        console.log(`[PaymentService] Found payment ${paymentId} in database`);

        // Check if payment is stale (status is 'started' and > 15 mins old)
        if (this.paymentsRepository.isPaymentStale(cachedPayment, 15)) {
          console.log(`[PaymentService] Payment ${paymentId} is stale, fetching fresh data`);

          try {
            // Fetch fresh data from provider
            const freshPayment = await this.router.routeGetPayment(paymentId, chainId);

            // Update database with fresh data
            await this.paymentsRepository.updatePaymentStatus(
              paymentId,
              freshPayment.status,
              freshPayment
            );

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
        } else {
          // Return cached data for recent or completed payments
          console.log(`[PaymentService] Returning cached data for payment ${paymentId}`);
          return this.paymentsRepository.convertToPaymentResponse(cachedPayment);
        }
      } else {
        // Payment not in database, fetch from provider
        console.log(
          `[PaymentService] Payment ${paymentId} not found in database, fetching from provider`
        );
        return await this.router.routeGetPayment(paymentId, chainId);
      }
    } catch (error) {
      console.error(`[PaymentService] Error getting payment ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * Get payment by external ID with cache-first logic
   */
  async getPaymentByExternalId(externalId: string, chainId?: number): Promise<PaymentResponse> {
    try {
      // First, check database
      const cachedPayment = await this.paymentsRepository.getPaymentByExternalId(externalId);

      if (cachedPayment) {
        console.log(`[PaymentService] Found payment with external ID ${externalId} in database`);

        // Check if payment is stale (status is 'started' and > 15 mins old)
        if (this.paymentsRepository.isPaymentStale(cachedPayment, 15)) {
          console.log(
            `[PaymentService] Payment with external ID ${externalId} is stale, fetching fresh data`
          );

          try {
            // Fetch fresh data from provider
            const freshPayment = await this.router.routeGetPaymentByExternalId(externalId, chainId);

            // Update database with fresh data
            await this.paymentsRepository.updatePaymentStatus(
              cachedPayment.id,
              freshPayment.status,
              freshPayment
            );

            console.log(`[PaymentService] Updated payment ${cachedPayment.id} with fresh data`);
            return freshPayment;
          } catch (providerError) {
            console.warn(
              `[PaymentService] Failed to fetch fresh data for external ID ${externalId}, returning cached data:`,
              providerError
            );
            // Return cached data if provider fails
            return this.paymentsRepository.convertToPaymentResponse(cachedPayment);
          }
        } else {
          // Return cached data for recent or completed payments
          console.log(`[PaymentService] Returning cached data for external ID ${externalId}`);
          return this.paymentsRepository.convertToPaymentResponse(cachedPayment);
        }
      } else {
        // Payment not in database, fetch from provider
        console.log(
          `[PaymentService] Payment with external ID ${externalId} not found in database, fetching from provider`
        );
        return await this.router.routeGetPaymentByExternalId(externalId, chainId);
      }
    } catch (error) {
      console.error(`[PaymentService] Error getting payment by external ID ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Update payment status (used by webhooks)
   */
  async updatePaymentStatus(
    paymentId: string,
    status: string,
    providerResponse: PaymentResponse
  ): Promise<boolean> {
    try {
      const updated = await this.paymentsRepository.updatePaymentStatus(
        paymentId,
        status,
        providerResponse
      );

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
