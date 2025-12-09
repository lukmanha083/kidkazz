#!/bin/bash

# Seed Test Data Script
# Seeds test data directly into local databases using SQL

echo "=== Seeding Test Data ==="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Function to execute SQL
exec_sql() {
  local service=$1
  local db=$2
  local sql=$3
  npx wrangler d1 execute "$db" --local --config "services/$service/wrangler.jsonc" --command "$sql"
}

# Current timestamp
TIMESTAMP=$(date +%s)000

# Step 1: Create warehouses in Inventory DB
echo "Step 1: Creating warehouses..."
WH1_ID="$TIMESTAMP-wh1"
WH2_ID="$TIMESTAMP-wh2"

exec_sql "inventory-service" "inventory-db" "
INSERT INTO warehouses (id, code, name, address_line1, city, province, postal_code, contact_name, contact_phone, contact_email, status, created_at, updated_at)
VALUES
  ('$WH1_ID', 'WH-CENTRAL', 'Central Warehouse', '123 Main Street', 'Jakarta', 'DKI Jakarta', '12345', 'John Doe', '+62-21-1234567', 'central@warehouse.com', 'active', $TIMESTAMP, $TIMESTAMP),
  ('$WH2_ID', 'WH-NORTH', 'North Warehouse', '456 North Ave', 'Surabaya', 'East Java', '67890', 'Jane Smith', '+62-31-7654321', 'north@warehouse.com', 'active', $TIMESTAMP, $TIMESTAMP);
"

echo "✅ Created 2 warehouses"
echo ""

# Step 2: Create category in Product DB
echo "Step 2: Creating category..."
CAT_ID="$TIMESTAMP-cat1"

exec_sql "product-service" "product-db" "
INSERT INTO categories (id, name, description, icon, color, status, created_at, updated_at)
VALUES ('$CAT_ID', 'Beverages', 'Drinks and beverages', '🥤', '#FF6B6B', 'active', $TIMESTAMP, $TIMESTAMP);
"

echo "✅ Created 1 category"
echo ""

# Step 3: Create products in Product DB
echo "Step 3: Creating products..."
PROD1_ID="$TIMESTAMP-prod1"
PROD2_ID="$TIMESTAMP-prod2"
PROD3_ID="$TIMESTAMP-prod3"

exec_sql "product-service" "product-db" "
INSERT INTO products (id, barcode, name, sku, description, category_id, price, base_unit, status, expiration_date, alert_date, created_at, updated_at)
VALUES
  ('$PROD1_ID', 'BAR-001', 'Coca Cola 330ml', 'COKE-330', 'Classic Coca Cola', '$CAT_ID', 5000, 'PCS', 'active', '2026-12-31', '2026-11-30', $TIMESTAMP, $TIMESTAMP),
  ('$PROD2_ID', 'BAR-002', 'Pepsi 330ml', 'PEPSI-330', 'Pepsi Cola', '$CAT_ID', 4500, 'PCS', 'active', '2026-10-31', '2026-09-30', $TIMESTAMP, $TIMESTAMP),
  ('$PROD3_ID', 'BAR-003', 'Sprite 330ml', 'SPRITE-330', 'Lemon-lime soda', '$CAT_ID', 4800, 'PCS', 'active', NULL, NULL, $TIMESTAMP, $TIMESTAMP);
"

echo "✅ Created 3 products"
echo ""

# Step 4: Create product variants
echo "Step 4: Creating product variants..."
VAR1_ID="$TIMESTAMP-var1"
VAR2_ID="$TIMESTAMP-var2"

exec_sql "product-service" "product-db" "
INSERT INTO product_variants (id, product_id, product_name, product_sku, variant_name, variant_sku, variant_type, price, status, created_at)
VALUES
  ('$VAR1_ID', '$PROD1_ID', 'Coca Cola 330ml', 'COKE-330', 'Coke Zero', 'COKE-ZERO-330', 'flavor', 5500, 'active', $TIMESTAMP),
  ('$VAR2_ID', '$PROD2_ID', 'Pepsi 330ml', 'PEPSI-330', 'Pepsi Max', 'PEPSI-MAX-330', 'flavor', 5000, 'active', $TIMESTAMP);
"

echo "✅ Created 2 product variants"
echo ""

# Step 5: Create product UOMs
echo "Step 5: Creating product UOMs..."
UOM1_ID="$TIMESTAMP-uom1"
UOM2_ID="$TIMESTAMP-uom2"
UOM3_ID="$TIMESTAMP-uom3"

