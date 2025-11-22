-- =============================================
-- DELETE ALL TEST DATA FROM ALL MICROSERVICES
-- =============================================
-- WARNING: This will DELETE ALL DATA from all tables!
-- Only run this in development/test environments.
-- =============================================

-- =============================================
-- PRODUCT SERVICE
-- =============================================
-- Delete in reverse order of dependencies (children first, parents last)

-- Product-related deletions (children)
DELETE FROM custom_pricing;
DELETE FROM pricing_tiers;
DELETE FROM product_locations;
DELETE FROM product_videos;
DELETE FROM product_images;
DELETE FROM bundle_items;
DELETE FROM product_bundles;
DELETE FROM product_variants;
DELETE FROM product_uoms;

-- Products (referenced by many tables)
DELETE FROM products;

-- Master data
DELETE FROM categories;
DELETE FROM uoms;

-- =============================================
-- INVENTORY SERVICE
-- =============================================
-- Delete in reverse order of dependencies

DELETE FROM inventory_movements;
DELETE FROM inventory_reservations;
DELETE FROM inventory;
DELETE FROM warehouses;

-- =============================================
-- ORDER SERVICE
-- =============================================
-- Delete in reverse order of dependencies

DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;

-- =============================================
-- PAYMENT SERVICE
-- =============================================
-- Delete in reverse order of dependencies

DELETE FROM payment_events;
DELETE FROM refunds;
DELETE FROM payments;

-- =============================================
-- SHIPPING SERVICE
-- =============================================
-- Delete in reverse order of dependencies

DELETE FROM tracking_history;
DELETE FROM shipments;
DELETE FROM shipping_rates;

-- =============================================
-- ACCOUNTING SERVICE
-- =============================================
-- Delete in reverse order of dependencies
-- Note: Soft deletes should be maintained, but we can still delete for testing

DELETE FROM account_balances;
DELETE FROM journal_lines;
DELETE FROM journal_entries;
-- Note: Be careful with chart_of_accounts as it might contain system accounts
-- Only delete non-system accounts
DELETE FROM chart_of_accounts WHERE is_system_account = 0;

-- =============================================
-- USER SERVICE
-- =============================================
-- Delete in reverse order of dependencies

DELETE FROM user_addresses;
DELETE FROM refresh_tokens;
-- Note: You might want to keep admin users
-- Delete all non-admin users
DELETE FROM users WHERE user_type != 'admin';
-- Or delete ALL users including admin (uncomment below):
-- DELETE FROM users;

-- =============================================
-- VACUUM (SQLite optimization after bulk delete)
-- =============================================
VACUUM;
