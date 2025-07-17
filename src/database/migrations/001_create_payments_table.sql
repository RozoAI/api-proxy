-- Migration: 001_create_payments_table.sql
-- Description: Create payments table for storing payment records

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status ENUM('payment_unpaid', 'payment_started', 'payment_completed', 'payment_bounced', 'payment_refunded') NOT NULL DEFAULT 'payment_unpaid',
  external_id VARCHAR(255),
  provider_name VARCHAR(50) NOT NULL,
  chain_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  provider_response TEXT,
  metadata TEXT,
  original_request TEXT NOT NULL
); 