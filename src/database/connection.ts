/**
 * Database Connection Configuration
 * MySQL connection setup with connection pooling (max 10 connections)
 */

import mysql from 'mysql2/promise';
import { Pool, PoolConnection } from 'mysql2/promise';

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

// Global pool instance
let pool: Pool | null = null;

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'api_proxy',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'), // Max 10 connections as per plan
  };
}

/**
 * Initialize database connection pool
 */
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();

  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
  });

  console.log(`Database pool initialized with ${config.connectionLimit} max connections`);
  return pool;
}

/**
 * Get database connection from pool
 */
export async function getDatabaseConnection(): Promise<PoolConnection> {
  if (!pool) {
    initializeDatabase();
  }

  return await pool!.getConnection();
}

/**
 * Get database pool instance
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    initializeDatabase();
  }

  return pool!;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const connection = await getDatabaseConnection();

    // Simple query to test connection
    await connection.execute('SELECT 1');
    connection.release();

    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}
