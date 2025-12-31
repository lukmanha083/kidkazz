# Phase 1 Testing - Troubleshooting Guide

## Overview
This document helps diagnose and fix common issues when Tests 4-6 fail during Phase 1 testing.

---

## Root Cause Analysis

### Why Tests 4-6 Fail

After analyzing the report implementations, here are the common issues:

**Test 4: Inventory Expired Stock Report** (/dashboard/inventory/expired-stock)
- Report logic at `expired-stock.tsx:108-144`
- **Filters applied:**
  1. Product must have `expirationDate` set
  2. Must meet ONE of these criteria:
     - `daysUntilExpiration < 0` (already expired)
     - `daysUntilExpiration <= 30` (expiring within 30 days)
     - `alertDate` reached

**Common reasons for empty report:**
- ❌ Expiration date is > 30 days away (filtered out by design)
- ❌ Product has no warehouse allocation (no inventory record)
- ❌ Inventory record not created properly

**Test 5: Migration Verification**
- **Issue:** Migration endpoint exists but wasn't run

**Test 6: Low Stock Report** (/dashboard/inventory/low-stock)
- Report logic at `low-stock.tsx:83-100`
- **Filter:** `quantityAvailable < minimumStock`
- **Issue:** If `inventory.minimumStock = 0` (default), products won't appear
- **Root cause:** Migration not run yet!

---

## Diagnostic Steps

### Step 1: Check if Migration Was Run

```bash
# Check inventory service logs
# Look for: "=== Migration Complete ==="

# Or query inventory records directly
curl http://localhost:8792/api/inventory | jq '.inventory[] | {id, productId, minimumStock}'
```

**Expected:** minimumStock should match product's minimumStock
**If you see:** `"minimumStock": 0` or `"minimumStock": null` → Migration not run

### Step 2: Check Inventory Records Were Created

```bash
# Get all inventory records
curl http://localhost:8792/api/inventory | jq '.inventory | length'

# Check specific product's inventory
curl http://localhost:8792/api/inventory?productId=YOUR_PRODUCT_ID | jq
```

**Expected:** Inventory records exist for products with warehouse allocations
**If empty:** Product locations might not have triggered inventory creation

### Step 3: Check Product Expiration Dates

```bash
# Get products with expiration dates
curl http://localhost:8791/api/products | jq '.products[] | select(.expirationDate != null) | {name, sku, expirationDate, minimumStock}'
```

**Check:**
- Is expiration date within 30 days from today?
- Does product have warehouse allocations?

---

## Fixes

### Fix 1: Run the Migration (REQUIRED)

**This is the most common issue!**

```bash
# Make sure inventory service is running
curl http://localhost:8792/health

# Run the migration
curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock

# Expected response:
{
  "success": true,
  "totalInventoryRecords": X,
  "updatedRecords": Y,
  "skippedRecords": Z,
  "errorRecords": 0
}
```

**If you get errors:**
- Check that both Product Service (8791) and Inventory Service (8792) are running
- Check service bindings in `wrangler.jsonc`
- Review error details in the response

**After migration:**
- Refresh the Low Stock Report
- Test again

### Fix 2: Create Test Product with Correct Dates

The key is to set expiration date **within 30 days** for it to appear in reports.

```typescript
// In the ERP dashboard:
Expiration Date: TODAY + 10 days  // ✅ Will appear
Expiration Date: TODAY + 45 days  // ❌ Won't appear (filtered out)
```

**Proper test product setup:**
1. Name: "Test Expiring Milk"
2. SKU: "TST-EXP-002"
3. Price: 15000
4. Stock: 50
5. **Minimum Stock: 10** (important!)
6. **Expiration Date: 10 days from today** (not 30+)
7. Alert Date: 5 days from today
8. **Warehouse Allocation:** 50 units at a warehouse

### Fix 3: Verify Inventory Records

After creating a product with warehouse allocation, check:

