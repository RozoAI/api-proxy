/**
 * Test Setup
 * Global test configuration and setup
 */

import { CHAIN_IDS } from '../config/chains';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
(global as any).testUtils = {
  createMockPaymentRequest: (overrides = {}) => ({
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
    externalId: 'test-external-id-' + Date.now(),
    metadata: {
      test: true,
      environment: 'test'
    },
    ...overrides
  }),

  createMockStellarPaymentRequest: (overrides = {}) => ({
    display: {
      intent: 'Test Stellar Payment',
      paymentValue: '5.00',
      currency: 'USD'
    },
    destination: {
      destinationAddress: 'GABCDEF123456789',
      chainId: CHAIN_IDS.STELLAR.toString(),
      amountUnits: '5.00',
      tokenSymbol: 'XLM'
    },
    externalId: 'test-stellar-external-id-' + Date.now(),
    metadata: {
      test: true,
      environment: 'test',
      chain: 'stellar'
    },
    ...overrides
  })
};

// Global test utilities are available as (global as any).testUtils 