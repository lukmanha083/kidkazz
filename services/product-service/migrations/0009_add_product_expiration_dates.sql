-- Migration: Add expiration_date and alert_date to products table
-- These fields help track product expiration and send alerts before expiration

-- Add expiration_date column (ISO date string)
ALTER TABLE products ADD COLUMN expiration_date TEXT;

-- Add alert_date column (ISO date string - should be before expiration_date)
ALTER TABLE products ADD COLUMN alert_date TEXT;

-- Note: Validation to ensure alert_date < expiration_date is handled in application layer
