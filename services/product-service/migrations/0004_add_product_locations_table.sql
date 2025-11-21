-- Migration: Add product_locations table
-- Description: Tracks physical location (rack, bin, zone, aisle) of products in warehouses
-- This allows precise location tracking for inventory management

CREATE TABLE IF NOT EXISTS `product_locations` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `product_id` TEXT NOT NULL,
  `warehouse_id` TEXT NOT NULL,
  `rack` TEXT,
  `bin` TEXT,
  `zone` TEXT,
  `aisle` TEXT,
  `quantity` INTEGER DEFAULT 0 NOT NULL,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  `created_by` TEXT,
  `updated_by` TEXT,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

-- Create index for faster lookups by product
CREATE INDEX IF NOT EXISTS `idx_product_locations_product_id` ON `product_locations`(`product_id`);

-- Create index for faster lookups by warehouse
CREATE INDEX IF NOT EXISTS `idx_product_locations_warehouse_id` ON `product_locations`(`warehouse_id`);

-- Create composite index for product + warehouse lookups
CREATE INDEX IF NOT EXISTS `idx_product_locations_product_warehouse` ON `product_locations`(`product_id`, `warehouse_id`);
