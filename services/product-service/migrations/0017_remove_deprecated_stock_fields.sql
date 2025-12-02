-- Migration: 0017_remove_deprecated_stock_fields
-- Description: Remove deprecated stock fields from products and productBundles tables
-- Phase: 2C - Schema Cleanup
-- DDD Fix: Stock is now the single responsibility of Inventory Service

-- Step 1: Remove stock field from products table
-- This field is deprecated as stock is now managed by Inventory Service
ALTER TABLE products DROP COLUMN stock;

-- Step 2: Remove availableStock field from productBundles table
-- Bundle stock is now calculated virtually from component availability
ALTER TABLE productBundles DROP COLUMN availableStock;

-- Note: These columns were deprecated after Phase 2A implementation
-- All stock data should now be queried from Inventory Service APIs
