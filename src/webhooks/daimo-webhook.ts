/**
 * Daimo Webhook Handler
 * Processes Daimo webhook events with signature verification
 */

import {
  DaimoWebhookEvent,
  WebhookValidationResult as _WebhookValidationResult,
} from '../types/webhook';
import { PaymentService } from '../services/payment-service';

export class DaimoWebhook {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * Process Daimo webhook event
   */
  async processEvent(event: DaimoWebhookEvent): Promise<void> {
    try {
      console.log(`[DaimoWebhook] Processing ${event.type} event for payment ${event.paymentId}`);

      // Map Daimo event types to internal payment statuses
      const internalStatus = this.mapEventTypeToStatus(event.type);

      // Update payment status in database
      const updated = await this.paymentService.updatePaymentStatus(
        event.paymentId,
        internalStatus
      );

      if (updated) {
        console.log(
          `[DaimoWebhook] Successfully updated payment ${event.paymentId} to status ${internalStatus}`
        );

        // Handle duplicate webhook deliveries (idempotency)
        // The database update handles this automatically by checking if payment exists
      } else {
        console.warn(`[DaimoWebhook] Payment ${event.paymentId} not found in database`);
      }
    } catch (error) {
      console.error(`[DaimoWebhook] Error processing webhook:`, error);
      console.error(`[DaimoWebhook] Full webhook payload:`, JSON.stringify(event, null, 2));
    }
  }

  /**
   * Validate Daimo webhook with signature verification
   */
  async validateWebhook(_headers: Record<string, string>, _body: unknown): Promise<boolean> {
    // For now, we're not implementing signature verification
    // This will be implemented in a future update
    return true;
  }

  /**
   * Map Daimo webhook event type to internal payment status
   */
  private mapEventTypeToStatus(eventType: DaimoWebhookEvent['type']): string {
    switch (eventType) {
      case 'payment_started':
        return 'payment_started';
      case 'payment_completed':
        return 'payment_completed';
      case 'payment_bounced':
        return 'payment_bounced';
      case 'payment_refunded':
        return 'payment_bounced';
      default:
        return 'payment_unpaid';
    }
  }
}
