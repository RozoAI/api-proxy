-- Migration: 002_create_indexes.sql
-- Description: Create indexes for performance optimization

-- Note: Using individual statements to handle errors gracefully
-- MySQL doesn't support IF NOT EXISTS for indexes, so we use ALTER TABLE ADD INDEX

-- Index on external_id for quick lookups
ALTER TABLE payments ADD INDEX idx_payments_external_id (external_id);

-- Index on status for filtering by payment status  
ALTER TABLE payments ADD INDEX idx_payments_status (status);

-- Index on created_at for time-based queries
ALTER TABLE payments ADD INDEX idx_payments_created_at (created_at);

-- Index on status_updated_at for staleness checks
ALTER TABLE payments ADD INDEX idx_payments_status_updated_at (status_updated_at);

-- Composite index on status and status_updated_at for cache-first logic
ALTER TABLE payments ADD INDEX idx_payments_status_updated (status, status_updated_at); 