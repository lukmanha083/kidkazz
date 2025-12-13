# Phase 1 Testing Guide - DDD Refactoring

## Overview
This guide provides step-by-step instructions for testing the Phase 1 critical fixes for the DDD refactoring initiative.

---

## Prerequisites

1. **Start all services:**
   ```bash
   # Start the services (from project root)
   npm run dev
   ```

2. **Run the migration:**
   ```bash
   # Run the minimumStock sync migration
   curl -X POST http://localhost:8792/api/inventory/admin/sync-minimum-stock
   ```

   Expected response:
   ```json
   {
     "success": true,
     "totalInventoryRecords": X,
     "updatedRecords": Y,
     "skippedRecords": Z,
     "errorRecords": 0,
     "errors": [],
     "details": [...]
   }
   ```

---

## Test 1: Validation - Product with Expiration Date Requires Warehouse Allocation

**Purpose:** Verify that products with expiration dates cannot be created without warehouse allocation.

### Steps:

1. Navigate to Products page in admin dashboard
2. Click "Add Product" button
3. Fill in the product form:
   - Barcode: `TEST-EXP-001`
   - Name: `Test Expired Product`
   - SKU: `TST-EXP-001`
   - Price: `50000`
   - Stock: `100`
   - Minimum Stock: `20`
   - **Expiration Date:** Select a date 5 days from today
4. **Do NOT add any warehouse allocation**
5. Click "Create Product"

### Expected Result:
- ❌ Product creation should **FAIL**
- Error toast should appear: "Expiration date requires warehouse allocation"
- Description: "Products with expiration dates must be allocated to at least one warehouse for inventory tracking"

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 2: Create Product with Expiration Date and Warehouse Allocation

**Purpose:** Verify that products with expiration dates CAN be created when warehouse allocation is provided.

### Steps:

1. Navigate to Products page in admin dashboard
2. Click "Add Product" button
3. Fill in the product form:
   - Barcode: `TEST-EXP-002`
   - Name: `Test Expiring Milk`
   - SKU: `TST-EXP-002`
   - Price: `15000`
   - Stock: `50`
   - Minimum Stock: `10`
   - **Expiration Date:** Select a date 10 days from today
   - **Alert Date:** Select a date 5 days from today
4. **Add warehouse allocation:**
   - Select a warehouse (e.g., "Jakarta Warehouse")
   - Quantity: `50`
   - Rack: `A1`
   - Bin: `01`
5. Click "Create Product"

### Expected Result:
- ✅ Product should be created successfully
- Success toast: "Product created successfully"
- Product should appear in the products list

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 3: Product Report Shows Expiring Products

**Purpose:** Verify that the Product Report displays products with expiration dates.

### Steps:

1. Navigate to Dashboard (`/dashboard`)
2. Locate the "Product Report" section
3. Check the "Expiring Soon" list

### Expected Result:
- ✅ The product created in Test 2 ("Test Expiring Milk") should appear in the "Expiring Soon" section
- The product should show:
  - Name: Test Expiring Milk
  - Expiration date
  - Days until expiration

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 4: Inventory Expired Stock Report Shows Products

**Purpose:** Verify that the Inventory Expired Stock Report displays products with warehouse allocations.

### Steps:

1. Navigate to Inventory > Expired Stock (`/dashboard/inventory/expired-stock`)
2. Check if the product created in Test 2 appears in the report

### Expected Result:
- ✅ The product "Test Expiring Milk" should appear in the Expired Stock Report
- The report should show:
  - Product name
  - Warehouse location
  - Quantity
  - Expiration date
  - Status (e.g., "expiring-soon" if within 30 days)

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 5: Migration Verification - minimumStock Sync

**Purpose:** Verify that the migration successfully synced minimumStock values.

### Steps:

1. Query the inventory database to check minimumStock values:
   ```bash
   # Get migration results from the API call made in Prerequisites
   # Check the response JSON
   ```

2. Verify in the admin dashboard:
   - Navigate to Inventory page
   - Check that inventory records show the correct minimumStock values
   - These should match the minimumStock from the product records

### Expected Result:
- ✅ All inventory records should have minimumStock matching their corresponding products
- Migration response should show `success: true` and `errorRecords: 0`

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 6: Low Stock Report Functionality

**Purpose:** Verify that the Low Stock Report works correctly after the minimumStock migration.

### Steps:

1. Create a product with low stock:
   - Barcode: `TEST-LOW-001`
   - Name: `Test Low Stock Product`
   - SKU: `TST-LOW-001`
   - Price: `25000`
   - Stock: `5`
   - **Minimum Stock: `50`** (set higher than stock)
   - Warehouse allocation: 5 units

2. Navigate to Inventory > Low Stock Report

### Expected Result:
- ✅ The product "Test Low Stock Product" should appear in the Low Stock Report
- The report should show:
  - Current stock: 5
  - Minimum stock: 50
  - Status: Low stock alert

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Test 7: Edit Product - Expiration Date Validation

**Purpose:** Verify that validation also works when editing products.

### Steps:

1. Find an existing product WITHOUT expiration date
2. Click "Edit" on the product
3. Set an expiration date
4. Remove all warehouse allocations (if any exist)
5. Click "Update Product"

### Expected Result:
- ❌ Product update should **FAIL**
- Error toast: "Expiration date requires warehouse allocation"

### Actual Result:
- [ ] PASS
- [ ] FAIL (describe what happened):

---

## Troubleshooting

### Issue: Migration endpoint returns errors

**Solution:**
- Check that Product Service is running
- Verify service bindings are configured in `wrangler.jsonc`
- Check logs for specific error messages

### Issue: Products not appearing in Inventory Report

**Possible causes:**
1. Product has no warehouse allocation (expected behavior)
2. Expiration date is > 30 days away (filtered out)
3. Product has no expiration date set (filtered out)

**Solution:**
- Verify product has expiration date within 30 days
- Verify product has at least one warehouse allocation
- Check browser console for API errors

### Issue: Validation not triggering

**Solution:**
- Clear browser cache
- Verify the admin dashboard code was updated
- Check browser console for JavaScript errors

---

## Summary Checklist

After completing all tests, verify:

- [ ] Validation prevents products with expiration dates from being created without warehouse allocation
- [ ] Products with expiration dates and warehouse allocations can be created successfully
- [ ] Product Report shows expiring products
- [ ] Inventory Expired Stock Report shows products with warehouse allocations
- [ ] Migration successfully synced minimumStock values
- [ ] Low Stock Report functions correctly
- [ ] Validation works for both create and edit operations

---

## Next Steps

Once Phase 1 testing is complete and all tests pass:
1. Document any issues found
2. Proceed to Phase 2 - High Priority refactoring
3. Begin implementation of total-stock API endpoints

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Validation prevents creation | [ ] | |
| Test 2: Product creation with allocation | [ ] | |
| Test 3: Product Report display | [ ] | |
| Test 4: Inventory Report display | [ ] | |
| Test 5: Migration verification | [ ] | |
| Test 6: Low Stock Report | [ ] | |
| Test 7: Edit validation | [ ] | |

**Overall Phase 1 Status:** ⏳ Pending Testing

**Tested By:** _______________
**Date:** _______________
**Environment:** Development / Staging / Production
