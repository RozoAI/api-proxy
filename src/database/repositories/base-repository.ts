/**
 * Base Repository Pattern
 * Provides common database operations for all repositories
 */

import { Pool, PoolConnection } from 'mysql2/promise';
import { getDatabasePool } from '../connection.js';
import { randomUUID } from 'crypto';
export abstract class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = getDatabasePool();
  }

  /**
   * Execute a query with parameters
   */
  protected async execute<T = any>(query: string, params: any[] = []): Promise<[T[], any]> {
    const connection = await this.pool.getConnection();

    try {
      const result = await connection.execute(query, params);
      return result as [T[], any];
    } finally {
      connection.release();
    }
  }

  /**
   * Execute a query and return the first row
   */
  protected async executeOne<T = any>(query: string, params: any[] = []): Promise<T | null> {
    const [rows] = await this.execute<T>(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute within a transaction
   */
  protected async executeInTransaction<T>(
    operation: (connection: PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generate UUID for new records
   */
  protected generateId(): string {
    return randomUUID();
  }

  /**
   * Convert camelCase to snake_case for database columns
   */
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase for object properties
   */
  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected convertRowToCamelCase(row: unknown): Record<string, unknown> {
    if (!row || typeof row !== 'object') {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[this.toCamelCase(key)] = value;
    }
    return result;
  }

  protected convertObjectToSnakeCase(obj: unknown): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') {
      return {};
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[this.toSnakeCase(key)] = value;
    }
    return result;
  }
}
