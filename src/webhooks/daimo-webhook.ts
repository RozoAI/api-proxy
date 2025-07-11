/**
 * Daimo Webhook Handler
 * Processes Daimo webhook events with signature verification
 */

import crypto from 'crypto';
import { 
  DaimoWebhookEvent, 
  WebhookHandler, 
  WebhookValidationResult, 
  WebhookResponse,
  WebhookProcessingContext
} from '../types/webhook';
import { PaymentService } from '../services/payment-service';

export class DaimoWebhookHandler implements WebhookHandler {
  private paymentService: PaymentService;
  private webhookSecret: string;

  constructor(paymentService: PaymentService, webhookSecret: string) {
    this.paymentService = paymentService;
    this.webhookSecret = webhookSecret;
  }

  /**
   * Validate Daimo webhook with signature verification
   */
  validateWebhook(headers: Record<string, string>, body: any): WebhookValidationResult {
    const errors: string[] = [];

    try {
      // Check for authorization header
      const authHeader = headers['authorization'] || headers['Authorization'];
      if (!authHeader) {
        errors.push('Missing Authorization header');
        return { isValid: false, errors };
      }

      // Verify signature
      if (!this.verifySignature(authHeader, body)) {
        errors.push('Invalid webhook signature');
        return { isValid: false, errors };
      }

      // Validate event structure
      if (!body.type) {
        errors.push('Missing event type');
      }

      if (!body.paymentId) {
        errors.push('Missing payment ID');
      }

      if (!body.payment) {
        errors.push('Missing payment object');
      }

      // Validate event type
      const validTypes = ['payment_started', 'payment_completed', 'payment_bounced', 'payment_refunded'];
      if (body.type && !validTypes.includes(body.type)) {
        errors.push(`Invalid event type: ${body.type}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('[DaimoWebhook] Validation error:', error);
      errors.push('Webhook validation failed');
      return { isValid: false, errors };
    }
  }

  /**
   * Process Daimo webhook event
   */
  async processWebhook(event: DaimoWebhookEvent): Promise<WebhookResponse> {
    try {
      console.log(`[DaimoWebhook] Processing ${event.type} event for payment ${event.paymentId}`);

      // Map Daimo event types to internal payment statuses
      const internalStatus = this.mapDaimoStatusToInternal(event.type);
      
      // Update payment status in database
      const updated = await this.paymentService.updatePaymentStatus(
        event.paymentId,
        internalStatus,
        event.payment
      );

      if (updated) {
        console.log(`[DaimoWebhook] Successfully updated payment ${event.paymentId} to status ${internalStatus}`);
        
        // Handle duplicate webhook deliveries (idempotency)
        // The database update handles this automatically by checking if payment exists
        
        return {
          success: true,
          message: `Payment ${event.paymentId} updated to ${internalStatus}`
        };
      } else {
        console.warn(`[DaimoWebhook] Payment ${event.paymentId} not found in database`);
        return {
          success: false,
          error: `Payment ${event.paymentId} not found`
        };
      }

    } catch (error) {
      console.error(`[DaimoWebhook] Error processing webhook:`, error);
      console.error(`[DaimoWebhook] Full webhook payload:`, JSON.stringify(event, null, 2));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get event type for this handler
   */
  getEventType(): string {
    return 'daimo';
  }

  /**
   * Verify webhook signature using Daimo's webhook secret
   */
  private verifySignature(authHeader: string, body: any): boolean {
    try {
      // Extract token from "Basic <token>" format
      const token = authHeader.replace('Basic ', '');
      
      // Compare with configured webhook secret
      return token === this.webhookSecret;
    } catch (error) {
      console.error('[DaimoWebhook] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Map Daimo event types to internal payment statuses
   */
  private mapDaimoStatusToInternal(daimoEventType: string): string {
    switch (daimoEventType) {
      case 'payment_started':
        return 'payment_started';
      case 'payment_completed':
        return 'payment_completed';
      case 'payment_bounced':
        return 'payment_bounced';
      case 'payment_refunded':
        return 'payment_refunded';
      default:
        console.warn(`[DaimoWebhook] Unknown Daimo event type: ${daimoEventType}`);
        return 'payment_unpaid';
    }
  }

  /**
   * Create webhook processing context
   */
  createProcessingContext(
    headers: Record<string, string>,
    query: Record<string, string>,
    event: DaimoWebhookEvent
  ): WebhookProcessingContext {
    return {
      provider: 'daimo',
      eventType: event.type,
      paymentId: event.paymentId,
      timestamp: new Date(),
      headers,
      query
    };
  }
} 