-- Migration: Add physical attributes to products table
-- Purpose: Add weight and dimensions for shipping cost calculation
-- Columns: weight (kg), length (cm), width (cm), height (cm)

ALTER TABLE `products` ADD COLUMN `weight` real;
ALTER TABLE `products` ADD COLUMN `length` real;
ALTER TABLE `products` ADD COLUMN `width` real;
ALTER TABLE `products` ADD COLUMN `height` real;