```bash
# Get the product ID first
PRODUCT_ID=$(curl http://localhost:8791/api/products | jq -r '.products[] | select(.sku == "TST-EXP-002") | .id')

# Check if inventory record was created
curl "http://localhost:8792/api/inventory?productId=$PRODUCT_ID" | jq

# Expected output:
{
  "inventory": [
    {
      "id": "...",
      "productId": "...",
      "warehouseId": "...",
      "quantityAvailable": 50,
      "minimumStock": 10,  // ✅ Should match product
      ...
    }
  ]
}
```

**If minimumStock is 0:**
1. Run the migration (Fix 1)
2. OR manually set it via API:

```bash
INVENTORY_ID="..." # From above query
curl -X PATCH "http://localhost:8792/api/inventory/$INVENTORY_ID/minimum-stock" \
  -H "Content-Type: application/json" \
  -d '{"minimumStock": 10}'
```

---

## Expected Behavior After Fixes

### Test 4: Inventory Expired Stock Report

**Visit:** `/dashboard/inventory/expired-stock`

**Should see:**
```
Expiring Soon: 1
Within 30 days

Product: Test Expiring Milk
SKU: TST-EXP-002
Warehouse: [Your warehouse]
Stock: 50
Expiration Date: [10 days from now]
Days Until Expiry: 10 days
Status: Expiring Soon
```

**Still empty?**
- Check browser console for API errors
- Verify expiration date is <= 30 days from today
- Refresh the page (hard refresh: Ctrl+Shift+R)

### Test 5: Migration Verification

**Run:**
```bash
curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock | jq
```

**Should see:**
```json
{
  "success": true,
  "totalInventoryRecords": 5,
  "updatedRecords": 3,
  "skippedRecords": 2,
  "errorRecords": 0,
  "errors": [],
  "details": [
    {
      "inventoryId": "...",
      "productId": "...",
      "warehouseId": "...",
      "oldMinimumStock": 0,
      "newMinimumStock": 10,
      "status": "updated"
    },
    ...
  ]
}
```

**If success: false:**
- Check the `errors` array
- Common issues:
  - Product Service not running (check port 8791)
  - Service binding not configured
  - Database connection issues

### Test 6: Low Stock Report

**Create test product:**
- Stock: 5
- Minimum Stock: 50
- Warehouse allocation: 5 units

**After running migration, visit:** `/dashboard/inventory/low-stock`

**Should see:**
```
Low Stock Items: 1
Products below minimum

Product: Test Low Stock Product
Current Stock: 5 (red badge)
Minimum Stock: 50
Deficit: -45
```

**Still empty?**
- Run migration (inventory.minimumStock must be synced)
- Verify: `quantityAvailable < minimumStock`
- Check browser console for errors

---

## Common Mistakes

### ❌ Mistake 1: Not Running Migration
**Symptom:** Low Stock Report is empty
**Fix:** Run `curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock`

### ❌ Mistake 2: Expiration Date Too Far Away
**Symptom:** Product doesn't appear in Expired Stock Report
**Fix:** Set expiration date to within 30 days from today

### ❌ Mistake 3: No Warehouse Allocation
**Symptom:** Validation error when creating product, OR inventory record doesn't exist
**Fix:** Add warehouse allocation before saving product

### ❌ Mistake 4: Services Not Running
**Symptom:** API errors, empty reports
**Fix:**
```bash
# Check all services
curl http://localhost:8791/health  # Product Service
curl http://localhost:8792/health  # Inventory Service

# Start services if not running
npm run dev
```

### ❌ Mistake 5: Caching Issues
**Symptom:** Changes not visible in UI
**Fix:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear React Query cache (close and reopen browser tab)

---

## Step-by-Step Recovery Procedure

If all tests are failing, follow this exact sequence:

### 1. Verify Services Running
```bash
curl http://localhost:8791/health  # Should return: {"status":"healthy","service":"product-service"}
curl http://localhost:8792/health  # Should return: {"status":"healthy","service":"inventory-service"}
```

