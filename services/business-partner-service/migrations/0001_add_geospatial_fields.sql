-- Migration: Add geospatial fields for graph analysis & mobile mining
-- Compatible with Apache Sedona export

-- ============================================================================
-- CUSTOMERS TABLE: Add geospatial fields
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `service_area_geojson` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_delivery_zone` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_known_latitude` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_known_longitude` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_known_geohash` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_location_accuracy` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_location_source` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_location_captured_at` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_location_captured_by` text;
--> statement-breakpoint
CREATE INDEX `idx_customers_geohash` ON `customers` (`last_known_geohash`);
--> statement-breakpoint
CREATE INDEX `idx_customers_delivery_zone` ON `customers` (`preferred_delivery_zone`);

--> statement-breakpoint
-- ============================================================================
-- ADDRESSES TABLE: Add enhanced geospatial fields
-- ============================================================================
ALTER TABLE `addresses` ADD COLUMN `geohash` text;
--> statement-breakpoint
ALTER TABLE `addresses` ADD COLUMN `location_accuracy` real;
--> statement-breakpoint
ALTER TABLE `addresses` ADD COLUMN `location_source` text;
--> statement-breakpoint
ALTER TABLE `addresses` ADD COLUMN `location_captured_at` integer;
--> statement-breakpoint
ALTER TABLE `addresses` ADD COLUMN `location_captured_by` text;
--> statement-breakpoint
ALTER TABLE `addresses` ADD COLUMN `geojson` text;
--> statement-breakpoint
CREATE INDEX `idx_addresses_geohash` ON `addresses` (`geohash`);
--> statement-breakpoint
CREATE INDEX `idx_addresses_coords` ON `addresses` (`latitude`, `longitude`);

--> statement-breakpoint
-- ============================================================================
-- CUSTOMER LOCATION HISTORY TABLE (for mobile app tracking)
-- ============================================================================
CREATE TABLE `customer_location_history` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`geohash` text NOT NULL,
	`accuracy` real,
	`altitude` real,
	`speed` real,
	`heading` real,
	`source` text NOT NULL,
	`captured_by` text,
	`device_id` text,
	`visit_type` text,
	`visit_notes` text,
	`photo_url` text,
	`geojson` text,
	`captured_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_location_history_customer` ON `customer_location_history` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_location_history_geohash` ON `customer_location_history` (`geohash`);
--> statement-breakpoint
CREATE INDEX `idx_location_history_captured` ON `customer_location_history` (`captured_at`);
--> statement-breakpoint
CREATE INDEX `idx_location_history_captured_by` ON `customer_location_history` (`captured_by`);
--> statement-breakpoint
CREATE INDEX `idx_location_history_visit_type` ON `customer_location_history` (`visit_type`);
