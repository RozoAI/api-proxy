/**
 * Webhook Types & Interfaces
 * Defines webhook event structures for Daimo and Aqua providers
 */

import { PaymentResponse } from './payment';

// Base webhook interface
export interface BaseWebhookEvent {
  timestamp?: string;
  isTestEvent?: boolean;
}

// Webhook validation result
export interface WebhookValidationResult {
  isValid: boolean;
  errors: string[];
}

// Webhook response interface
export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Daimo webhook event types based on https://paydocs.daimo.com/webhooks#webhook-events
export interface DaimoWebhookEvent extends BaseWebhookEvent {
  type: 'payment_started' | 'payment_completed' | 'payment_bounced' | 'payment_refunded';
  paymentId: string;
  chainId: number;
  txHash: string;
  payment: PaymentResponse;
}

// Daimo payment started event
export interface DaimoPaymentStartedEvent extends DaimoWebhookEvent {
  type: 'payment_started';
}

// Daimo payment completed event
export interface DaimoPaymentCompletedEvent extends DaimoWebhookEvent {
  type: 'payment_completed';
}

// Daimo payment bounced event
export interface DaimoPaymentBouncedEvent extends DaimoWebhookEvent {
  type: 'payment_bounced';
}

// Daimo payment refunded event
export interface DaimoPaymentRefundedEvent extends DaimoWebhookEvent {
  type: 'payment_refunded';
  refundAddress: string;
  tokenAddress: string;
  amountUnits: string;
}

// Aqua webhook event based on aqua.md structure
export interface AquaWebhookEvent extends BaseWebhookEvent {
  invoice_id: string;
  status: 'failed' | 'paid' | 'created' | 'retry' | 'deleted';
  status_updated_at_t: number;
  transaction_hash?: string;
}

// Union type for all webhook events
export type WebhookEvent = DaimoWebhookEvent | AquaWebhookEvent;

// Webhook handler interface
export interface WebhookHandler {
  validateWebhook(headers: Record<string, string>, body: unknown): WebhookValidationResult;
  processWebhook(event: WebhookEvent): Promise<WebhookResponse>;
  getEventType(): string;
}

// Webhook authentication interface
export interface WebhookAuthConfig {
  daimo?: {
    secret: string;
    signatureHeader: string;
  };
  aqua?: {
    token: string;
    queryParam: string;
  };
}
