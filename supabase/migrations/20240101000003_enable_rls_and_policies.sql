-- Migration: Enable Row Level Security and create policies
-- Description: Set up RLS policies for payments table

-- Enable Row Level Security on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to payments by ID (for payment status checks)
CREATE POLICY "Allow public read access to payments by ID" ON public.payments
  FOR SELECT USING (true);

-- Policy: Allow service role to insert payments (for Edge Functions)
CREATE POLICY "Allow service role to insert payments" ON public.payments
  FOR INSERT WITH CHECK (true);

-- Policy: Allow service role to update payments (for webhook status updates)
CREATE POLICY "Allow service role to update payments" ON public.payments
  FOR UPDATE USING (true);

-- Grant necessary permissions to authenticated and service roles
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO anon;
GRANT ALL ON public.payments TO service_role;

-- Enable realtime for payments table (for real-time payment status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; 