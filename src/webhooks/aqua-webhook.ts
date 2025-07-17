/**
 * Aqua Webhook Handler
 * Processes Aqua webhook events with token-based authentication
 */

import {
  AquaWebhookEvent,
  WebhookHandler,
  WebhookValidationResult,
  WebhookResponse,
} from '../types/webhook';
import { PaymentService } from '../services/payment-service';
import { WithdrawalIntegrationService } from '../services/withdrawal-integration-service';
import { PaymentsRepository } from '../database/repositories/payments-repository';

export class AquaWebhookHandler implements WebhookHandler {
  private paymentService: PaymentService;
  private webhookToken: string;
  private withdrawalIntegration: WithdrawalIntegrationService;
  private paymentsRepository: PaymentsRepository;

  constructor(paymentService: PaymentService, webhookToken: string) {
    this.paymentService = paymentService;
    this.webhookToken = webhookToken;
    this.withdrawalIntegration = new WithdrawalIntegrationService();
    this.paymentsRepository = new PaymentsRepository();
  }

  /**
   * Validate Aqua webhook with token-based authentication
   */
  validateWebhook(
    headers: Record<string, string>,
    body: unknown,
    query?: Record<string, string>
  ): WebhookValidationResult {
    const errors: string[] = [];

    try {
      // Check for authentication token in query parameters
      if (!query || !query.token) {
        errors.push('Missing authentication token in query parameters');
        return { isValid: false, errors };
      }

      // Verify token
      if (query.token !== this.webhookToken) {
        errors.push('Invalid authentication token');
        return { isValid: false, errors };
      }

      // Type check the body
      if (!body || typeof body !== 'object') {
        errors.push('Invalid request body');
        return { isValid: false, errors };
      }

      const typedBody = body as Record<string, unknown>;

      // Validate event structure based on aqua.md
      if (!typedBody.invoice_id) {
        errors.push('Missing invoice_id');
      }

      if (!typedBody.status) {
        errors.push('Missing status');
      }

      if (!typedBody.amount) {
        errors.push('Missing amount');
      }

      if (!typedBody.address) {
        errors.push('Missing address');
      }

      if (!typedBody.token_id) {
        errors.push('Missing token_id');
      }

      // Validate status values
      const validStatuses = ['failed', 'paid', 'created', 'retry', 'deleted'];
      if (typedBody.status && !validStatuses.includes(typedBody.status as string)) {
        errors.push(`Invalid status: ${typedBody.status}`);
      }

      // Validate mode if present
      if (typedBody.mode && !['default', 'web3'].includes(typedBody.mode as string)) {
        errors.push(`Invalid mode: ${typedBody.mode}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('[AquaWebhook] Validation error:', error);
      errors.push('Webhook validation failed');
      return { isValid: false, errors };
    }
  }

  /**
   * Process Aqua webhook event
   */
  async processWebhook(event: AquaWebhookEvent): Promise<WebhookResponse> {
    try {
      console.log(
        `[AquaWebhook] Processing status update for invoice ${event.invoice_id}: ${event.status}`
      );

      // Map Aqua statuses to internal payment statuses
      const internalStatus = this.mapAquaStatusToInternal(event.status);

      // Try to find payment by external ID (invoice_id)
      // Since Aqua uses invoice_id as the external identifier
      try {
        const existingPayment = await this.paymentService.getPaymentByExternalId(event.invoice_id);
        if (!existingPayment) {
          console.warn(`[AquaWebhook] Payment not found for invoice ${event.invoice_id}`);
          return {
            success: false,
            error: `Payment not found for invoice ${event.invoice_id}`,
          };
        }

        // Update existing payment
        const updated = await this.paymentService.updatePaymentStatus(
          existingPayment.id,
          internalStatus
        );

        if (updated) {
          console.log(
            `[AquaWebhook] Successfully updated payment ${existingPayment.id} to status ${internalStatus}`
          );

          // NEW: Trigger withdrawal if payment completed
          if (internalStatus === 'payment_completed') {
            try {
              // Get the payment record for withdrawal processing
              const paymentRecord = await this.paymentsRepository.getPaymentById(
                existingPayment.id
              );
              if (paymentRecord) {
                await this.withdrawalIntegration.handlePaymentCompletion(paymentRecord);
              }
            } catch (error) {
              console.error('[AquaWebhook] Failed to trigger withdrawal:', error);
            }
          }

          return {
            success: true,
            message: `Payment ${existingPayment.id} updated to ${internalStatus}`,
          };
        } else {
          console.warn(`[AquaWebhook] Failed to update payment ${existingPayment.id}`);
          return {
            success: false,
            error: `Failed to update payment ${existingPayment.id}`,
          };
        }
      } catch (error) {
        console.error(`[AquaWebhook] Error finding payment by external ID:`, error);
        return {
          success: false,
          error: `Error finding payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    } catch (error) {
      console.error(`[AquaWebhook] Error processing webhook:`, error);
      console.error(`[AquaWebhook] Full webhook payload:`, JSON.stringify(event, null, 2));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get event type for this handler
   */
  getEventType(): string {
    return 'aqua';
  }

  /**
   * Map Aqua statuses to internal payment statuses
   */
  private mapAquaStatusToInternal(aquaStatus: string): string {
    switch (aquaStatus) {
      case 'created':
        return 'payment_unpaid';
      case 'paid':
        return 'payment_completed';
      case 'failed':
        return 'payment_bounced';
      case 'retry':
        return 'payment_started';
      case 'deleted':
        return 'payment_bounced';
      default:
        console.warn(`[AquaWebhook] Unknown Aqua status: ${aquaStatus}`);
        return 'payment_unpaid';
    }
  }

  /**
   * Get token symbol from Aqua token ID
   */
  private getTokenSymbolFromTokenId(tokenId: string): string {
    // Map common Aqua token IDs to symbols
    // This could be enhanced with a more comprehensive mapping
    switch (tokenId.toLowerCase()) {
      case 'xlm':
      case 'stellar':
        return 'XLM';
      case 'usdc':
      case 'usdc_xlm':
        return 'USDC_XLM';
      default:
        return tokenId.toUpperCase();
    }
  }
}
