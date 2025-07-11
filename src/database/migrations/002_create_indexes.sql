-- Migration: 002_create_indexes.sql
-- Description: Create indexes for performance optimization

-- Index on external_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);

-- Index on status for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Index on status_updated_at for staleness checks
CREATE INDEX IF NOT EXISTS idx_payments_status_updated_at ON payments(status_updated_at);

-- Composite index on status and status_updated_at for cache-first logic
CREATE INDEX IF NOT EXISTS idx_payments_status_updated ON payments(status, status_updated_at); 