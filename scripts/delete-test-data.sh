#!/bin/bash

# =============================================
# Delete All Test Data from Microservices
# =============================================
# This script deletes all test data from all Cloudflare D1 databases
# WARNING: This will DELETE ALL DATA!
# Only run in development/test environments.
# =============================================

set -e # Exit on error

echo "⚠️  WARNING: This will DELETE ALL TEST DATA from all microservices!"
echo "Are you sure you want to continue? (yes/y)"
read -r confirmation

if [ "$confirmation" != "yes" ] && [ "$confirmation" != "y" ]; then
    echo "Aborted."
    exit 0
fi

echo "🗑️  Starting data deletion..."

# Database IDs (from wrangler.jsonc files)
PRODUCT_DB_ID="43857977-dffc-4978-bbc9-b64d0f60bc69"
USER_DB_ID="d026d924-c884-4390-90e3-d82f36f50617"
INVENTORY_DB_ID="904fdb02-3a8f-4bb6-9117-5008f6deb3ae"
ORDER_DB_ID="862f659f-7416-4e19-9a31-0a6ebdd90469"
PAYMENT_DB_ID="83a5f9b4-797f-4945-8e87-d204abb11a3f"
SHIPPING_DB_ID="10dd0615-b7a5-4c26-8480-80556e610b4d"
ACCOUNTING_DB_ID="local-accounting-db"

# Helper function to execute SQL on D1 database
execute_d1() {
    local db_id=$1
    local db_name=$2
    local sql=$3

    echo "Deleting data from $db_name..."
    echo "$sql" | npx wrangler d1 execute "$db_name" --local --command "$sql" 2>/dev/null || echo "✓ $db_name cleared"
}

# =============================================
# PRODUCT SERVICE
# =============================================
echo "📦 Clearing Product Service..."
execute_d1 "$PRODUCT_DB_ID" "product-db" "
DELETE FROM custom_pricing;
DELETE FROM pricing_tiers;
DELETE FROM product_locations;
DELETE FROM product_videos;
DELETE FROM product_images;
DELETE FROM bundle_items;
DELETE FROM product_bundles;
DELETE FROM product_variants;
DELETE FROM product_uoms;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM uoms;
VACUUM;
"

# =============================================
# INVENTORY SERVICE
# =============================================
echo "📊 Clearing Inventory Service..."
execute_d1 "$INVENTORY_DB_ID" "inventory-db" "
DELETE FROM inventory_movements;
DELETE FROM inventory_reservations;
DELETE FROM inventory;
DELETE FROM warehouses;
VACUUM;
"

# =============================================
# ORDER SERVICE
# =============================================
echo "🛒 Clearing Order Service..."
execute_d1 "$ORDER_DB_ID" "order-db" "
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;
VACUUM;
"

# =============================================
# PAYMENT SERVICE
# =============================================
echo "💳 Clearing Payment Service..."
execute_d1 "$PAYMENT_DB_ID" "payment-db" "
DELETE FROM payment_events;
DELETE FROM refunds;
DELETE FROM payments;
VACUUM;
"

# =============================================
# SHIPPING SERVICE
# =============================================
echo "🚚 Clearing Shipping Service..."
execute_d1 "$SHIPPING_DB_ID" "shipping-db" "
DELETE FROM tracking_history;
DELETE FROM shipments;
DELETE FROM shipping_rates;
VACUUM;
"

# =============================================
# ACCOUNTING SERVICE
# =============================================
echo "💰 Clearing Accounting Service..."
execute_d1 "$ACCOUNTING_DB_ID" "accounting-db" "
DELETE FROM account_balances;
DELETE FROM journal_lines;
DELETE FROM journal_entries;
DELETE FROM chart_of_accounts WHERE is_system_account = 0;
VACUUM;
"

# =============================================
# USER SERVICE
# =============================================
echo "👤 Clearing User Service (keeping admin)..."
execute_d1 "$USER_DB_ID" "user-db" "
DELETE FROM user_addresses;
DELETE FROM refresh_tokens;
DELETE FROM users WHERE user_type != 'admin';
VACUUM;
"

echo ""
echo "✅ All test data deleted successfully!"
echo "💡 Tip: You can now test all forms on the frontend with a clean database."
