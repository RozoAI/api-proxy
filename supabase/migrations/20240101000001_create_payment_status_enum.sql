-- Migration: Create payment status enum type
-- Description: Define the payment status enumeration for use in payments table

CREATE TYPE payment_status AS ENUM (
  'payment_unpaid',
  'payment_started', 
  'payment_completed',
  'payment_bounced',
  'payment_refunded'
); 