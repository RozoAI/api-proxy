-- Add app_id column to payments table
-- This allows tracking which application created each payment

ALTER TABLE payments 
ADD COLUMN app_id TEXT;

-- Add index on app_id for efficient queries
CREATE INDEX idx_payments_app_id ON payments(app_id);

-- Add index for app_id + status queries (common use case)
CREATE INDEX idx_payments_app_id_status ON payments(app_id, status);

-- Add index for app_id + created_at queries (for app-specific payment history)
CREATE INDEX idx_payments_app_id_created_at ON payments(app_id, created_at DESC);

-- Add comment to document the column
COMMENT ON COLUMN payments.app_id IS 'Application ID that created this payment (e.g., rozoDemoStellar, rozopayStellar)'; 