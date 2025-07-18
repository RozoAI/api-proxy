-- Migration: Create payments table
-- Description: Create payments table for storing payment records with withdrawal integration

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'payment_unpaid',
  external_id TEXT,
  withdraw_id TEXT,
  provider_name TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status_updated_at TIMESTAMPTZ DEFAULT now(),
  provider_response JSONB,
  metadata JSONB,
  original_request JSONB NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_payments_external_id ON public.payments(external_id);
CREATE INDEX idx_payments_withdraw_id ON public.payments(withdraw_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_status_updated_at ON public.payments(status_updated_at);
CREATE INDEX idx_payments_status_updated ON public.payments(status, status_updated_at);
CREATE INDEX idx_payments_provider_chain ON public.payments(provider_name, chain_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 