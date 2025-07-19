-- Migration: Add constraints and optimize indexes
-- Description: Add CHECK constraint for amount > 0 and optimize indexes for frequent queries

-- Add CHECK constraint to ensure amount is always positive
ALTER TABLE public.payments 
ADD CONSTRAINT check_amount_positive 
CHECK (amount > 0);

-- Drop existing indexes that might be redundant or suboptimal
DROP INDEX IF EXISTS idx_payments_status_updated_at;
DROP INDEX IF EXISTS idx_payments_status_updated;

-- Create optimized composite indexes for common query patterns
-- Index for status-based queries (most common)
CREATE INDEX CONCURRENTLY idx_payments_status_created_at 
ON public.payments(status, created_at DESC);

-- Index for external_id lookups (unique constraint)
CREATE UNIQUE INDEX CONCURRENTLY idx_payments_external_id_unique 
ON public.payments(external_id) 
WHERE external_id IS NOT NULL;

-- Index for status + status_updated_at queries (for stale payment detection)
CREATE INDEX CONCURRENTLY idx_payments_status_status_updated 
ON public.payments(status, status_updated_at);

-- Index for provider + status queries
CREATE INDEX CONCURRENTLY idx_payments_provider_status 
ON public.payments(provider_name, status);

-- Index for chain_id + status queries
CREATE INDEX CONCURRENTLY idx_payments_chain_status 
ON public.payments(chain_id, status);

-- Index for date range queries on created_at
CREATE INDEX CONCURRENTLY idx_payments_created_at_desc 
ON public.payments(created_at DESC);

-- Index for date range queries on status_updated_at
CREATE INDEX CONCURRENTLY idx_payments_status_updated_at_desc 
ON public.payments(status_updated_at DESC);

-- Partial indexes for specific status values (for very frequent queries)
CREATE INDEX CONCURRENTLY idx_payments_status_unpaid 
ON public.payments(created_at DESC) 
WHERE status = 'payment_unpaid';

CREATE INDEX CONCURRENTLY idx_payments_status_started 
ON public.payments(created_at DESC) 
WHERE status = 'payment_started';

CREATE INDEX CONCURRENTLY idx_payments_status_completed 
ON public.payments(created_at DESC) 
WHERE status = 'payment_completed';

-- Add comments for documentation
COMMENT ON INDEX idx_payments_status_created_at IS 'Optimized for status-based queries with date ordering';
COMMENT ON INDEX idx_payments_external_id_unique IS 'Unique index for external_id lookups';
COMMENT ON INDEX idx_payments_status_status_updated IS 'For stale payment detection queries';
COMMENT ON INDEX idx_payments_provider_status IS 'For provider-specific status queries';
COMMENT ON INDEX idx_payments_chain_status IS 'For chain-specific status queries';
COMMENT ON INDEX idx_payments_status_unpaid IS 'Partial index for unpaid payments (most frequent)';
COMMENT ON INDEX idx_payments_status_started IS 'Partial index for started payments';
COMMENT ON INDEX idx_payments_status_completed IS 'Partial index for completed payments';

-- Add table comment
COMMENT ON TABLE public.payments IS 'Payment records with withdrawal integration support. Amount must be positive.';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount (must be > 0)';
COMMENT ON COLUMN public.payments.status IS 'Current payment status';
COMMENT ON COLUMN public.payments.external_id IS 'External payment ID from provider (unique when not null)';
COMMENT ON COLUMN public.payments.created_at IS 'Payment creation timestamp'; 