-- Business Partner Service Initial Schema
-- Creates tables for: customers, suppliers, employees, addresses

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`customer_type` text NOT NULL,
	`company_name` text,
	`npwp` text,
	`credit_limit` integer DEFAULT 0,
	`credit_used` integer DEFAULT 0,
	`payment_term_days` integer DEFAULT 0,
	`loyalty_points` integer DEFAULT 0,
	`membership_tier` text,
	`total_orders` integer DEFAULT 0,
	`total_spent` integer DEFAULT 0,
	`last_order_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_code_unique` ON `customers` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_customers_code` ON `customers` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_customers_email` ON `customers` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_customers_status` ON `customers` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_customers_type` ON `customers` (`customer_type`);

--> statement-breakpoint
-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`company_name` text,
	`npwp` text,
	`payment_term_days` integer DEFAULT 30,
	`lead_time_days` integer DEFAULT 7,
	`minimum_order_amount` integer DEFAULT 0,
	`bank_name` text,
	`bank_account_number` text,
	`bank_account_name` text,
	`rating` real,
	`total_orders` integer DEFAULT 0,
	`total_purchased` integer DEFAULT 0,
	`last_order_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_code_unique` ON `suppliers` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_suppliers_code` ON `suppliers` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_suppliers_status` ON `suppliers` (`status`);

--> statement-breakpoint
-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`employee_number` text,
	`department` text,
	`position` text,
	`manager_id` text,
	`date_of_birth` integer,
	`gender` text,
	`national_id` text,
	`npwp` text,
	`join_date` integer,
	`end_date` integer,
	`employment_status` text DEFAULT 'active' NOT NULL,
	`base_salary` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_code_unique` ON `employees` (`code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_number_unique` ON `employees` (`employee_number`);
--> statement-breakpoint
CREATE INDEX `idx_employees_code` ON `employees` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_employees_email` ON `employees` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_employees_status` ON `employees` (`employment_status`);
--> statement-breakpoint
CREATE INDEX `idx_employees_department` ON `employees` (`department`);
--> statement-breakpoint
CREATE INDEX `idx_employees_manager` ON `employees` (`manager_id`);

--> statement-breakpoint
-- ============================================================================
-- ADDRESSES TABLE (Shared by all partner types)
-- ============================================================================
CREATE TABLE `addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`address_type` text NOT NULL,
	`is_primary` integer DEFAULT 0,
	`label` text,
	`recipient_name` text,
	`phone` text,
	`address_line_1` text NOT NULL,
	`address_line_2` text,
	`subdistrict` text,
	`district` text,
	`city` text NOT NULL,
	`province` text NOT NULL,
	`postal_code` text,
	`country` text DEFAULT 'Indonesia',
	`latitude` real,
	`longitude` real,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_addresses_owner` ON `addresses` (`owner_type`, `owner_id`);
--> statement-breakpoint
CREATE INDEX `idx_addresses_primary` ON `addresses` (`owner_type`, `owner_id`, `is_primary`);
