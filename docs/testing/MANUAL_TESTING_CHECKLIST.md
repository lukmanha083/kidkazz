# Manual Testing Checklist
## Multi-Warehouse Refactoring Features

**Branch:** `claude/continue-previous-session-01LUzTBn6NBu18Em7jtaPcYC`
**Date:** 2025-11-25
**Tester:** _______________
**Environment:** Development / Staging / Production

---

## Pre-Testing Setup

### Environment Verification
- [ ] **Backend server running**
  - [ ] Port: _______
  - [ ] URL: http://localhost:____
  - [ ] Health check: `/api/health` returns 200 OK

- [ ] **Frontend development server running**
  - [ ] Port: _______
  - [ ] URL: http://localhost:____
  - [ ] Application loads without errors

- [ ] **Database connection verified**
  - [ ] Can connect to database
  - [ ] Test data seeded (see Section: Test Data Setup)
  - [ ] Tables exist: products, warehouses, inventory, product_locations

- [ ] **User authentication working**
  - [ ] Can log in as admin user
  - [ ] Session persists on page refresh
  - [ ] Can access all dashboard routes

---

## Test Data Setup

### Warehouses (Minimum 3 required)
- [ ] **Warehouse A**
  - Name: Main Warehouse
  - City: New York
  - Status: Active

- [ ] **Warehouse B**
  - Name: West Coast Warehouse
  - City: Los Angeles
  - Status: Active

- [ ] **Warehouse C**
  - Name: Central Warehouse
  - City: Chicago
  - Status: Active

### Products with Expiration Dates
- [ ] **Expired Product**
  - SKU: EXP-001
  - Expiration: 5 days ago
  - Stock: 10

- [ ] **Expiring Soon (10 days)**
  - SKU: EXP-002
  - Expiration: 10 days from today
  - Stock: 20

- [ ] **Expiring Soon (30 days)**
  - SKU: EXP-003
  - Expiration: 30 days from today
  - Stock: 30

- [ ] **Expiring Outside Window (31+ days)**
  - SKU: EXP-004
  - Expiration: 35 days from today
  - Stock: 40

- [ ] **No Expiration**
  - SKU: NORM-001
  - Expiration: null
  - Stock: 100

### Inventory with Low Stock
- [ ] **Product in Warehouse A**
  - Quantity Available: 5
  - Minimum Stock: 10
  - Status: LOW STOCK

- [ ] **Product in Warehouse B**
  - Quantity Available: 8
  - Minimum Stock: 20
  - Status: LOW STOCK

- [ ] **Product in Warehouse C**
  - Quantity Available: 100
  - Minimum Stock: 50
  - Status: OK

---

## 1. Product Multi-Warehouse Allocation (Phase 1)

### Test 1.1: Create Product with Single Warehouse
**Priority:** HIGH

**Steps:**
1. [ ] Navigate to `/dashboard/products/all`
2. [ ] Click "Add Product" button
3. [ ] Fill form:
   - [ ] Product Name: "Test Product Single"
   - [ ] SKU: "TP-SINGLE-001"
   - [ ] Category: Electronics (or any category)
   - [ ] Price: 100000
   - [ ] Stock: 100
4. [ ] Scroll to "Warehouse Allocation" section
5. [ ] Click "Add Warehouse" button
6. [ ] Select warehouse: "Main Warehouse"
7. [ ] Enter quantity: 100
8. [ ] Enter rack: "A1"
9. [ ] Enter bin: "B1"
10. [ ] Click "Add" button

**Verify:**
- [ ] Allocation appears in list with:
  - Warehouse name: Main Warehouse
  - Quantity: 100
  - Location: Rack A1, Bin B1
- [ ] Green checkmark icon visible (stock matches)
- [ ] "Main Warehouse" removed from "Add Warehouse" dropdown

11. [ ] Click "Save" / "Submit" form button

**Expected Results:**
- [ ] ✅ Success toast: "Product added successfully"
- [ ] ✅ Product appears in products table
- [ ] ✅ Can see product in list with correct name and SKU

**Database Verification:**
- [ ] Open database tool / run query:
  ```sql
  SELECT * FROM product_locations WHERE product_id = <product_id>;
  ```
- [ ] ✅ 1 record exists
- [ ] ✅ warehouse_id = Main Warehouse ID
- [ ] ✅ quantity = 100
- [ ] ✅ rack = "A1", bin = "B1"

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.2: Create Product with Multiple Warehouses
**Priority:** HIGH

**Steps:**
1. [ ] Click "Add Product" button
2. [ ] Fill form:
   - [ ] Product Name: "Test Product Multi"
   - [ ] SKU: "TP-MULTI-001"
   - [ ] Category: Electronics
   - [ ] Price: 150000
   - [ ] Stock: 300
