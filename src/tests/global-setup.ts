/**
 * Global Test Setup
 * Initializes test database and environment before running tests
 */

import { getDatabasePool } from '../database/connection';
import { runMigrations } from '../database/migrations/migrate';

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Test database configuration
  process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
  process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306';
  process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'test_mugglepay_proxy';
  process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'test_user';
  process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';

  // Provider configuration for tests
  process.env.DAIMO_API_KEY = 'test-daimo-key';
  process.env.AQUA_BASE_URL = 'https://test-aqua.api.com';
  process.env.AQUA_API_TOKEN = 'test-aqua-token';
  process.env.AQUA_WEBHOOK_TOKEN = 'test-webhook-token';
  process.env.BASE_URL = 'http://localhost:3001';

  try {
    // Initialize test database connection
    const db = getDatabasePool();

    // Create test database if it doesn't exist
    try {
      await db.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.TEST_DB_NAME}`);
      console.log('✅ Test database created/verified');
    } catch (error) {
      console.log('ℹ️  Test database already exists or creation not needed');
    }

    // Run migrations
    await runMigrations();
    console.log('✅ Test database migrations completed');

    // Close the setup connection
    await db.end();

    console.log('🎯 Test environment setup complete');

  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    process.exit(1);
  }
} 