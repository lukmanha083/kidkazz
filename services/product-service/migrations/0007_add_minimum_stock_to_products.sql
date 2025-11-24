-- Migration: Add minimum stock alert threshold to products table
-- Description: Adds customizable minimum stock field to trigger low stock alerts
-- Date: 2025-11-23

-- Add minimum_stock column
ALTER TABLE products ADD COLUMN minimum_stock INTEGER;

-- Create index for efficient low stock queries
CREATE INDEX IF NOT EXISTS idx_products_minimum_stock ON products(minimum_stock);
CREATE INDEX IF NOT EXISTS idx_products_stock_alert ON products(stock, minimum_stock) WHERE minimum_stock IS NOT NULL;

-- Comments:
-- minimum_stock: Minimum stock threshold for low stock alerts
--   - When stock falls below this value, triggers "Low Stock" alert
--   - When stock falls below 40% of minimum_stock, triggers "Critical" alert
--   - NULL means use default threshold (50 units)
--   - Per-product customization allows different alert levels for different products
--
-- Example scenarios:
--   - High-value items: minimum_stock = 10 (alert early, small quantity)
--   - Fast-moving items: minimum_stock = 100 (alert with buffer for reorder)
--   - Seasonal items: minimum_stock = 200 (keep higher buffer)
--
-- Alert Logic:
--   - Normal: stock >= minimum_stock (Green)
--   - Low Stock: stock < minimum_stock AND stock >= (minimum_stock * 0.4) (Yellow)
--   - Critical: stock < (minimum_stock * 0.4) (Red)
