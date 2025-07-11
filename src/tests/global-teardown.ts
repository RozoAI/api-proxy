/**
 * Global Test Teardown
 * Cleans up test database and environment after all tests complete
 */

import { closeDatabasePool } from '../database/connection';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Close database connections
    await closeDatabasePool();
    console.log('✅ Database connections closed');

    // Clean up environment variables
    delete process.env.TEST_DB_HOST;
    delete process.env.TEST_DB_PORT;
    delete process.env.TEST_DB_NAME;
    delete process.env.TEST_DB_USER;
    delete process.env.TEST_DB_PASSWORD;

    console.log('🎯 Test environment cleanup complete');

  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
    // Don't exit with error code as tests are already complete
  }
} 