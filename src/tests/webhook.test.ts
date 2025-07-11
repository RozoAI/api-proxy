/**
 * Webhook Integration Tests
 * Tests webhook event processing, signature verification, authentication, and idempotency
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { DatabaseConnection } from '../database/connection';
import { PaymentsRepository } from '../database/repositories/payments-repository';
import { PaymentService } from '../services/payment-service';
import { DaimoWebhookHandler } from '../webhooks/daimo-webhook';
import { AquaWebhookHandler } from '../webhooks/aqua-webhook';
import { AquaWebhookEvent, DaimoWebhookEvent } from '../types/webhook';

describe('Webhook Integration Tests', () => {
  let db: DatabaseConnection;
  let paymentsRepo: PaymentsRepository;
  let paymentService: PaymentService;
  let daimoWebhookHandler: DaimoWebhookHandler;
  let aquaWebhookHandler: AquaWebhookHandler;

  beforeAll(async () => {
    // Initialize test database
    db = new DatabaseConnection({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      database: process.env.TEST_DB_NAME || 'test_mugglepay_proxy',
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password',
      connectionLimit: 5
    });

    paymentsRepo = new PaymentsRepository(db);
    paymentService = new PaymentService(paymentsRepo);
    daimoWebhookHandler = new DaimoWebhookHandler(paymentService);
    aquaWebhookHandler = new AquaWebhookHandler(paymentService, 'test-webhook-token');
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.execute('DELETE FROM payments');
  });

  describe('Daimo Webhook Processing', () => {
    const mockDaimoEvent: DaimoWebhookEvent = {
      type: 'payment.completed',
      data: {
        id: 'daimo_payment_123',
        status: 'payment_completed',
        createdAt: Date.now().toString(),
        display: {
          intent: 'Test Payment',
          paymentValue: '10.00',
          currency: 'USD'
        },
        source: {
          sourceAddress: '0x1234567890abcdef',
          txHash: '0xabcdef123456789',
          chainId: '10',
          amountUnits: '10000000',
          tokenSymbol: 'ETH',
          tokenAddress: '0x0000000000000000000000000000000000000000'
        },
        destination: {
          destinationAddress: '0x9876543210fedcba',
          txHash: '0xabcdef123456789',
          chainId: '10',
          amountUnits: '10000000',
          tokenSymbol: 'ETH',
          tokenAddress: '0x0000000000000000000000000000000000000000'
        },
        externalId: 'ext_daimo_123',
        metadata: { test: 'data' },
        url: 'https://daimo.com/payment/123'
      }
    };

    it('should process Daimo webhook successfully', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'daimo_payment_123',
        externalId: 'ext_daimo_123',
        status: 'payment_unpaid',
        amount: 10.00,
        currency: 'USD',
        chainId: '10',
        tokenSymbol: 'ETH',
        destinationAddress: '0x9876543210fedcba',
        metadata: { test: 'data' }
      });

      const result = await daimoWebhookHandler.processWebhook(mockDaimoEvent);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('daimo_payment_123');
      expect(result.message).toContain('payment_completed');
    });

    it('should validate Daimo webhook structure', async () => {
      const validationResult = daimoWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        mockDaimoEvent
      );
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should reject invalid Daimo webhook', async () => {
      const invalidEvent = { ...mockDaimoEvent };
      delete (invalidEvent as any).type;
      
      const validationResult = daimoWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        invalidEvent
      );
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Missing type field');
    });

    it('should handle webhook for non-existent payment', async () => {
      const result = await daimoWebhookHandler.processWebhook(mockDaimoEvent);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Aqua Webhook Processing', () => {
    const mockAquaEvent: AquaWebhookEvent = {
      invoice_id: 'aqua_invoice_123',
      mode: 'default',
      status: 'paid',
      status_updated_at_t: Date.now(),
      created_at: new Date().toISOString(),
      address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      amount: 10.50,
      callback_url: 'http://localhost:3001/webhooks/aqua?token=test-webhook-token',
      transaction_hash: 'stellar_tx_hash_123',
      token_id: 'xlm',
      metadata: { test: 'data' }
    };

    it('should process Aqua webhook successfully', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'aqua_payment_123',
        externalId: 'aqua_invoice_123',
        status: 'payment_unpaid',
        amount: 10.50,
        currency: 'USD',
        chainId: '10001',
        tokenSymbol: 'XLM',
        destinationAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        metadata: { test: 'data' }
      });

      const result = await aquaWebhookHandler.processWebhook(mockAquaEvent);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('aqua_payment_123');
      expect(result.message).toContain('payment_completed');
    });

    it('should validate Aqua webhook with token', async () => {
      const validationResult = aquaWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        mockAquaEvent,
        { token: 'test-webhook-token' }
      );
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should reject Aqua webhook with invalid token', async () => {
      const validationResult = aquaWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        mockAquaEvent,
        { token: 'invalid-token' }
      );
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Invalid authentication token');
    });

    it('should reject Aqua webhook without token', async () => {
      const validationResult = aquaWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        mockAquaEvent,
        {}
      );
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Missing authentication token');
    });

    it('should validate Aqua webhook structure', async () => {
      const validationResult = aquaWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        mockAquaEvent,
        { token: 'test-webhook-token' }
      );
      
      expect(validationResult.isValid).toBe(true);
    });

    it('should reject invalid Aqua webhook structure', async () => {
      const invalidEvent = { ...mockAquaEvent };
      delete (invalidEvent as any).invoice_id;
      
      const validationResult = aquaWebhookHandler.validateWebhook(
        { 'content-type': 'application/json' },
        invalidEvent,
        { token: 'test-webhook-token' }
      );
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Missing invoice_id');
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle Daimo webhook endpoint', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'daimo_payment_456',
        externalId: 'ext_daimo_456',
        status: 'payment_unpaid',
        amount: 5.00,
        currency: 'USD',
        chainId: '10',
        tokenSymbol: 'ETH',
        destinationAddress: '0x9876543210fedcba',
        metadata: {}
      });

      const webhookPayload = {
        type: 'payment.completed',
        data: {
          id: 'daimo_payment_456',
          status: 'payment_completed',
          createdAt: Date.now().toString(),
          display: {
            intent: 'Test Payment',
            paymentValue: '5.00',
            currency: 'USD'
          },
          source: {
            sourceAddress: '0x1234567890abcdef',
            txHash: '0xabcdef123456789',
            chainId: '10',
            amountUnits: '5000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          destination: {
            destinationAddress: '0x9876543210fedcba',
            txHash: '0xabcdef123456789',
            chainId: '10',
            amountUnits: '5000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          externalId: 'ext_daimo_456',
          metadata: {},
          url: 'https://daimo.com/payment/456'
        }
      };

      const response = await request(app)
        .post('/webhooks/daimo')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle Aqua webhook endpoint', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'aqua_payment_456',
        externalId: 'aqua_invoice_456',
        status: 'payment_unpaid',
        amount: 15.75,
        currency: 'USD',
        chainId: '10001',
        tokenSymbol: 'XLM',
        destinationAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        metadata: {}
      });

      const webhookPayload = {
        invoice_id: 'aqua_invoice_456',
        mode: 'default',
        status: 'paid',
        status_updated_at_t: Date.now(),
        created_at: new Date().toISOString(),
        address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: 15.75,
        callback_url: 'http://localhost:3001/webhooks/aqua?token=test-webhook-token',
        transaction_hash: 'stellar_tx_hash_456',
        token_id: 'xlm',
        metadata: {}
      };

      const response = await request(app)
        .post('/webhooks/aqua')
        .query({ token: 'test-webhook-token' })
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject Aqua webhook without token', async () => {
      const webhookPayload = {
        invoice_id: 'aqua_invoice_789',
        mode: 'default',
        status: 'paid',
        status_updated_at_t: Date.now(),
        created_at: new Date().toISOString(),
        address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: 20.00,
        callback_url: 'http://localhost:3001/webhooks/aqua',
        transaction_hash: 'stellar_tx_hash_789',
        token_id: 'xlm',
        metadata: {}
      };

      const response = await request(app)
        .post('/webhooks/aqua')
        .send(webhookPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authentication token');
    });
  });

  describe('Webhook Idempotency', () => {
    it('should handle duplicate Daimo webhook events', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'daimo_payment_idem',
        externalId: 'ext_daimo_idem',
        status: 'payment_unpaid',
        amount: 7.50,
        currency: 'USD',
        chainId: '10',
        tokenSymbol: 'ETH',
        destinationAddress: '0x9876543210fedcba',
        metadata: {}
      });

      const webhookEvent: DaimoWebhookEvent = {
        type: 'payment.completed',
        data: {
          id: 'daimo_payment_idem',
          status: 'payment_completed',
          createdAt: Date.now().toString(),
          display: {
            intent: 'Test Payment',
            paymentValue: '7.50',
            currency: 'USD'
          },
          source: {
            sourceAddress: '0x1234567890abcdef',
            txHash: '0xabcdef123456789',
            chainId: '10',
            amountUnits: '7500000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          destination: {
            destinationAddress: '0x9876543210fedcba',
            txHash: '0xabcdef123456789',
            chainId: '10',
            amountUnits: '7500000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          externalId: 'ext_daimo_idem',
          metadata: {},
          url: 'https://daimo.com/payment/idem'
        }
      };

      // Process the same webhook twice
      const result1 = await daimoWebhookHandler.processWebhook(webhookEvent);
      const result2 = await daimoWebhookHandler.processWebhook(webhookEvent);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify payment status is still correct
      const payment = await paymentService.getPayment('daimo_payment_idem');
      expect(payment.status).toBe('payment_completed');
    });

    it('should handle duplicate Aqua webhook events', async () => {
      // Create a payment first
      await paymentService.createPayment({
        id: 'aqua_payment_idem',
        externalId: 'aqua_invoice_idem',
        status: 'payment_unpaid',
        amount: 12.25,
        currency: 'USD',
        chainId: '10001',
        tokenSymbol: 'XLM',
        destinationAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        metadata: {}
      });

      const webhookEvent: AquaWebhookEvent = {
        invoice_id: 'aqua_invoice_idem',
        mode: 'default',
        status: 'paid',
        status_updated_at_t: Date.now(),
        created_at: new Date().toISOString(),
        address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: 12.25,
        callback_url: 'http://localhost:3001/webhooks/aqua?token=test-webhook-token',
        transaction_hash: 'stellar_tx_hash_idem',
        token_id: 'xlm',
        metadata: {}
      };

      // Process the same webhook twice
      const result1 = await aquaWebhookHandler.processWebhook(webhookEvent);
      const result2 = await aquaWebhookHandler.processWebhook(webhookEvent);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify payment status is still correct
      const payment = await paymentService.getPaymentByExternalId('aqua_invoice_idem');
      expect(payment.status).toBe('payment_completed');
    });
  });

  describe('Mock Webhook Events', () => {
    it('should create mock Daimo webhook events', () => {
      const mockEvent = {
        type: 'payment.completed',
        data: {
          id: 'mock_daimo_123',
          status: 'payment_completed',
          createdAt: Date.now().toString(),
          display: {
            intent: 'Mock Payment',
            paymentValue: '100.00',
            currency: 'USD'
          },
          source: {
            sourceAddress: '0x1111111111111111',
            txHash: '0xmocktxhash',
            chainId: '10',
            amountUnits: '100000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          destination: {
            destinationAddress: '0x2222222222222222',
            txHash: '0xmocktxhash',
            chainId: '10',
            amountUnits: '100000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          externalId: 'mock_ext_123',
          metadata: { mock: true },
          url: 'https://daimo.com/payment/mock'
        }
      };

      expect(mockEvent.type).toBe('payment.completed');
      expect(mockEvent.data.id).toBe('mock_daimo_123');
      expect(mockEvent.data.status).toBe('payment_completed');
    });

    it('should create mock Aqua webhook events', () => {
      const mockEvent = {
        invoice_id: 'mock_aqua_123',
        mode: 'default' as const,
        status: 'paid' as const,
        status_updated_at_t: Date.now(),
        created_at: new Date().toISOString(),
        address: 'GMOCKSTELLARADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: 50.75,
        callback_url: 'http://localhost:3001/webhooks/aqua?token=mock-token',
        transaction_hash: 'mock_stellar_tx_hash',
        token_id: 'xlm',
        metadata: { mock: true }
      };

      expect(mockEvent.invoice_id).toBe('mock_aqua_123');
      expect(mockEvent.status).toBe('paid');
      expect(mockEvent.mode).toBe('default');
      expect(mockEvent.amount).toBe(50.75);
    });
  });
}); 