3. [ ] Add 3 warehouse allocations:

   **Allocation 1:**
   - [ ] Warehouse: "Main Warehouse"
   - [ ] Quantity: 100
   - [ ] Rack: "A1", Bin: "B1", Zone: "Z1", Aisle: "A"
   - [ ] Click "Add"

   **Allocation 2:**
   - [ ] Warehouse: "West Coast Warehouse"
   - [ ] Quantity: 100
   - [ ] Rack: "A2", Bin: "B2"
   - [ ] Click "Add"

   **Allocation 3:**
   - [ ] Warehouse: "Central Warehouse"
   - [ ] Quantity: 100
   - [ ] Rack: "A3"
   - [ ] Click "Add"

**Verify:**
- [ ] 3 allocations visible in list
- [ ] Total allocated = 300
- [ ] Green checkmark icon (matches stock)
- [ ] Each allocation shows correct warehouse name and location

4. [ ] Submit form

**Expected Results:**
- [ ] ✅ Success toast
- [ ] ✅ Product in table

**Database Verification:**
- [ ] ✅ 3 product_location records created
- [ ] ✅ Each record has correct warehouse_id and quantity
- [ ] ✅ Total quantity across all records = 300

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.3: Edit Product - Load Existing Allocations
**Priority:** HIGH

**Prerequisite:** Complete Test 1.2 (product with 3 allocations exists)

**Steps:**
1. [ ] Find "Test Product Multi" in products table
2. [ ] Click edit icon / "Edit" button

**Verify Form Load:**
- [ ] Modal/drawer opens
- [ ] Product name populated: "Test Product Multi"
- [ ] SKU populated: "TP-MULTI-001"
- [ ] Stock populated: 300

**Verify Warehouse Allocations Loaded:**
- [ ] ✅ 3 allocations displayed
- [ ] ✅ Allocation 1:
  - Warehouse name: Main Warehouse
  - Quantity: 100
  - Rack: A1, Bin: B1, Zone: Z1, Aisle: A
- [ ] ✅ Allocation 2:
  - Warehouse name: West Coast Warehouse
  - Quantity: 100
  - Rack: A2, Bin: B2
- [ ] ✅ Allocation 3:
  - Warehouse name: Central Warehouse
  - Quantity: 100
  - Rack: A3
- [ ] ✅ Total matches stock (green checkmark)

