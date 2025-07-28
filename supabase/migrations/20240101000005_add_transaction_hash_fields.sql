-- Migration: Add transaction hash fields
-- Description: Add source address, source tx hash, and withdrawal tx hash fields for complete transaction tracking

-- Add new columns for source transaction details
ALTER TABLE public.payments 
ADD COLUMN source_address TEXT,
ADD COLUMN source_tx_hash TEXT,
ADD COLUMN withdrawal_tx_hash TEXT;

-- Create indexes for the new fields for better query performance
CREATE INDEX idx_payments_source_address ON public.payments(source_address);
CREATE INDEX idx_payments_source_tx_hash ON public.payments(source_tx_hash);
CREATE INDEX idx_payments_withdrawal_tx_hash ON public.payments(withdrawal_tx_hash);

-- Add comments for documentation
COMMENT ON COLUMN public.payments.source_address IS 'Address of the payer who initiated the payment (from payment provider webhook)';
COMMENT ON COLUMN public.payments.source_tx_hash IS 'Transaction hash of the source payment (from payment provider webhook)';
COMMENT ON COLUMN public.payments.withdrawal_tx_hash IS 'Transaction hash of the withdrawal transaction (from withdrawal service)'; 