exec_sql "product-service" "product-db" "
INSERT INTO product_uoms (id, product_id, uom_code, uom_name, barcode, conversion_factor, is_default, created_at, updated_at)
VALUES
  ('$UOM1_ID', '$PROD1_ID', 'BOX6', 'Box of 6', 'BOX6-COKE-330', 6, 0, $TIMESTAMP, $TIMESTAMP),
  ('$UOM2_ID', '$PROD2_ID', 'CARTON12', 'Carton of 12', 'CARTON12-PEPSI-330', 12, 0, $TIMESTAMP, $TIMESTAMP),
  ('$UOM3_ID', '$PROD3_ID', 'BOX6', 'Box of 6', 'BOX6-SPRITE-330', 6, 0, $TIMESTAMP, $TIMESTAMP);
"

echo "✅ Created 3 product UOMs"
echo ""

# Step 6: Create product locations
echo "Step 6: Creating product locations..."

for i in {1..3}; do
  for j in {1..2}; do
    PLOC_ID="$TIMESTAMP-ploc-$i-$j"
    if [ $i -eq 1 ]; then PROD_ID=$PROD1_ID; fi
    if [ $i -eq 2 ]; then PROD_ID=$PROD2_ID; fi
    if [ $i -eq 3 ]; then PROD_ID=$PROD3_ID; fi

    if [ $j -eq 1 ]; then WH_ID=$WH1_ID; fi
    if [ $j -eq 2 ]; then WH_ID=$WH2_ID; fi

    QTY=$((50 + i * 10 + j * 5))

    exec_sql "product-service" "product-db" "
    INSERT INTO product_locations (id, product_id, warehouse_id, rack, bin, zone, aisle, quantity, created_at, updated_at)
    VALUES ('$PLOC_ID', '$PROD_ID', '$WH_ID', 'R$i', 'B$j', 'Z$i', 'A$j', $QTY, $TIMESTAMP, $TIMESTAMP);
    "
  done
done

echo "✅ Created 6 product locations"
echo ""

# Step 7: Create variant locations
echo "Step 7: Creating variant locations..."

for i in {1..2}; do
  for j in {1..2}; do
    VLOC_ID="$TIMESTAMP-vloc-$i-$j"
    if [ $i -eq 1 ]; then VAR_ID=$VAR1_ID; fi
    if [ $i -eq 2 ]; then VAR_ID=$VAR2_ID; fi

    if [ $j -eq 1 ]; then WH_ID=$WH1_ID; fi
    if [ $j -eq 2 ]; then WH_ID=$WH2_ID; fi

    QTY=$((30 + i * 5 + j * 3))

    exec_sql "product-service" "product-db" "
    INSERT INTO variant_locations (id, variant_id, warehouse_id, rack, bin, zone, aisle, quantity, created_at, updated_at)
    VALUES ('$VLOC_ID', '$VAR_ID', '$WH_ID', 'RV$i', 'BV$j', 'ZV$i', 'AV$j', $QTY, $TIMESTAMP, $TIMESTAMP);
    "
  done
done

echo "✅ Created 4 variant locations"
echo ""

# Step 8: Create product UOM locations
echo "Step 8: Creating product UOM locations..."

for i in {1..3}; do
  for j in {1..2}; do
    ULOC_ID="$TIMESTAMP-uloc-$i-$j"
    if [ $i -eq 1 ]; then UOM_ID=$UOM1_ID; fi
    if [ $i -eq 2 ]; then UOM_ID=$UOM2_ID; fi
    if [ $i -eq 3 ]; then UOM_ID=$UOM3_ID; fi

    if [ $j -eq 1 ]; then WH_ID=$WH1_ID; fi
    if [ $j -eq 2 ]; then WH_ID=$WH2_ID; fi

    QTY=$((10 + i * 2 + j))

    exec_sql "product-service" "product-db" "
    INSERT INTO product_uom_locations (id, product_uom_id, warehouse_id, rack, bin, zone, aisle, quantity, created_at, updated_at)
    VALUES ('$ULOC_ID', '$UOM_ID', '$WH_ID', 'RU$i', 'BU$j', 'ZU$i', 'AU$j', $QTY, $TIMESTAMP, $TIMESTAMP);
    "
  done
done

echo "✅ Created 6 UOM locations"
echo ""

echo "=== Test Data Seeding Complete ==="
echo ""
echo "Summary:"
echo "- 2 warehouses"
echo "- 1 category"
echo "- 3 products (2 with expiration dates)"
echo "- 2 product variants"
echo "- 3 product UOMs"
echo "- 6 product locations"
echo "- 4 variant locations"
echo "- 6 UOM locations"
