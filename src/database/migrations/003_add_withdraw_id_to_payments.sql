-- Migration: 003_add_withdraw_id_to_payments.sql
-- Description: Add withdraw_id column to payments table for withdrawal tracking

ALTER TABLE payments 
ADD COLUMN withdraw_id VARCHAR(100) NULL AFTER external_id;

-- Add index for withdraw_id lookups
ALTER TABLE payments 
ADD INDEX idx_payments_withdraw_id (withdraw_id); 