CREATE TABLE `bundle_items` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_sku` text NOT NULL,
	`product_name` text NOT NULL,
	`barcode` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bundle_id`) REFERENCES `product_bundles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_pricing` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`user_id` text NOT NULL,
	`custom_price` real NOT NULL,
	`valid_from` integer,
	`valid_until` integer,
	`created_at` integer NOT NULL,
	`created_by` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pricing_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`min_quantity` integer NOT NULL,
	`discount_percentage` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_name` text NOT NULL,
	`bundle_sku` text NOT NULL,
	`bundle_description` text,
	`bundle_image` text,
	`bundle_price` real NOT NULL,
	`discount_percentage` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`available_stock` integer DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_bundles_bundle_sku_unique` ON `product_bundles` (`bundle_sku`);--> statement-breakpoint
CREATE TABLE `product_uoms` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`uom_code` text NOT NULL,
	`uom_name` text NOT NULL,
	`barcode` text NOT NULL,
	`conversion_factor` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_uoms_barcode_unique` ON `product_uoms` (`barcode`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`product_sku` text NOT NULL,
	`variant_name` text NOT NULL,
	`variant_sku` text NOT NULL,
	`variant_type` text NOT NULL,
	`price` real NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_variant_sku_unique` ON `product_variants` (`variant_sku`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`barcode` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`description` text,
	`image` text,
	`category_id` text,
	`price` real NOT NULL,
	`retail_price` real,
	`wholesale_price` real,
	`stock` integer DEFAULT 0 NOT NULL,
	`base_unit` text DEFAULT 'PCS' NOT NULL,
	`wholesale_threshold` integer DEFAULT 100,
	`minimum_order_quantity` integer DEFAULT 1,
	`rating` real DEFAULT 0,
	`reviews` integer DEFAULT 0,
	`available_for_retail` integer DEFAULT true,
	`available_for_wholesale` integer DEFAULT true,
	`status` text DEFAULT 'active',
	`is_bundle` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `uoms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`conversion_factor` integer NOT NULL,
	`is_base_unit` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uoms_code_unique` ON `uoms` (`code`);