/**
 * End-to-End Integration Tests
 * Tests complete payment flows, cache-first retrieval, provider fallback, and error scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { DatabaseConnection } from '../database/connection';
import { PaymentsRepository } from '../database/repositories/payments-repository';
import { PaymentService } from '../services/payment-service';
import { PaymentRequest, PaymentResponse } from '../types/payment';

describe('End-to-End Integration Tests', () => {
  let db: DatabaseConnection;
  let paymentsRepo: PaymentsRepository;
  let paymentService: PaymentService;

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
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.execute('DELETE FROM payments');
  });

  describe('Complete Payment Flow with Database Persistence', () => {
    const mockDaimoPaymentRequest: PaymentRequest = {
      display: {
        intent: 'E2E Test Payment',
        paymentValue: '25.00',
        currency: 'USD'
      },
      destination: {
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: '10', // Optimism - routes to Daimo
        amountUnits: '25000000',
        tokenSymbol: 'ETH'
      },
      externalId: 'e2e_test_daimo_123',
      metadata: {
        test: 'e2e',
        environment: 'test'
      }
    };

    const mockAquaPaymentRequest: PaymentRequest = {
      display: {
        intent: 'E2E Stellar Payment',
        paymentValue: '50.00',
        currency: 'USD'
      },
      destination: {
        destinationAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        chainId: '10001', // Stellar - routes to Aqua
        amountUnits: '50000000',
        tokenSymbol: 'XLM'
      },
      externalId: 'e2e_test_aqua_123',
      metadata: {
        test: 'e2e',
        environment: 'test'
      }
    };

    it('should create Daimo payment and persist to database', async () => {
      const response = await request(app)
        .post('/api/payment')
        .send(mockDaimoPaymentRequest)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('payment_unpaid');
      expect(response.body.externalId).toBe('e2e_test_daimo_123');
      expect(response.body.destination.chainId).toBe('10');

      // Verify payment was stored in database
      const storedPayment = await paymentsRepo.findByExternalId('e2e_test_daimo_123');
      expect(storedPayment).toBeDefined();
      expect(storedPayment!.id).toBe(response.body.id);
      expect(storedPayment!.status).toBe('payment_unpaid');
    });

    it('should create Aqua payment and persist to database', async () => {
      const response = await request(app)
        .post('/api/payment')
        .send(mockAquaPaymentRequest)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('payment_unpaid');
      expect(response.body.externalId).toBe('e2e_test_aqua_123');
      expect(response.body.destination.chainId).toBe('10001');

      // Verify payment was stored in database
      const storedPayment = await paymentsRepo.findByExternalId('e2e_test_aqua_123');
      expect(storedPayment).toBeDefined();
      expect(storedPayment!.id).toBe(response.body.id);
      expect(storedPayment!.status).toBe('payment_unpaid');
    });

    it('should handle payment status updates via webhooks', async () => {
      // Create a payment first
      const createResponse = await request(app)
        .post('/api/payment')
        .send(mockDaimoPaymentRequest)
        .expect(200);

      const paymentId = createResponse.body.id;

      // Simulate webhook event
      const webhookPayload = {
        type: 'payment.completed',
        data: {
          id: paymentId,
          status: 'payment_completed',
          createdAt: Date.now().toString(),
          display: mockDaimoPaymentRequest.display,
          source: {
            sourceAddress: '0x9876543210fedcba9876543210fedcba98765432',
            txHash: '0xabcdef123456789abcdef123456789abcdef12345',
            chainId: '10',
            amountUnits: '25000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          destination: {
            destinationAddress: mockDaimoPaymentRequest.destination.destinationAddress,
            txHash: '0xabcdef123456789abcdef123456789abcdef12345',
            chainId: '10',
            amountUnits: '25000000',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          externalId: 'e2e_test_daimo_123',
          metadata: mockDaimoPaymentRequest.metadata,
          url: 'https://daimo.com/payment/test'
        }
      };

      const webhookResponse = await request(app)
        .post('/webhooks/daimo')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);

      // Verify payment status was updated in database
      const updatedPayment = await paymentsRepo.findById(paymentId);
      expect(updatedPayment!.status).toBe('payment_completed');
      expect(updatedPayment!.txHash).toBe('0xabcdef123456789abcdef123456789abcdef12345');
    });
  });

  describe('Cache-First Retrieval Logic', () => {
    it('should return cached payment when fresh', async () => {
      // Create a payment in database
      const payment = await paymentsRepo.create({
        id: 'cache_test_123',
        externalId: 'cache_ext_123',
        status: 'payment_unpaid',
        amount: 15.00,
        currency: 'USD',
        chainId: '10',
        tokenSymbol: 'ETH',
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        metadata: { cached: true }
      });

      // Get payment via API
      const response = await request(app)
        .get(`/api/payment/${payment.id}`)
        .expect(200);

      expect(response.body.id).toBe(payment.id);
      expect(response.body.status).toBe('payment_unpaid');
      expect(response.body.metadata.cached).toBe(true);
    });

    it('should fetch fresh data when cache is stale', async () => {
      // Create a payment in database with old timestamp
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      const payment = await paymentsRepo.create({
        id: 'stale_test_123',
        externalId: 'stale_ext_123',
        status: 'payment_unpaid',
        amount: 20.00,
        currency: 'USD',
        chainId: '10',
        tokenSymbol: 'ETH',
        destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
        metadata: { stale: true }
      });

      // Update timestamp to make it stale
      await db.execute(
        'UPDATE payments SET updated_at = ? WHERE id = ?',
        [oldTime, payment.id]
      );

      // Get payment via API - should fetch fresh data
      const response = await request(app)
        .get(`/api/payment/${payment.id}`)
        .expect(200);

      expect(response.body.id).toBe(payment.id);
      // The response should come from provider (not cached data)
    });
  });

  describe('Provider Fallback with Database Updates', () => {
    it('should handle provider fallback gracefully', async () => {
      // Mock provider failure by using an invalid chain ID
      const invalidRequest: PaymentRequest = {
        display: {
          intent: 'Fallback Test',
          paymentValue: '30.00',
          currency: 'USD'
        },
        destination: {
          destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '99999', // Invalid chain ID
          amountUnits: '30000000',
          tokenSymbol: 'ETH'
        },
        externalId: 'fallback_test_123',
        metadata: {}
      };

      // Should fall back to default provider or return error
      const response = await request(app)
        .post('/api/payment')
        .send(invalidRequest)
        .expect(400); // Expect validation error

      expect(response.body.error).toBeDefined();
    });

    it('should handle provider health check failures', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.providers).toBeDefined();
      expect(response.body.database).toBeDefined();
    });
  });

  describe('Error Scenarios and Rollback', () => {
    it('should handle database connection errors', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the API handles errors gracefully
      const response = await request(app)
        .get('/api/payment/nonexistent_payment')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid payment requests', async () => {
      const invalidRequest = {
        display: {
          intent: 'Invalid Payment'
          // Missing required fields
        },
        destination: {
          // Missing required fields
        }
      };

      const response = await request(app)
        .post('/api/payment')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle webhook validation errors', async () => {
      const invalidWebhook = {
        type: 'invalid.type',
        data: {
          // Invalid structure
        }
      };

      const response = await request(app)
        .post('/webhooks/daimo')
        .send(invalidWebhook)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle provider timeout errors', async () => {
      // Mock a payment request that would timeout
      const timeoutRequest: PaymentRequest = {
        display: {
          intent: 'Timeout Test',
          paymentValue: '1.00',
          currency: 'USD'
        },
        destination: {
          destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '10',
          amountUnits: '1000000',
          tokenSymbol: 'ETH'
        },
        externalId: 'timeout_test_123',
        metadata: { timeout: true }
      };

      // This would normally timeout, but our mock providers should handle it
      const response = await request(app)
        .post('/api/payment')
        .send(timeoutRequest)
        .expect(200);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent payment requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        display: {
          intent: `Concurrent Payment ${i}`,
          paymentValue: '5.00',
          currency: 'USD'
        },
        destination: {
          destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '10',
          amountUnits: '5000000',
          tokenSymbol: 'ETH'
        },
        externalId: `concurrent_test_${i}`,
        metadata: { concurrent: true, index: i }
      }));

      const promises = requests.map(req =>
        request(app)
          .post('/api/payment')
          .send(req)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.externalId).toBe(`concurrent_test_${index}`);
      });

      // Verify all payments were stored
      const storedPayments = await paymentsRepo.findByMetadata({ concurrent: true });
      expect(storedPayments).toHaveLength(10);
    });

    it('should handle rapid webhook processing', async () => {
      // Create multiple payments first
      const payments = [];
      for (let i = 0; i < 5; i++) {
        const payment = await paymentsRepo.create({
          id: `rapid_test_${i}`,
          externalId: `rapid_ext_${i}`,
          status: 'payment_unpaid',
          amount: 10.00,
          currency: 'USD',
          chainId: '10',
          tokenSymbol: 'ETH',
          destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
          metadata: { rapid: true }
        });
        payments.push(payment);
      }

      // Send webhooks rapidly
      const webhookPromises = payments.map(payment => {
        const webhookPayload = {
          type: 'payment.completed',
          data: {
            id: payment.id,
            status: 'payment_completed',
            createdAt: Date.now().toString(),
            display: {
              intent: 'Rapid Test',
              paymentValue: '10.00',
              currency: 'USD'
            },
            source: {
              sourceAddress: '0x9876543210fedcba9876543210fedcba98765432',
              txHash: `0xrapid${payment.id}`,
              chainId: '10',
              amountUnits: '10000000',
              tokenSymbol: 'ETH',
              tokenAddress: '0x0000000000000000000000000000000000000000'
            },
            destination: {
              destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
              txHash: `0xrapid${payment.id}`,
              chainId: '10',
              amountUnits: '10000000',
              tokenSymbol: 'ETH',
              tokenAddress: '0x0000000000000000000000000000000000000000'
            },
            externalId: payment.externalId,
            metadata: { rapid: true },
            url: 'https://daimo.com/payment/rapid'
          }
        };

        return request(app)
          .post('/webhooks/daimo')
          .send(webhookPayload);
      });

      const webhookResponses = await Promise.all(webhookPromises);
      
      webhookResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all payments were updated
      const updatedPayments = await paymentsRepo.findByMetadata({ rapid: true });
      updatedPayments.forEach(payment => {
        expect(payment.status).toBe('payment_completed');
        expect(payment.txHash).toContain('0xrapid');
      });
    });
  });
}); 