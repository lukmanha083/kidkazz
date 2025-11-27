-- Migration: Add barcode to product_bundles
-- Date: 2025-11-27
-- Description: Add barcode field to product_bundles table to store bundle barcode

-- Add barcode column to product_bundles table
ALTER TABLE product_bundles ADD COLUMN barcode TEXT;

-- Note: barcode is optional (nullable) and does not need to be unique
-- as multiple bundles could theoretically share barcodes in some systems,
-- though in practice each bundle should have a unique barcode
