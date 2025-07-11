/**
 * Integration Tests
 * End-to-end tests for the payment API
 */

import request from 'supertest';
import app from '../server';
import { ProviderRegistry } from '../providers/registry';
import { DaimoProvider, AquaProvider } from '../providers';
import { getProviderConfig } from '../config/providers';
import { CHAIN_IDS } from '../config/chains';

describe('Payment API Integration Tests', () => {
  let registry: ProviderRegistry;

  beforeAll(async () => {
    // Setup test providers
    registry = new ProviderRegistry();
    
    // Mock Daimo provider
    const daimoConfig = getProviderConfig('daimo');
    if (daimoConfig) {
      const daimoProvider = new DaimoProvider(daimoConfig);
      registry.registerProvider(daimoProvider);
    }

    // Mock Aqua provider
    const aquaConfig = getProviderConfig('aqua');
    if (aquaConfig) {
      const aquaProvider = new AquaProvider(aquaConfig);
      registry.registerProvider(aquaProvider);
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Provider Status', () => {
    it('should return provider status', async () => {
      const response = await request(app)
        .get('/api/providers/status')
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.providers)).toBe(true);
    });
  });

  describe('Create Payment', () => {
    const validPaymentRequest = {
      display: {
        intent: 'Test Payment',
        paymentValue: '10.00',
        currency: 'USD'
      },
      destination: {
        destinationAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: CHAIN_IDS.ETHEREUM.toString(),
        amountUnits: '10.00',
        tokenSymbol: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000'
      },
      externalId: 'test-external-id-123',
      metadata: {
        test: true,
        environment: 'test'
      }
    };

    it('should create payment for Ethereum chain', async () => {
      const response = await request(app)
        .post('/api/payment')
        .send(validPaymentRequest)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('display');
      expect(response.body).toHaveProperty('destination');
      expect(response.body.display.intent).toBe('Test Payment');
      expect(response.body.destination.chainId).toBe(CHAIN_IDS.ETHEREUM.toString());
    });

    it('should create payment for Stellar chain', async () => {
      const stellarPaymentRequest = {
        ...validPaymentRequest,
        destination: {
          ...validPaymentRequest.destination,
          chainId: CHAIN_IDS.STELLAR.toString(),
          tokenSymbol: 'XLM',
          destinationAddress: 'GABCDEF123456789'
        }
      };

      const response = await request(app)
        .post('/api/payment')
        .send(stellarPaymentRequest)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.destination.chainId).toBe(CHAIN_IDS.STELLAR.toString());
      expect(response.body.destination.tokenSymbol).toBe('XLM');
    });

    it('should reject invalid payment request', async () => {
      const invalidRequest = {
        display: {
          intent: 'Test Payment'
          // Missing required fields
        }
      };

      const response = await request(app)
        .post('/api/payment')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject unsupported chain', async () => {
      const unsupportedChainRequest = {
        ...validPaymentRequest,
        destination: {
          ...validPaymentRequest.destination,
          chainId: '99999' // Non-existent chain
        }
      };

      const response = await request(app)
        .post('/api/payment')
        .send(unsupportedChainRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Get Payment', () => {
    it('should get payment by ID', async () => {
      // First create a payment
      const createResponse = await request(app)
        .post('/api/payment')
        .send({
          display: {
            intent: 'Get Payment Test',
            paymentValue: '5.00',
            currency: 'USD'
          },
          destination: {
            destinationAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: CHAIN_IDS.ETHEREUM.toString(),
            amountUnits: '5.00',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          }
        })
        .expect(201);

      const paymentId = createResponse.body.id;

      // Then get the payment
      const response = await request(app)
        .get(`/api/payment/${paymentId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', paymentId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('display');
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payment/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Get Payment by External ID', () => {
    it('should get payment by external ID', async () => {
      const externalId = 'test-external-id-' + Date.now();

      // First create a payment with external ID
      const createResponse = await request(app)
        .post('/api/payment')
        .send({
          display: {
            intent: 'External ID Test',
            paymentValue: '15.00',
            currency: 'USD'
          },
          destination: {
            destinationAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: CHAIN_IDS.ETHEREUM.toString(),
            amountUnits: '15.00',
            tokenSymbol: 'ETH',
            tokenAddress: '0x0000000000000000000000000000000000000000'
          },
          externalId
        })
        .expect(201);

      // Then get the payment by external ID
      const response = await request(app)
        .get(`/api/payment/external-id/${externalId}`)
        .expect(200);

      expect(response.body).toHaveProperty('externalId', externalId);
      expect(response.body).toHaveProperty('id');
    });

    it('should return 404 for non-existent external ID', async () => {
      const response = await request(app)
        .get('/api/payment/external-id/non-existent-external-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Routing Statistics', () => {
    it('should return routing statistics', async () => {
      const response = await request(app)
        .get('/api/routing/stats')
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('totalChains');
      expect(response.body).toHaveProperty('defaultProvider');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/payment')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/payment')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
}); 