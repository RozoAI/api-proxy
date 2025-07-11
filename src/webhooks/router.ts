/**
 * Webhook Router
 * Routes webhook requests to appropriate handlers
 */

import express from 'express';
import { AquaWebhookHandler } from './aqua-webhook';
import { DaimoWebhook } from './daimo-webhook';
import { PaymentService } from '../services/payment-service';
import { AquaWebhookEvent, DaimoWebhookEvent } from '../types/webhook';

interface AquaWebhookBody {
  invoice_id: string;
  status: string;
  mode: 'default' | 'web3';
  status_updated_at_t: number;
  created_at: string;
  address: string;
  amount: number;
  callback_url: string;
  token_id: string;
  metadata?: {
    daimo_external_id?: string;
    daimo_intent?: string;
    daimo_currency?: string;
  };
  transaction_hash?: string;
  cover_percent?: number;
  cover_amount?: number;
  cover_operator?: 'both' | 'one';
}

export class WebhookRouter {
  private router: express.Router;
  private daimoHandler: DaimoWebhook;
  private aquaHandler: AquaWebhookHandler;

  constructor(paymentService: PaymentService) {
    this.router = express.Router();
    this.daimoHandler = new DaimoWebhook(paymentService);
    this.aquaHandler = new AquaWebhookHandler(paymentService, process.env.AQUA_WEBHOOK_TOKEN || '');
    this.setupRoutes();
  }

  getRouter(): express.Router {
    return this.router;
  }

  private setupRoutes(): void {
    // Daimo webhook endpoint
    this.router.post('/daimo', async (req, res) => {
      try {
        console.log('[WebhookRouter] Received Daimo webhook');

        // Validate webhook
        const isValid = await this.daimoHandler.validateWebhook(
          req.headers as Record<string, string>,
          req.body
        );

        if (!isValid) {
          console.warn('[WebhookRouter] Daimo webhook validation failed');
          return res.status(400).json({
            success: false,
            error: 'Webhook validation failed',
          });
        }

        // Process webhook
        await this.daimoHandler.processEvent(req.body as DaimoWebhookEvent);

        console.log('[WebhookRouter] Daimo webhook processed successfully');
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('[WebhookRouter] Error processing Daimo webhook:', error);
        console.error(
          '[WebhookRouter] Full Daimo webhook payload:',
          JSON.stringify(req.body, null, 2)
        );

        return res.status(500).json({
          success: false,
          error: 'Internal server error processing webhook',
        });
      }
    });

    // Aqua webhook endpoint
    this.router.post('/aqua', async (req, res) => {
      try {
        console.log('[WebhookRouter] Received Aqua webhook');

        const body = req.body as AquaWebhookBody;
        if (!this.isValidAquaWebhookBody(body)) {
          console.warn('[WebhookRouter] Invalid Aqua webhook body');
          return res.status(400).json({
            success: false,
            error: 'Invalid webhook body',
          });
        }

        // Validate webhook (including query parameters for token auth)
        const validation = this.aquaHandler.validateWebhook(
          req.headers as Record<string, string>,
          body,
          req.query as Record<string, string>
        );

        if (!validation.isValid) {
          console.warn('[WebhookRouter] Aqua webhook validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            error: 'Webhook validation failed',
            details: validation.errors,
          });
        }

        // Create Aqua webhook event object with all required fields
        const aquaEvent: AquaWebhookEvent = {
          type: 'aqua_invoice_update',
          invoice_id: body.invoice_id,
          mode: body.mode,
          status: body.status as AquaWebhookEvent['status'],
          status_updated_at_t: body.status_updated_at_t,
          created_at: body.created_at,
          address: body.address,
          amount: body.amount,
          callback_url: body.callback_url,
          token_id: body.token_id,
          metadata: body.metadata,
          transaction_hash: body.transaction_hash,
          cover_percent: body.cover_percent,
          cover_amount: body.cover_amount,
          cover_operator: body.cover_operator,
        };

        // Process webhook
        const result = await this.aquaHandler.processWebhook(aquaEvent);

        if (result.success) {
          console.log('[WebhookRouter] Aqua webhook processed successfully');
          return res.status(200).json(result);
        } else {
          console.error('[WebhookRouter] Aqua webhook processing failed:', result.error);
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error('[WebhookRouter] Error processing Aqua webhook:', error);
        console.error(
          '[WebhookRouter] Full Aqua webhook payload:',
          JSON.stringify(req.body, null, 2)
        );

        return res.status(500).json({
          success: false,
          error: 'Internal server error processing webhook',
        });
      }
    });

    // Webhook health check endpoint
    this.router.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        handlers: {
          daimo: 'daimo',
          aqua: this.aquaHandler.getEventType(),
        },
      });
    });
  }

  private isValidAquaWebhookBody(body: unknown): body is AquaWebhookBody {
    if (!body || typeof body !== 'object') return false;

    const typedBody = body as AquaWebhookBody;
    return (
      typeof typedBody.invoice_id === 'string' &&
      typeof typedBody.status === 'string' &&
      typeof typedBody.mode === 'string' &&
      typeof typedBody.status_updated_at_t === 'number' &&
      typeof typedBody.created_at === 'string' &&
      typeof typedBody.address === 'string' &&
      typeof typedBody.amount === 'number' &&
      typeof typedBody.callback_url === 'string' &&
      typeof typedBody.token_id === 'string'
    );
  }
}
