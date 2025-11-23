-- =============================================
-- Delete Product UOM Test Data
-- =============================================
-- This script deletes test products and their associated UOMs
-- Run this against the product-db database
-- =============================================

-- Delete all product UOMs first (due to foreign key constraints)
DELETE FROM product_uoms;

-- Delete test products (products with "Test" in the name or E2E prefixes)
DELETE FROM products WHERE
  name LIKE '%Test%'
  OR name LIKE 'E2E%'
  OR sku LIKE 'E2E%'
  OR sku LIKE 'SKU-E2E%';

-- If you want to delete ALL products and start fresh, uncomment below:
-- DELETE FROM product_variants;
-- DELETE FROM product_uoms;
-- DELETE FROM product_locations;
-- DELETE FROM product_images;
-- DELETE FROM product_videos;
-- DELETE FROM bundle_items;
-- DELETE FROM product_bundles;
-- DELETE FROM products;

-- Show remaining products (for verification)
SELECT COUNT(*) as remaining_products FROM products;
SELECT COUNT(*) as remaining_product_uoms FROM product_uoms;
