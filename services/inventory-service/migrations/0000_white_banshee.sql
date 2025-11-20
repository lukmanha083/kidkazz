CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`warehouse_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_available` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`quantity_in_transit` integer DEFAULT 0,
	`minimum_stock` integer DEFAULT 0,
	`last_restocked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`product_id` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`movement_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`reason` text,
	`notes` text,
	`performed_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_reserved` integer NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`confirmed_at` integer,
	`released_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address_line1` text NOT NULL,
	`address_line2` text,
	`city` text NOT NULL,
	`province` text NOT NULL,
	`postal_code` text NOT NULL,
	`country` text DEFAULT 'Indonesia' NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);