3. [ ] Click "Cancel" (don't save)

**Expected Results:**
- [ ] Form closes without errors
- [ ] No changes saved

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.4: Edit Product - Add New Warehouse
**Priority:** HIGH

**Prerequisite:** Product with 1 allocation exists

**Setup:**
- Create or use existing product with:
  - Total stock: 100
  - Allocations: [Main Warehouse: 100]

**Steps:**
1. [ ] Edit the product
2. [ ] Update stock to 200
3. [ ] Click "Add Warehouse"
4. [ ] Select "West Coast Warehouse"
5. [ ] Enter quantity: 100
6. [ ] Click "Add"

**Verify:**
- [ ] 2 allocations now visible
- [ ] Total = 200 (green checkmark)

7. [ ] Submit form

**Expected Results:**
- [ ] ✅ Success toast
- [ ] ✅ Product updated

**Database Verification:**
- [ ] ✅ 2 product_location records exist
- [ ] ✅ Original allocation (Main Warehouse:100) unchanged
- [ ] ✅ New allocation (West Coast Warehouse:100) created

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.5: Edit Product - Remove Warehouse
**Priority:** HIGH

**Prerequisite:** Product with 2+ allocations exists

**Setup:**
- Use product from Test 1.4 with:
  - Allocations: [Main Warehouse: 100, West Coast: 100]
  - Total stock: 200

**Steps:**
1. [ ] Edit the product
2. [ ] Click delete icon (trash) on "West Coast Warehouse" allocation
3. [ ] Update stock to 100
4. [ ] Verify only 1 allocation remains (Main Warehouse: 100)
5. [ ] Submit form

**Expected Results:**
- [ ] ✅ Success toast

**Database Verification:**
- [ ] ✅ Only 1 product_location record remains
- [ ] ✅ Main Warehouse allocation still exists
- [ ] ✅ West Coast Warehouse allocation deleted

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.6: Edit Product - Update Quantities
**Priority:** MEDIUM

**Setup:**
- Product with:
  - Allocations: [Warehouse A: 50, Warehouse B: 50]
  - Total stock: 100

**Steps:**
1. [ ] Edit product
2. [ ] Click edit icon on Warehouse A allocation
3. [ ] Change quantity from 50 to 70
4. [ ] Change rack from old value to "A5"
5. [ ] Click "Save"
6. [ ] Click edit icon on Warehouse B allocation
7. [ ] Change quantity from 50 to 80
8. [ ] Click "Save"
9. [ ] Update total stock to 150
10. [ ] Verify green checkmark (total matches)
11. [ ] Submit form

**Database Verification:**
- [ ] ✅ Warehouse A: quantity=70, rack="A5"
- [ ] ✅ Warehouse B: quantity=80
- [ ] ✅ Product stock = 150

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.7: Stock Validation - Perfect Match
**Priority:** MEDIUM

**Steps:**
1. [ ] Create new product
2. [ ] Set stock = 100
3. [ ] Add allocations:
   - Warehouse A: 50
   - Warehouse B: 50
4. [ ] Observe validation indicator

**Expected Results:**
- [ ] ✅ Green checkmark icon displayed
- [ ] ✅ No warning messages
- [ ] ✅ Form can be submitted

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.8: Stock Validation - Over Allocation
**Priority:** MEDIUM

**Steps:**
1. [ ] Create new product
2. [ ] Set stock = 100
3. [ ] Add allocations:
   - Warehouse A: 60
   - Warehouse B: 60
4. [ ] Observe validation indicator

**Expected Results:**
- [ ] ❌ Red alert/warning banner displayed
- [ ] ❌ Message: "Total allocated (120) exceeds total stock (100)" (or similar)
- [ ] ⚠️ Form submission allowed (soft validation) but warning visible

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.9: Stock Validation - Under Allocation
**Priority:** MEDIUM

**Steps:**
1. [ ] Create new product
2. [ ] Set stock = 100
3. [ ] Add allocations:
   - Warehouse A: 30
   - Warehouse B: 40
4. [ ] Observe validation indicator

**Expected Results:**
- [ ] ⚠️ Yellow/orange alert/warning banner displayed
- [ ] ⚠️ Message: "Total allocated (70) is less than total stock (100)" (or similar)
- [ ] ⚠️ Form submission allowed but warning visible

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 1.10: Prevent Duplicate Warehouse
**Priority:** LOW

**Steps:**
1. [ ] Create new product
2. [ ] Add allocation: Main Warehouse, qty 50
3. [ ] Click "Add Warehouse" button again
4. [ ] Observe warehouse dropdown options

**Expected Results:**
- [ ] ✅ "Main Warehouse" NOT in dropdown
- [ ] ✅ Only unallocated warehouses visible
- [ ] ✅ Cannot select same warehouse twice

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 2. Bundle Warehouse Selection (Phase 2)

### Test 2.1: Warehouse Selector Displays
**Priority:** HIGH

**Steps:**
1. [ ] Navigate to `/dashboard/products/bundle`
2. [ ] Click "Add Bundle" button
3. [ ] Scroll through form

**Verify:**
- [ ] "Assembly Warehouse" field visible
- [ ] Field type: dropdown/select
- [ ] Field marked as required (*) or "Required" label
- [ ] Dropdown contains all active warehouses
- [ ] Default: "Select warehouse..." or empty

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 2.2: Create Bundle with Warehouse
**Priority:** HIGH

**Steps:**
1. [ ] Fill bundle form:
   - [ ] Bundle Name: "Test Starter Kit"
   - [ ] Bundle SKU: "TSK-001"
   - [ ] Bundle Description: "Test bundle"
   - [ ] Bundle Price: 500000 (or leave auto-calculated)
   - [ ] Discount: 10
   - [ ] Available Stock: 50
   - [ ] Status: Active
2. [ ] Select products for bundle (minimum 2 products)
3. [ ] **Select Assembly Warehouse: "Main Warehouse"**
4. [ ] Submit form

**Expected Results:**
- [ ] ✅ Success toast: "Bundle created successfully" (or similar)
- [ ] ✅ Bundle appears in bundles table
- [ ] ✅ Can see bundle with correct name and SKU

**Database Verification:**
- [ ] Query: `SELECT * FROM product_bundles WHERE bundle_sku = 'TSK-001';`
- [ ] ✅ Record exists
- [ ] ✅ warehouse_id field = Main Warehouse ID
- [ ] ✅ Other fields correct (name, SKU, price, etc.)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 2.3: Required Validation - Warehouse Field
**Priority:** HIGH

**Steps:**
1. [ ] Click "Add Bundle"
2. [ ] Fill all required fields EXCEPT warehouse
3. [ ] Select bundle products
4. [ ] Leave "Assembly Warehouse" unselected (empty)
5. [ ] Try to submit form

**Expected Results:**
- [ ] ❌ Form submission blocked
- [ ] ❌ HTML5 validation error: "Please select an item in the list" (or similar)
- [ ] ❌ Warehouse field highlighted/focused
- [ ] ❌ Bundle NOT created

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 2.4: Edit Bundle - Warehouse Pre-selected
**Priority:** MEDIUM

**Prerequisite:** Complete Test 2.2 (bundle with warehouse exists)

**Steps:**
1. [ ] Find "Test Starter Kit" bundle in table
2. [ ] Click edit icon / "Edit" button
3. [ ] Observe "Assembly Warehouse" field

**Expected Results:**
- [ ] ✅ Warehouse dropdown shows "Main Warehouse" (pre-selected)
- [ ] ✅ Other bundle details populated correctly
- [ ] ✅ Bundle products loaded

4. [ ] Change warehouse to "West Coast Warehouse"
5. [ ] Submit form

**Expected Results:**
- [ ] ✅ Bundle updated successfully

**Database Verification:**
- [ ] ✅ warehouse_id now = West Coast Warehouse ID

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 2.5: Warehouse Dropdown - Empty State
**Priority:** LOW

**Setup Required:**
- Temporarily delete all warehouses from database OR
- Mock API to return empty warehouses array

**Steps:**
1. [ ] Open "Add Bundle" form
2. [ ] Observe "Assembly Warehouse" dropdown

**Expected Results:**
- [ ] Dropdown shows "No warehouses available" OR
- [ ] Dropdown disabled with helpful message OR
- [ ] Form displays warning: "Please create a warehouse first"

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 3. Variant Warehouse Allocation (Phase 3)

### Test 3.1: Warehouse Allocation Component Renders
**Priority:** HIGH

**Steps:**
1. [ ] Navigate to `/dashboard/products/variant`
2. [ ] Click "Add Variant" button
3. [ ] Scroll down to bottom of form

**Verify:**
- [ ] "Warehouse Allocation" section visible
- [ ] Section separated by horizontal line/divider
- [ ] ProductWarehouseAllocation component rendered
- [ ] Shows "No warehouse allocations yet" or empty state
- [ ] "Add Warehouse" button visible

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 3.2: Add Variant with Warehouse Allocations
**Priority:** HIGH

⚠️ **NOTE:** Backend API not yet implemented. Allocations will NOT be saved.

**Steps:**
1. [ ] Fill variant form:
   - [ ] Variant Name: "Red XL"
   - [ ] Variant SKU: "RED-XL-001"
   - [ ] Variant Description: "Red color, XL size"
   - [ ] Price: 150000
   - [ ] Stock: 100
2. [ ] Add warehouse allocations:
   - [ ] Warehouse A: 60, Rack "A1"
   - [ ] Warehouse B: 40, Rack "B1"
3. [ ] Verify total = 100 (green checkmark)
4. [ ] Submit form

**Expected Results:**
- [ ] ✅ Variant created successfully
- [ ] ✅ Success toast displayed
- [ ] ⚠️ **Allocations NOT saved** (backend pending)

**Database Verification:**
- [ ] ✅ Variant record exists in product_variants table
- [ ] ❌ variant_locations table does NOT exist yet (expected)
- [ ] ❌ No location records (expected)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 3.3: Stock Validation Works for Variants
**Priority:** MEDIUM

**Steps:**
1. [ ] Open "Add Variant" form
2. [ ] Set stock = 50
3. [ ] Add allocations:
   - Warehouse A: 30
   - Warehouse B: 30 (total = 60)
4. [ ] Observe validation indicator

**Expected Results:**
- [ ] ❌ Red alert: "Total allocated (60) exceeds total stock (50)"
- [ ] ✅ Real-time calculation works
- [ ] ⚠️ Form still submittable (soft validation)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 3.4: Allocations Reset on Cancel/New Form
**Priority:** LOW

**Steps:**
1. [ ] Open "Add Variant" form
2. [ ] Add 2 warehouse allocations
3. [ ] Click "Cancel" button
4. [ ] Click "Add Variant" again

**Expected Results:**
- [ ] ✅ Form is empty
- [ ] ✅ Warehouse allocations section reset (empty)
- [ ] ✅ No allocations visible

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 3.5: Edit Variant - Allocations State
**Priority:** LOW

⚠️ **NOTE:** Backend not implemented. Allocations won't load.

**Steps:**
1. [ ] Click edit on existing variant
2. [ ] Observe warehouse allocation section

**Current Expected Behavior:**
- [ ] ✅ Form opens with variant data
- [ ] ⚠️ Warehouse allocations section empty (placeholder)
- [ ] ⚠️ No allocations loaded (backend pending)

**Future Expected Behavior (when backend ready):**
- [ ] ✅ Existing allocations loaded from database
- [ ] ✅ All location details displayed

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 4. Expiration Date Report

### Test 4.1: Expired Products Count
**Priority:** HIGH

**Prerequisite:** Test data includes expired products (see Test Data Setup)

**Steps:**
1. [ ] Navigate to `/dashboard/products`
2. [ ] Locate "Expired Products" card/widget

**Verify:**
- [ ] Card displays count of expired products
- [ ] Count includes products with expirationDate < today
- [ ] Count does NOT include products expiring today
- [ ] Count does NOT include products with null expiration

**Expected Count:**
- [ ] Based on test data: _____ (verify with actual test data)

**Database Verification:**
```sql
SELECT COUNT(*) FROM products
WHERE expiration_date < CURRENT_DATE;
```
- [ ] ✅ UI count matches database count

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 4.2: Expiring Soon Products Count (30-Day Window)
**Priority:** HIGH

**Steps:**
1. [ ] Locate "Expiring Soon" card on Products page

**Verify:**
- [ ] Card displays count
- [ ] Count includes products expiring between TODAY and TODAY+30 days
- [ ] Products expiring in 31+ days NOT included
- [ ] Products expiring today ARE included

**Test Cases:**
- [ ] Product expiring tomorrow: INCLUDED
- [ ] Product expiring in 15 days: INCLUDED
- [ ] Product expiring in 30 days: INCLUDED (edge case)
- [ ] Product expiring in 31 days: NOT INCLUDED

**Expected Count:** _____ (based on test data)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 4.3: Products Expiring Soon Table
**Priority:** MEDIUM

**Steps:**
1. [ ] Scroll to "Products Expiring Soon" table on Products page

**Verify Table:**
- [ ] Table visible (if products expiring soon exist)
- [ ] Columns displayed:
  - [ ] Product Name
  - [ ] SKU
  - [ ] Expiration Date
  - [ ] Days Remaining (optional)
- [ ] Shows only products expiring in 0-30 days
- [ ] Sorted by expiration date (soonest first)

**Test Row:**
- [ ] Click on a product (if clickable)
- [ ] Data accurate (compare with database)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 4.4: Date Normalization Edge Case
**Priority:** LOW

**Setup:**
- Create product with expiration date = TODAY at 11:59 PM

**Steps:**
1. [ ] View Products page
2. [ ] Check "Expired Products" count
3. [ ] Check "Expiring Soon" count/table

**Expected Results:**
- [ ] ✅ Product NOT in "Expired" count (expires today, not yet expired)
- [ ] ✅ Product IS in "Expiring Soon" (0 days remaining)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 4.5: Products Without Expiration Dates Excluded
**Priority:** MEDIUM

**Prerequisite:** Test data includes products with expirationDate = null

**Steps:**
1. [ ] View Products page
2. [ ] Note expired/expiring counts

**Verify:**
- [ ] Products with null expiration NOT counted in "Expired"
- [ ] Products with null expiration NOT counted in "Expiring Soon"
- [ ] No errors in browser console

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 5. Inventory Report - Real API Integration

### Test 5.1: API Integration - No Mock Data
**Priority:** HIGH

**Steps:**
1. [ ] Open browser DevTools (F12)
2. [ ] Go to Network tab
3. [ ] Navigate to `/dashboard/inventory`
4. [ ] Observe network requests

**Verify Network Calls:**
- [ ] ✅ GET request to `/api/inventory` (or inventoryApi.getAll())
- [ ] ✅ GET request to `/api/warehouses` (or warehouseApi.getAll())
- [ ] ✅ GET request to `/api/products` (or productApi.getAll())
- [ ] ✅ All requests return 200 OK
- [ ] ✅ Responses contain real data (not hardcoded arrays)

**Code Review (Optional):**
- [ ] Open `apps/erp-dashboard/src/routes/dashboard/inventory/index.tsx`
- [ ] ✅ useQuery hooks for inventoryApi, warehouseApi, productApi
- [ ] ❌ NO mock data arrays like `const mockInventory = [...]`
- [ ] ❌ NO imports from mockData.ts files

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.2: Loading States Display
**Priority:** MEDIUM

**Steps:**
1. [ ] Navigate to `/dashboard/inventory`
2. [ ] Observe initial page load (first 1-2 seconds)

**Expected Loading State:**
- [ ] ✅ Loading spinner OR skeleton UI displayed
- [ ] ✅ "Loading..." text shown OR
- [ ] ✅ Placeholder cards/shimmer effect
- [ ] ❌ NO errors in console during loading

3. [ ] After data loads:
- [ ] ✅ Loading state disappears
- [ ] ✅ Real data displayed

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.3: Warehouse Cards Display
**Priority:** HIGH

**Prerequisite:** At least 3 warehouses with inventory data

**Steps:**
1. [ ] Navigate to `/dashboard/inventory`
2. [ ] Count warehouse cards displayed

**Verify:**
- [ ] Number of cards = number of warehouses in database
- [ ] Each card shows:
  - [ ] Warehouse name
  - [ ] Total items count (sum of all quantities)
  - [ ] Low stock count (items where qty < minimum)
  - [ ] Total value (formatted as currency, e.g., Rp 1,250,000)

**Test One Card in Detail:**
- Card: _________________ (warehouse name)
- [ ] Warehouse name correct
- [ ] Total items: _______
- [ ] Low stock count: _______
- [ ] Total value: Rp _______

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.4: Total Items Calculation
**Priority:** HIGH

**Test Data:**
- Warehouse A inventory:
  - Product 1: quantity=50
  - Product 2: quantity=30
  - Product 3: quantity=20
- Expected total: 100

**Steps:**
1. [ ] View Warehouse A card
2. [ ] Note "Total Items" value

**Verify:**
- [ ] Total Items = 100 (or correct sum based on actual data)

**Database Verification:**
```sql
SELECT SUM(quantity_available) FROM inventory
WHERE warehouse_id = <warehouse_a_id>;
```
- [ ] ✅ UI matches database

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.5: Low Stock Count Calculation
**Priority:** HIGH

**Test Data:**
- Warehouse B inventory:
  - Product A: quantity=5, minimum=10 ← LOW STOCK
  - Product B: quantity=15, minimum=10 ← OK
  - Product C: quantity=8, minimum=20 ← LOW STOCK
- Expected low stock count: 2

**Steps:**
1. [ ] View Warehouse B card
2. [ ] Note "Low Stock" count

**Verify:**
- [ ] Low Stock Count = 2 (or correct count)

**Database Verification:**
```sql
SELECT COUNT(*) FROM inventory
WHERE warehouse_id = <warehouse_b_id>
  AND quantity_available < minimum_stock;
```
- [ ] ✅ UI matches database

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.6: Total Value Calculation
**Priority:** HIGH

**Test Data:**
- Warehouse C inventory:
  - Product X: quantity=10, price=Rp 10,000
  - Product Y: quantity=5, price=Rp 20,000
- Expected total value: (10 × 10,000) + (5 × 20,000) = Rp 200,000

**Steps:**
1. [ ] View Warehouse C card
2. [ ] Note "Total Value"

**Verify:**
- [ ] Total Value = Rp 200,000 (or correct calculation)
- [ ] Value formatted as currency (Rp X,XXX)

**Manual Calculation:**
- Product X: _____ × Rp _____ = Rp _____
- Product Y: _____ × Rp _____ = Rp _____
- **Total:** Rp _____________

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.7: Expiring Products Section
**Priority:** MEDIUM

**Prerequisite:** Inventory includes products expiring in 0-30 days

**Steps:**
1. [ ] Scroll to "Products Expiring Soon" section on Inventory Report

**Verify:**
- [ ] Section visible (if expiring products exist)
- [ ] Products listed with:
  - [ ] Product name
  - [ ] SKU
  - [ ] Expiration date
  - [ ] Warehouse name (showing where product is stocked)
  - [ ] Days remaining (optional)
- [ ] Only products expiring in 30 days shown
- [ ] Sorted by expiration date

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.8: Empty Warehouse Handling
**Priority:** MEDIUM

**Setup:**
- Warehouse D exists but has NO inventory records

**Steps:**
1. [ ] View Inventory Report
2. [ ] Locate Warehouse D card

**Expected Results:**
- [ ] ✅ Warehouse D card displays
- [ ] ✅ Total Items: 0
- [ ] ✅ Low Stock: 0
- [ ] ✅ Total Value: Rp 0
- [ ] ✅ No errors in console
- [ ] ✅ No "undefined" or "NaN" values

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 5.9: Product Not Found Handling
**Priority:** LOW

**Setup (Requires DB manipulation):**
- Inventory record references productId that doesn't exist in products table

**Steps:**
1. [ ] View Inventory Report
2. [ ] Check warehouse cards
3. [ ] Check browser console

**Expected Results:**
- [ ] ✅ Warehouse cards still display
- [ ] ✅ Total value handles missing product gracefully (price=0 or skip)
- [ ] ❌ NO application crash
- [ ] ⚠️ May log warning in console (acceptable)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 6. Informational Notice Card

### Test 6.1: Notice Displays on Products Page
**Priority:** MEDIUM

**Steps:**
1. [ ] Navigate to `/dashboard/products`
2. [ ] Observe page header area (before statistics cards)

**Verify:**
- [ ] Blue/info-colored notice card visible
- [ ] Info icon (ℹ️) displayed
- [ ] Card positioned above product statistics/reports
- [ ] Card spans full width or appropriate width

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 6.2: Notice Content Clarity
**Priority:** MEDIUM

**Steps:**
1. [ ] Read notice card content

**Verify Text Includes:**
- [ ] Title: "About This Report" (or similar)
- [ ] Mentions "aggregate data" or "summary data"
- [ ] Explains this page shows overall product statistics
- [ ] Mentions "warehouse-specific" or "per-warehouse breakdown"
- [ ] Refers to Inventory Report for detailed view
- [ ] Text clear and understandable

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 6.3: Link to Inventory Report Works
**Priority:** HIGH

**Steps:**
1. [ ] Locate "Inventory Report" link within notice card
2. [ ] Verify link styled (underlined, colored, or button)
3. [ ] Click link

**Expected Results:**
- [ ] ✅ Navigate to `/dashboard/inventory`
- [ ] ✅ Inventory Report page loads
- [ ] ✅ URL changes to inventory route
- [ ] ✅ No errors

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 7. Browser Compatibility Testing

### Test 7.1: Google Chrome
**Version:** _______________

- [ ] All features tested above work correctly
- [ ] Forms render properly
- [ ] Dropdowns functional
- [ ] Modals/drawers open and close
- [ ] API calls succeed
- [ ] No console errors
- [ ] Layout correct (no CSS issues)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 7.2: Mozilla Firefox
**Version:** _______________

- [ ] All features work
- [ ] Forms render
- [ ] Dropdowns work
- [ ] Modals work
- [ ] API calls succeed
- [ ] No console errors
- [ ] Layout correct

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 7.3: Safari
**Version:** _______________

- [ ] All features work
- [ ] Forms render
- [ ] Dropdowns work
- [ ] Modals work
- [ ] API calls succeed
- [ ] No console errors
- [ ] Layout correct

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 7.4: Microsoft Edge
**Version:** _______________

- [ ] All features work
- [ ] Forms render
- [ ] Dropdowns work
- [ ] Modals work
- [ ] API calls succeed
- [ ] No console errors
- [ ] Layout correct

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 8. Performance Testing

### Test 8.1: Large Dataset - Product Form with Many Warehouses
**Setup:** 10+ warehouses in system

**Steps:**
1. [ ] Open product form
2. [ ] Add 10 warehouse allocations
3. [ ] Observe UI responsiveness

**Verify:**
- [ ] ✅ No lag when adding allocations
- [ ] ✅ Form remains responsive
- [ ] ✅ Total calculation updates instantly
- [ ] ✅ Form submission completes in < 2 seconds

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 8.2: Large Dataset - Inventory Report with Many Products
**Setup:** 50+ products in inventory

**Steps:**
1. [ ] Navigate to Inventory Report
2. [ ] Note page load time: _______ seconds

**Verify:**
- [ ] ✅ Page loads in < 3 seconds
- [ ] ✅ No freezing or lag
- [ ] ✅ All warehouse cards render
- [ ] ✅ Scrolling smooth

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 8.3: Large Dataset - Product List
**Setup:** 100+ products

**Steps:**
1. [ ] Navigate to Products page
2. [ ] Note page load time: _______ seconds
3. [ ] Test scrolling and filtering

**Verify:**
- [ ] ✅ Page loads in < 3 seconds
- [ ] ✅ Table renders all products
- [ ] ✅ Scrolling responsive
- [ ] ✅ Filtering/search works

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 9. Error Handling Testing

### Test 9.1: Network Error - API Timeout
**Setup:** Disconnect internet or block API requests

**Steps:**
1. [ ] Disconnect network
2. [ ] Navigate to Inventory Report
3. [ ] Observe behavior

**Expected Results:**
- [ ] ✅ Error message displayed to user
- [ ] ✅ Message: "Failed to load data" or similar
- [ ] ✅ No infinite loading spinner
- [ ] ✅ Retry button available (optional)
- [ ] ❌ NO application crash

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 9.2: Validation Error - Missing Required Fields
**Steps:**
1. [ ] Open product form
2. [ ] Leave required fields empty (name, SKU, etc.)
3. [ ] Try to submit

**Expected Results:**
- [ ] ❌ Form submission blocked
- [ ] ❌ HTML5 validation errors shown
- [ ] ❌ Required fields highlighted
- [ ] ✅ User informed which fields are missing

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 9.3: Invalid Data - Negative Quantity
**Steps:**
1. [ ] Open product form
2. [ ] Try to enter negative stock: -10
3. [ ] Try to enter negative allocation quantity: -5

**Expected Results:**
- [ ] ❌ Input rejected OR
- [ ] ❌ Validation error displayed OR
- [ ] ⚠️ HTML5 input type="number" min="0" prevents negative values

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 10. Accessibility Testing

### Test 10.1: Keyboard Navigation
**Steps:**
1. [ ] Open product form
2. [ ] Use only keyboard (Tab, Enter, Arrow keys)
3. [ ] Try to complete form without mouse

**Verify:**
- [ ] ✅ Can Tab through all form fields
- [ ] ✅ Can select from dropdowns with keyboard
- [ ] ✅ Can submit form with Enter key
- [ ] ✅ Focus indicators visible
- [ ] ✅ Modals can be closed with Escape key

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 10.2: Screen Reader (Optional)
**Tool:** NVDA / JAWS / VoiceOver

**Steps:**
1. [ ] Enable screen reader
2. [ ] Navigate through product form
3. [ ] Listen to field labels and descriptions

**Verify:**
- [ ] ✅ Labels associated with inputs
- [ ] ✅ Required fields announced
- [ ] ✅ Error messages announced
- [ ] ✅ Button purposes clear

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 10.3: Color Contrast
**Tool:** Browser DevTools > Accessibility > Contrast

**Steps:**
1. [ ] Inspect validation colors (red, yellow, green)
2. [ ] Check contrast ratios

**Verify:**
- [ ] ✅ Red error text: contrast ratio ≥ 4.5:1
- [ ] ✅ Green success: contrast ratio ≥ 4.5:1
- [ ] ✅ All text readable on background
- [ ] ✅ Meets WCAG AA standards

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 11. Security Testing

### Test 11.1: Input Sanitization - XSS Prevention
**Steps:**
1. [ ] Open product form
2. [ ] Enter in product name: `<script>alert('XSS')</script>`
3. [ ] Submit form
4. [ ] View product in table

**Expected Results:**
- [ ] ✅ Script NOT executed
- [ ] ✅ Input sanitized or escaped
- [ ] ✅ Displays as plain text: `<script>alert('XSS')</script>`

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 11.2: SQL Injection Prevention
**Steps:**
1. [ ] Use search/filter on products page
2. [ ] Enter: `'; DROP TABLE products; --`
3. [ ] Submit search

**Expected Results:**
- [ ] ✅ No database error
- [ ] ✅ Search treated as literal string
- [ ] ✅ Database tables intact
- [ ] ✅ Parameterized queries used (backend protection)

**Pass/Fail:** _________ | **Notes:** _________________________________

---

### Test 11.3: Authentication - Unauthorized Access
**Steps:**
1. [ ] Log out of application
2. [ ] Try to navigate directly to `/dashboard/products/all`

**Expected Results:**
- [ ] ❌ Access denied
- [ ] ✅ Redirected to login page
- [ ] ✅ 401 Unauthorized or 403 Forbidden

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## 12. Regression Testing

**Verify existing features still work:**

- [ ] **Basic Product CRUD (without warehouses)**
  - [ ] Can create product without warehouse allocations
  - [ ] Can edit product
  - [ ] Can delete product (if feature exists)

- [ ] **Product Categories**
  - [ ] Categories load in dropdown
  - [ ] Can assign category to product

- [ ] **Product Search/Filters**
  - [ ] Search by name works
  - [ ] Search by SKU works
  - [ ] Filter by category works

- [ ] **Bundle Creation (basic)**
  - [ ] Can select products for bundle
  - [ ] Bundle price calculated
  - [ ] Bundle created successfully

- [ ] **Variant Creation (basic)**
  - [ ] Can create variant
  - [ ] Variant attributes work

- [ ] **User Authentication**
  - [ ] Can log in
  - [ ] Can log out
  - [ ] Session persists

- [ ] **Navigation**
  - [ ] All menu items work
  - [ ] Breadcrumbs correct (if applicable)
  - [ ] Back button works

**Pass/Fail:** _________ | **Notes:** _________________________________

---

## Testing Summary

**Date Completed:** _______________
**Tester Name:** _______________
**Environment:** Development / Staging / Production

### Overall Results

**Total Tests:** _______
**Passed:** _______
**Failed:** _______
**Skipped:** _______

**Pass Rate:** _______%

### Critical Issues Found

1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

### Recommendation

- [ ] ✅ **APPROVED FOR RELEASE** - All tests passed, no critical issues
- [ ] ⚠️ **APPROVED WITH CONDITIONS** - Minor issues found, can be fixed post-release
- [ ] ❌ **NOT APPROVED** - Critical issues found, requires fixes before release

**Tester Signature:** _______________

---

## Appendix: Test Data SQL Script

```sql
-- Insert test warehouses
INSERT INTO warehouses (id, name, address, city, state, postal_code, country, status) VALUES
  ('w1-uuid', 'Main Warehouse', '123 Main St', 'New York', 'NY', '10001', 'USA', 'active'),
  ('w2-uuid', 'West Coast Warehouse', '456 Oak Ave', 'Los Angeles', 'CA', '90001', 'USA', 'active'),
  ('w3-uuid', 'Central Warehouse', '789 Elm Rd', 'Chicago', 'IL', '60601', 'USA', 'active');

-- Insert test products with expiration dates
INSERT INTO products (id, name, sku, category, price, stock, expiration_date, created_at) VALUES
  ('p1-uuid', 'Expired Product', 'EXP-001', 'Electronics', 50000, 10, CURRENT_DATE - INTERVAL '5 days', NOW()),
  ('p2-uuid', 'Expiring Soon (10 days)', 'EXP-002', 'Electronics', 75000, 20, CURRENT_DATE + INTERVAL '10 days', NOW()),
  ('p3-uuid', 'Expiring Soon (30 days)', 'EXP-003', 'Electronics', 100000, 30, CURRENT_DATE + INTERVAL '30 days', NOW()),
  ('p4-uuid', 'Expiring Outside Window', 'EXP-004', 'Electronics', 125000, 40, CURRENT_DATE + INTERVAL '35 days', NOW()),
  ('p5-uuid', 'No Expiration', 'NORM-001', 'Electronics', 150000, 100, NULL, NOW());

-- Insert test inventory with low stock
INSERT INTO inventory (id, product_id, warehouse_id, quantity_available, minimum_stock, created_at) VALUES
  ('i1-uuid', 'p1-uuid', 'w1-uuid', 5, 10, NOW()),   -- LOW STOCK
  ('i2-uuid', 'p2-uuid', 'w1-uuid', 20, 10, NOW()),  -- OK
  ('i3-uuid', 'p3-uuid', 'w2-uuid', 8, 20, NOW()),   -- LOW STOCK
  ('i4-uuid', 'p4-uuid', 'w2-uuid', 100, 50, NOW()), -- OK
  ('i5-uuid', 'p5-uuid', 'w3-uuid', 50, 20, NOW());  -- OK
```

---

**END OF MANUAL TESTING CHECKLIST**
