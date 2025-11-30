#!/bin/bash

# Phase 1 Diagnostic Script
# Helps identify why Tests 4-6 are failing

set -e

echo "================================================"
echo "Phase 1 Testing Diagnostic Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service URLs
PRODUCT_SERVICE="http://localhost:8791"
INVENTORY_SERVICE="http://localhost:8792"

echo "Step 1: Checking if services are running..."
echo "=============================================="

# Check Product Service
if curl -s "$PRODUCT_SERVICE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Product Service is running (port 8791)"
else
    echo -e "${RED}✗${NC} Product Service is NOT running (port 8791)"
    echo "  → Run 'npm run dev' to start services"
    exit 1
fi

# Check Inventory Service
if curl -s "$INVENTORY_SERVICE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Inventory Service is running (port 8792)"
else
    echo -e "${RED}✗${NC} Inventory Service is NOT running (port 8792)"
    echo "  → Run 'npm run dev' to start services"
    exit 1
fi

echo ""
echo "Step 2: Checking inventory records..."
echo "=============================================="

# Get inventory count
INVENTORY_COUNT=$(curl -s "$INVENTORY_SERVICE/api/inventory" | jq '.inventory | length' 2>/dev/null || echo "0")
echo "Total inventory records: $INVENTORY_COUNT"

if [ "$INVENTORY_COUNT" -eq "0" ]; then
    echo -e "${YELLOW}⚠${NC}  No inventory records found"
    echo "  → Create products with warehouse allocations first"
else
    echo -e "${GREEN}✓${NC} Inventory records exist"

    # Check minimumStock values
    echo ""
    echo "Checking minimumStock synchronization..."

    ZERO_MIN_STOCK=$(curl -s "$INVENTORY_SERVICE/api/inventory" | jq '[.inventory[] | select(.minimumStock == 0 or .minimumStock == null)] | length' 2>/dev/null || echo "0")

    if [ "$ZERO_MIN_STOCK" -gt "0" ]; then
        echo -e "${RED}✗${NC} Found $ZERO_MIN_STOCK inventory records with minimumStock = 0 or null"
        echo "  → This is why Test 6 (Low Stock Report) fails!"
        echo "  → Run migration: curl -X POST $INVENTORY_SERVICE/api/inventory/admin/sync-minimum-stock"
    else
        echo -e "${GREEN}✓${NC} All inventory records have minimumStock set"
    fi
fi

echo ""
echo "Step 3: Checking products with expiration dates..."
echo "======================================================"

# Get products with expiration dates
EXPIRED_PRODUCTS=$(curl -s "$PRODUCT_SERVICE/api/products" | jq '[.products[] | select(.expirationDate != null)] | length' 2>/dev/null || echo "0")
echo "Products with expiration dates: $EXPIRED_PRODUCTS"

if [ "$EXPIRED_PRODUCTS" -eq "0" ]; then
    echo -e "${YELLOW}⚠${NC}  No products with expiration dates found"
    echo "  → Create a test product with expiration date for Test 4"
else
    echo -e "${GREEN}✓${NC} Found $EXPIRED_PRODUCTS product(s) with expiration dates"

    # Check if any are within 30 days
    echo ""
    echo "Checking expiration dates (must be ≤ 30 days for Test 4)..."

    EXPIRING_SOON=$(curl -s "$PRODUCT_SERVICE/api/products" | jq --arg today "$(date +%Y-%m-%d)" '[.products[] | select(.expirationDate != null) | select((.expirationDate | fromdateiso8601) - ($today | fromdateiso8601) <= 2592000)] | length' 2>/dev/null || echo "0")

    if [ "$EXPIRING_SOON" -eq "0" ]; then
        echo -e "${RED}✗${NC} No products expiring within 30 days"
        echo "  → This is why Test 4 (Expired Stock Report) is empty!"
        echo "  → Create product with expiration date ≤ 30 days from today"
    else
        echo -e "${GREEN}✓${NC} Found $EXPIRING_SOON product(s) expiring within 30 days"
    fi
fi

echo ""
echo "Step 4: Checking inventory-product linkage..."
echo "================================================"

# Check if products with expiration dates have inventory records
if [ "$EXPIRED_PRODUCTS" -gt "0" ]; then
    PRODUCTS_WITH_INVENTORY=$(curl -s "$PRODUCT_SERVICE/api/products" | jq -r '[.products[] | select(.expirationDate != null) | .id] as $pids | $pids | length' 2>/dev/null || echo "0")

    echo "Products with expiration dates that should have inventory: $PRODUCTS_WITH_INVENTORY"

    # This is a simplified check - in reality would need to cross-reference
    if [ "$INVENTORY_COUNT" -eq "0" ]; then
        echo -e "${RED}✗${NC} No inventory records to link with products"
        echo "  → Products need warehouse allocations to create inventory records"
    fi
