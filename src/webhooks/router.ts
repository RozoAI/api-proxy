/**
 * Webhook Router
 * Routes webhook requests to appropriate handlers
 */

import express from 'express';
import { DaimoWebhookHandler } from './daimo-webhook';
import { AquaWebhookHandler } from './aqua-webhook';
import { PaymentService } from '../services/payment-service';
import { WebhookResponse } from '../types/webhook';

export class WebhookRouter {
  private router: express.Router;
  private daimoHandler: DaimoWebhookHandler;
  private aquaHandler: AquaWebhookHandler;

  constructor(paymentService: PaymentService) {
    this.router = express.Router();
    
    // Initialize webhook handlers
    const daimoSecret = process.env.DAIMO_WEBHOOK_SECRET || 'default-secret';
    const aquaToken = process.env.AQUA_WEBHOOK_TOKEN || 'default-token';
    
    this.daimoHandler = new DaimoWebhookHandler(paymentService, daimoSecret);
    this.aquaHandler = new AquaWebhookHandler(paymentService, aquaToken);
    
    this.setupRoutes();
  }

  /**
   * Setup webhook routes
   */
  private setupRoutes(): void {
    // Daimo webhook endpoint
    this.router.post('/daimo', async (req, res) => {
      try {
        console.log('[WebhookRouter] Received Daimo webhook');
        
        // Validate webhook
        const validation = this.daimoHandler.validateWebhook(req.headers as Record<string, string>, req.body);
        
        if (!validation.isValid) {
          console.warn('[WebhookRouter] Daimo webhook validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            error: 'Webhook validation failed',
            details: validation.errors
          });
        }

        // Process webhook
        const result = await this.daimoHandler.processWebhook(req.body);
        
        if (result.success) {
          console.log('[WebhookRouter] Daimo webhook processed successfully');
          return res.status(200).json(result);
        } else {
          console.error('[WebhookRouter] Daimo webhook processing failed:', result.error);
          return res.status(400).json(result);
        }

      } catch (error) {
        console.error('[WebhookRouter] Error processing Daimo webhook:', error);
        console.error('[WebhookRouter] Full Daimo webhook payload:', JSON.stringify(req.body, null, 2));
        
        return res.status(500).json({
          success: false,
          error: 'Internal server error processing webhook'
        });
      }
    });

    // Aqua webhook endpoint
    this.router.post('/aqua', async (req, res) => {
      try {
        console.log('[WebhookRouter] Received Aqua webhook');
        
        // Validate webhook (including query parameters for token auth)
        const validation = this.aquaHandler.validateWebhook(
          req.headers as Record<string, string>, 
          req.body,
          req.query as Record<string, string>
        );
        
        if (!validation.isValid) {
          console.warn('[WebhookRouter] Aqua webhook validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            error: 'Webhook validation failed',
            details: validation.errors
          });
        }

        // Create Aqua webhook event object
        const aquaEvent = {
          type: 'aqua_invoice_update' as const,
          ...req.body
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
        console.error('[WebhookRouter] Full Aqua webhook payload:', JSON.stringify(req.body, null, 2));
        
        return res.status(500).json({
          success: false,
          error: 'Internal server error processing webhook'
        });
      }
    });

    // Webhook health check endpoint
    this.router.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        handlers: {
          daimo: this.daimoHandler.getEventType(),
          aqua: this.aquaHandler.getEventType()
        }
      });
    });
  }

  /**
   * Get the Express router
   */
  getRouter(): express.Router {
    return this.router;
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(): any {
    return {
      handlers: {
        daimo: {
          type: this.daimoHandler.getEventType(),
          endpoint: '/webhooks/daimo'
        },
        aqua: {
          type: this.aquaHandler.getEventType(),
          endpoint: '/webhooks/aqua'
        }
      },
      healthEndpoint: '/webhooks/health'
    };
  }
} 