### 2. Run Migration
```bash
curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock
# Wait for response, verify success: true
```

### 3. Create Proper Test Product
In ERP dashboard:
- Go to Products → Add Product
- Fill form:
  - Barcode: `TEST-PHASE1-001`
  - Name: `Phase 1 Test Product`
  - SKU: `PHASE1-001`
  - Price: `25000`
  - Stock: `5`
  - **Minimum Stock: `50`** ← Important!
  - **Expiration Date: Select date 15 days from today** ← Within 30 days!
  - Alert Date: Select date 10 days from today
- Add Warehouse Allocation:
  - Select any warehouse
  - Quantity: `5`
  - Rack: `A1`
  - Bin: `01`
- Click "Create Product"
- Should succeed ✅

### 4. Verify Data Created
```bash
# Get product ID
PRODUCT_ID=$(curl http://localhost:8791/api/products | jq -r '.products[] | select(.sku == "PHASE1-001") | .id')
echo "Product ID: $PRODUCT_ID"

# Check inventory record
curl "http://localhost:8792/api/inventory?productId=$PRODUCT_ID" | jq '.inventory[0] | {quantityAvailable, minimumStock}'

# Expected:
{
  "quantityAvailable": 5,
  "minimumStock": 50  # ✅ Should match product's minimumStock
}
```

### 5. Test Reports
1. **Low Stock Report:** `/dashboard/inventory/low-stock`
   - Should show "Phase 1 Test Product" (stock 5 < minimum 50)

2. **Expired Stock Report:** `/dashboard/inventory/expired-stock`
   - Should show "Phase 1 Test Product" in "Expiring Soon" (15 days until expiration)

3. **Product Report:** `/dashboard/products`
   - Should show product in "Expiring Soon" section

---

## Verification Checklist

After fixes, verify each test:

- [ ] **Test 4:** Product appears in Inventory Expired Stock Report
  - Expiration date within 30 days ✅
  - Warehouse allocation exists ✅
  - Shows in report table ✅

- [ ] **Test 5:** Migration runs successfully
  - Response shows `success: true` ✅
  - `errorRecords: 0` ✅
  - Updated records shown in details ✅

- [ ] **Test 6:** Product appears in Low Stock Report
  - `inventory.minimumStock` matches `product.minimumStock` ✅
  - `quantityAvailable < minimumStock` ✅
  - Shows in report table ✅

---

## Still Having Issues?

### Check Service Logs

**Inventory Service logs:**
```bash
# Look for migration execution logs
# Should see: "Starting minimumStock migration..."
# Should see: "✅ Updated inventory..."
```

**Product Service logs:**
```bash
# Look for product creation logs
# Look for warehouse allocation creation logs
```

### Check Database Directly

If using Wrangler:
```bash
# Query inventory database
wrangler d1 execute inventory-db --command "SELECT * FROM inventory LIMIT 5"

# Query product database
wrangler d1 execute product-db --command "SELECT id, name, minimumStock, expirationDate FROM products WHERE expirationDate IS NOT NULL"
```

### Debug API Responses

```bash
# Get detailed inventory API response
curl -v http://localhost:8792/api/inventory 2>&1 | less

# Get detailed product API response
curl -v http://localhost:8791/api/products 2>&1 | less
```

### Browser Console Debugging

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to report page
4. Check API calls:
   - `/api/inventory` - should return inventory records
   - `/api/products` - should return products
   - `/api/warehouses` - should return warehouses

---

## Summary

The most common issue is **not running the migration**. This causes:
- Test 5 to fail (migration not executed)
- Test 6 to fail (minimumStock still 0 in inventory records)

**Quick fix:**
```bash
curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock
```

The second most common issue is **expiration date > 30 days away**. This causes:
- Test 4 to fail (product filtered out of report)

**Quick fix:** Create test products with expiration dates within 30 days.

---

**After applying these fixes, all Phase 1 tests should pass!** ✅