fi

echo ""
echo "Step 5: Running migration status check..."
echo "=============================================="

echo "Testing migration endpoint..."
MIGRATION_RESPONSE=$(curl -s -X POST "$INVENTORY_SERVICE/api/inventory/admin/sync-minimum-stock")

SUCCESS=$(echo "$MIGRATION_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
TOTAL=$(echo "$MIGRATION_RESPONSE" | jq -r '.totalInventoryRecords' 2>/dev/null || echo "0")
UPDATED=$(echo "$MIGRATION_RESPONSE" | jq -r '.updatedRecords' 2>/dev/null || echo "0")
SKIPPED=$(echo "$MIGRATION_RESPONSE" | jq -r '.skippedRecords' 2>/dev/null || echo "0")
ERRORS=$(echo "$MIGRATION_RESPONSE" | jq -r '.errorRecords' 2>/dev/null || echo "0")

if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓${NC} Migration executed successfully"
    echo "  Total records: $TOTAL"
    echo "  Updated: $UPDATED"
    echo "  Skipped: $SKIPPED"
    echo "  Errors: $ERRORS"

    if [ "$UPDATED" -gt "0" ]; then
        echo -e "${GREEN}✓${NC} Migration updated $UPDATED records - Test 6 should now pass!"
    fi
else
    echo -e "${RED}✗${NC} Migration failed or returned errors"
    echo "  Check the response for details:"
    echo "$MIGRATION_RESPONSE" | jq '.'
fi

echo ""
echo "================================================"
echo "Diagnostic Summary"
echo "================================================"
echo ""

# Summary of findings
echo "Test 4 (Inventory Expired Stock Report):"
if [ "$EXPIRING_SOON" -gt "0" ] && [ "$INVENTORY_COUNT" -gt "0" ]; then
    echo -e "  ${GREEN}✓${NC} Should PASS - Products with expiration dates exist and have inventory"
elif [ "$EXPIRED_PRODUCTS" -eq "0" ]; then
    echo -e "  ${RED}✗${NC} Will FAIL - No products with expiration dates"
    echo "     → Create product with expiration date ≤ 30 days from today"
elif [ "$EXPIRING_SOON" -eq "0" ]; then
    echo -e "  ${RED}✗${NC} Will FAIL - Expiration dates are > 30 days away"
    echo "     → Create product with expiration date ≤ 30 days from today"
else
    echo -e "  ${YELLOW}⚠${NC}  May FAIL - Check warehouse allocations"
fi

echo ""
echo "Test 5 (Migration Verification):"
if [ "$SUCCESS" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} Should PASS - Migration executed successfully"
else
    echo -e "  ${RED}✗${NC} Will FAIL - Migration encountered errors"
fi

echo ""
echo "Test 6 (Low Stock Report):"
if [ "$ZERO_MIN_STOCK" -eq "0" ] && [ "$INVENTORY_COUNT" -gt "0" ]; then
    echo -e "  ${GREEN}✓${NC} Should PASS - minimumStock synchronized"
elif [ "$INVENTORY_COUNT" -eq "0" ]; then
    echo -e "  ${RED}✗${NC} Will FAIL - No inventory records"
    echo "     → Create products with warehouse allocations"
elif [ "$ZERO_MIN_STOCK" -gt "0" ]; then
    echo -e "  ${RED}✗${NC} Will FAIL - minimumStock not synchronized"
    echo "     → Migration just ran and updated $UPDATED records"
    echo "     → Refresh the Low Stock Report page"
else
    echo -e "  ${YELLOW}⚠${NC}  Status unclear - check manually"
fi

echo ""
echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""

if [ "$INVENTORY_COUNT" -eq "0" ]; then
    echo "1. Create a test product with:"
    echo "   - Minimum Stock: 50"
    echo "   - Stock: 5"
    echo "   - Expiration Date: 10 days from today"
    echo "   - Warehouse Allocation: 5 units"
    echo ""
fi

if [ "$ZERO_MIN_STOCK" -gt "0" ] || [ "$UPDATED" -gt "0" ]; then
    echo "2. Refresh the reports in your browser (Ctrl+Shift+R)"
    echo "   - Low Stock Report: /dashboard/inventory/low-stock"
    echo "   - Expired Stock Report: /dashboard/inventory/expired-stock"
    echo ""
fi

echo "3. Review detailed troubleshooting guide:"
echo "   docs/PHASE1_TROUBLESHOOTING.md"
echo ""

echo "================================================"
echo "Diagnostic Complete!"
echo "================================================"
