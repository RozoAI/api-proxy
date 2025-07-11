/**
 * Database Integration Tests
 * Tests database connection, CRUD operations, migrations, and repository methods
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseConnection } from '../database/connection';
import { PaymentsRepository } from '../database/repositories/payments-repository';
import { runMigrations } from '../database/migrations/migrate';
import { PaymentStatus } from '../types/payment';

describe('Database Integration Tests', () => {
  let db: DatabaseConnection;
  let paymentsRepo: PaymentsRepository;

  beforeAll(async () => {
    // Initialize test database connection
    db = new DatabaseConnection({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '3306'),
      database: process.env.TEST_DB_NAME || 'test_mugglepay_proxy',
      user: process.env.TEST_DB_USER || 'test_user',
      password: process.env.TEST_DB_PASSWORD || 'test_password',
      connectionLimit: 5
    });

    // Run migrations
    await runMigrations(db);
    
    paymentsRepo = new PaymentsRepository(db);
  });

  afterAll(async () => {
    // Clean up test database
    await db.execute('DROP TABLE IF EXISTS payments');
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.execute('DELETE FROM payments');
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should execute raw queries', async () => {
      const result = await db.execute('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const badDb = new DatabaseConnection({
        host: 'nonexistent-host',
        port: 3306,
        database: 'test',
        user: 'test',
        password: 'test',
        connectionLimit: 1
      });

      const isHealthy = await badDb.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Payment CRUD Operations', () => {
    const mockPayment = {
      id: 'test_payment_123',
      externalId: 'ext_123',
      status: 'payment_unpaid' as PaymentStatus,
      amount: 10.50,
      currency: 'USD',
      chainId: '10001',
      tokenSymbol: 'XLM',
      destinationAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      sourceAddress: null,
      txHash: null,
      metadata: { test: 'data' }
    };

    it('should create a payment', async () => {
      const created = await paymentsRepo.create(mockPayment);
      
      expect(created).toBeDefined();
      expect(created.id).toBe(mockPayment.id);
      expect(created.externalId).toBe(mockPayment.externalId);
      expect(created.status).toBe(mockPayment.status);
      expect(created.amount).toBe(mockPayment.amount);
      expect(created.currency).toBe(mockPayment.currency);
      expect(created.chainId).toBe(mockPayment.chainId);
      expect(created.tokenSymbol).toBe(mockPayment.tokenSymbol);
      expect(created.destinationAddress).toBe(mockPayment.destinationAddress);
      expect(created.metadata).toEqual(mockPayment.metadata);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should get a payment by ID', async () => {
      await paymentsRepo.create(mockPayment);
      
      const found = await paymentsRepo.findById(mockPayment.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(mockPayment.id);
      expect(found?.externalId).toBe(mockPayment.externalId);
      expect(found?.status).toBe(mockPayment.status);
    });

    it('should get a payment by external ID', async () => {
      await paymentsRepo.create(mockPayment);
      
      const found = await paymentsRepo.findByExternalId(mockPayment.externalId!);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(mockPayment.id);
      expect(found?.externalId).toBe(mockPayment.externalId);
    });

    it('should update a payment', async () => {
      await paymentsRepo.create(mockPayment);
      
      const updates = {
        status: 'payment_completed' as PaymentStatus,
        txHash: '0x123456789abcdef',
        sourceAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      };
      
      const updated = await paymentsRepo.update(mockPayment.id, updates);
      
      expect(updated).toBe(true);
      
      const found = await paymentsRepo.findById(mockPayment.id);
      expect(found?.status).toBe(updates.status);
      expect(found?.txHash).toBe(updates.txHash);
      expect(found?.sourceAddress).toBe(updates.sourceAddress);
    });

    it('should delete a payment', async () => {
      await paymentsRepo.create(mockPayment);
      
      const deleted = await paymentsRepo.delete(mockPayment.id);
      expect(deleted).toBe(true);
      
      const found = await paymentsRepo.findById(mockPayment.id);
      expect(found).toBeNull();
    });

    it('should return null for non-existent payment', async () => {
      const found = await paymentsRepo.findById('non_existent_id');
      expect(found).toBeNull();
    });

    it('should handle duplicate ID creation', async () => {
      await paymentsRepo.create(mockPayment);
      
      await expect(paymentsRepo.create(mockPayment))
        .rejects
        .toThrow();
    });
  });

  describe('Repository Methods', () => {
    it('should find payments by status', async () => {
      const payment1 = { ...mockPayment, id: 'payment_1', status: 'payment_unpaid' as PaymentStatus };
      const payment2 = { ...mockPayment, id: 'payment_2', status: 'payment_completed' as PaymentStatus };
      const payment3 = { ...mockPayment, id: 'payment_3', status: 'payment_unpaid' as PaymentStatus };

      await paymentsRepo.create(payment1);
      await paymentsRepo.create(payment2);
      await paymentsRepo.create(payment3);

      const unpaidPayments = await paymentsRepo.findByStatus('payment_unpaid');
      expect(unpaidPayments).toHaveLength(2);
      expect(unpaidPayments.map(p => p.id)).toContain('payment_1');
      expect(unpaidPayments.map(p => p.id)).toContain('payment_3');
    });

    it('should find payments by chain ID', async () => {
      const payment1 = { ...mockPayment, id: 'payment_1', chainId: '10001' };
      const payment2 = { ...mockPayment, id: 'payment_2', chainId: '10' };
      const payment3 = { ...mockPayment, id: 'payment_3', chainId: '10001' };

      await paymentsRepo.create(payment1);
      await paymentsRepo.create(payment2);
      await paymentsRepo.create(payment3);

      const stellarPayments = await paymentsRepo.findByChainId('10001');
      expect(stellarPayments).toHaveLength(2);
      expect(stellarPayments.map(p => p.id)).toContain('payment_1');
      expect(stellarPayments.map(p => p.id)).toContain('payment_3');
    });

    it('should find payments created in date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await paymentsRepo.create({ ...mockPayment, id: 'payment_1' });
      
      const payments = await paymentsRepo.findByDateRange(yesterday, tomorrow);
      expect(payments).toHaveLength(1);
      expect(payments[0].id).toBe('payment_1');
    });
  });

  describe('Caching Logic', () => {
    it('should detect stale payments', async () => {
      const payment = await paymentsRepo.create(mockPayment);
      
      // Mock an old payment by updating the timestamp
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      await db.execute(
        'UPDATE payments SET updated_at = ? WHERE id = ?',
        [oldTime, payment.id]
      );
      
      const stalePayment = await paymentsRepo.findById(payment.id);
      expect(stalePayment).toBeDefined();
      
      // Check if payment is considered stale (older than 1 hour)
      const isStale = paymentsRepo.isStale(stalePayment!);
      expect(isStale).toBe(true);
    });

    it('should identify fresh payments', async () => {
      const payment = await paymentsRepo.create(mockPayment);
      
      const freshPayment = await paymentsRepo.findById(payment.id);
      expect(freshPayment).toBeDefined();
      
      const isStale = paymentsRepo.isStale(freshPayment!);
      expect(isStale).toBe(false);
    });
  });

  describe('Migration Scripts', () => {
    it('should run migrations successfully', async () => {
      // Create a fresh database connection for migration testing
      const testDb = new DatabaseConnection({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        database: process.env.TEST_DB_NAME || 'test_mugglepay_proxy',
        user: process.env.TEST_DB_USER || 'test_user',
        password: process.env.TEST_DB_PASSWORD || 'test_password',
        connectionLimit: 5
      });

      // Drop the table first
      await testDb.execute('DROP TABLE IF EXISTS payments');
      
      // Run migrations
      await runMigrations(testDb);
      
      // Verify table exists and has correct structure
      const tables = await testDb.execute('SHOW TABLES LIKE "payments"');
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBe(1);
      
      // Verify columns exist
      const columns = await testDb.execute('DESCRIBE payments');
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      
      await testDb.close();
    });
  });
}); 