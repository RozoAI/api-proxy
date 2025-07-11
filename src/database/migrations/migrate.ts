/**
 * Database Migration Runner
 * Handles running and rolling back database migrations
 */

import fs from 'fs';
import path from 'path';
import { Connection } from 'mysql2/promise';
import { getDatabaseConnection } from '../connection';

interface Migration {
  version: string;
  filename: string;
  sql: string;
}

export class MigrationRunner {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Initialize migrations table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.execute(sql);
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    const [rows] = await this.connection.execute(
      'SELECT version FROM migrations ORDER BY version'
    );
    return (rows as any[]).map(row => row.version);
  }

  /**
   * Load migration files
   */
  private async loadMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];
    for (const file of files) {
      const version = file.replace('.sql', '');
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      migrations.push({ version, filename: file, sql });
    }

    return migrations;
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.initializeMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.loadMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration: ${migration.filename}`);
        
        // Split SQL by semicolon and execute each statement separately
        const statements = migration.sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            await this.connection.execute(statement);
          }
        }
        
        // Record the migration as executed
        await this.connection.execute(
          'INSERT INTO migrations (version, filename) VALUES (?, ?)',
          [migration.version, migration.filename]
        );
        
        console.log(`✓ Migration ${migration.filename} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migration.filename} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Rollback last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    console.log(`Rolling back migration: ${lastMigration}`);

    try {
      // Note: This is a simple rollback that drops the payments table
      // In a production system, you'd want more sophisticated rollback scripts
      if (lastMigration === '001_create_payments_table') {
        await this.connection.execute('DROP TABLE IF EXISTS payments');
      } else if (lastMigration === '002_create_indexes') {
        // Drop indexes using ALTER TABLE syntax (MySQL compatible)
        try {
          await this.connection.execute('ALTER TABLE payments DROP INDEX idx_payments_external_id');
        } catch (e) { /* Index might not exist */ }
        try {
          await this.connection.execute('ALTER TABLE payments DROP INDEX idx_payments_status');
        } catch (e) { /* Index might not exist */ }
        try {
          await this.connection.execute('ALTER TABLE payments DROP INDEX idx_payments_created_at');
        } catch (e) { /* Index might not exist */ }
        try {
          await this.connection.execute('ALTER TABLE payments DROP INDEX idx_payments_status_updated_at');
        } catch (e) { /* Index might not exist */ }
        try {
          await this.connection.execute('ALTER TABLE payments DROP INDEX idx_payments_status_updated');
        } catch (e) { /* Index might not exist */ }
      }

      // Remove migration record
      await this.connection.execute(
        'DELETE FROM migrations WHERE version = ?',
        [lastMigration]
      );

      console.log(`✓ Migration ${lastMigration} rolled back successfully`);
    } catch (error) {
      console.error(`✗ Rollback failed:`, error);
      throw error;
    }
  }
}

/**
 * Run migrations from command line
 */
export async function runMigrations(): Promise<void> {
  const connection = await getDatabaseConnection();
  const runner = new MigrationRunner(connection);
  
  try {
    await runner.runMigrations();
  } finally {
    connection.release(); // Use release() instead of end() for pooled connections
  }
}

/**
 * Rollback last migration from command line
 */
export async function rollbackMigration(): Promise<void> {
  const connection = await getDatabaseConnection();
  const runner = new MigrationRunner(connection);
  
  try {
    await runner.rollbackLastMigration();
  } finally {
    connection.release(); // Use release() instead of end() for pooled connections
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    runMigrations().catch(console.error);
  } else if (command === 'down') {
    rollbackMigration().catch(console.error);
  } else {
    console.log('Usage: ts-node migrate.ts [up|down]');
    process.exit(1);
  }
} 