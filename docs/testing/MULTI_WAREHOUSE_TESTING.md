# Multi-Warehouse Testing Plan
## Frontend Implementation & Backend Integration

**Branch:** `claude/continue-previous-session-01LUzTBn6NBu18Em7jtaPcYC`
**Related Document:** `MULTI_WAREHOUSE_REFACTOR_PLAN.md`
**Date:** 2025-11-25

---

## Overview

This document provides comprehensive testing guidance for the multi-warehouse refactoring implementation, covering:
- **Phase 1:** Product multi-warehouse allocation
- **Phase 2:** Bundle warehouse selection
- **Phase 3:** Variant warehouse allocation
- **Bug fixes:** Expiration date report
- **Feature updates:** Inventory report real API integration

---

## 1. Frontend Component Testing

### 1.1 ProductWarehouseAllocation Component
**File:** `apps/admin-dashboard/src/components/products/ProductWarehouseAllocation.tsx:1`

#### Test Cases:

**TC-PWA-001: Render Empty State**
```typescript
// Arrange: No allocations
const warehouses = [{ id: '1', name: 'Warehouse A' }];
const allocations = [];

// Expected: Shows empty state message
// ✅ "No warehouse allocations yet" displayed
// ✅ "Add Warehouse" button visible
```

**TC-PWA-002: Add Warehouse Allocation**
```typescript
// Steps:
1. Click "Add Warehouse" button
2. Select warehouse from dropdown
3. Enter quantity: 100
4. Enter location details: rack="A1", bin="B1"
5. Click "Add"

// Expected:
// ✅ New allocation appears in list
// ✅ Form resets to empty state
// ✅ Selected warehouse removed from dropdown
```

**TC-PWA-003: Prevent Duplicate Warehouse**
```typescript
// Arrange: Already allocated to "Warehouse A"
// Action: Try to select "Warehouse A" again
// Expected: "Warehouse A" not in dropdown
```

**TC-PWA-004: Edit Existing Allocation**
```typescript
// Steps:
1. Click edit icon on allocation
2. Change quantity from 100 to 150
3. Update rack from "A1" to "A2"
4. Click "Save"

// Expected:
// ✅ Allocation updated with new values
// ✅ Total stock calculation updates
```

**TC-PWA-005: Delete Allocation**
```typescript
// Action: Click delete icon
// Expected:
// ✅ Allocation removed from list
// ✅ Warehouse appears in "Add" dropdown again
// ✅ Total stock calculation updates
```

**TC-PWA-006: Stock Validation - Match**
```typescript
// Input: totalStock=100, allocations=[W1:50, W2:50]
// Expected: ✅ Green checkmark icon displayed
```

**TC-PWA-007: Stock Validation - Over Allocation**
```typescript
// Input: totalStock=100, allocations=[W1:60, W2:60]
// Expected:
// ❌ Red alert: "Total allocated (120) exceeds total stock (100)"
```

**TC-PWA-008: Stock Validation - Under Allocation**
```typescript
// Input: totalStock=100, allocations=[W1:30, W2:40]
// Expected:
// ⚠️ Yellow alert: "Total allocated (70) is less than total stock (100)"
```

**TC-PWA-009: Real-time Calculation**
```typescript
// Action: Add/edit/delete allocations
// Expected: Total updates instantly, validation status changes
```

**TC-PWA-010: Read-Only Mode**
```typescript
// Input: readOnly={true}
// Expected:
// ✅ No "Add" button
// ✅ No edit/delete icons
// ✅ Display-only mode
```

---

### 1.2 Product Form Integration Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/products/all.tsx:1`

#### Test Cases:

**TC-PF-001: Create Product - Single Warehouse**
```typescript
// Steps:
1. Navigate to /dashboard/products/all
2. Click "Add Product"
3. Fill form:
   - name: "Test Product"
   - sku: "TP-001"
   - category: Electronics
   - price: 100000
   - stock: 100
4. Add warehouse allocation:
   - Warehouse: "Main Warehouse"
   - Quantity: 100
   - Rack: "A1"
   - Bin: "B1"
5. Submit form

// Backend API Calls Expected:
// 1. POST /api/products (create product)
// 2. POST /api/product-locations (create location)

// Expected Results:
// ✅ Product created in database
// ✅ Product location record created
// ✅ Success toast: "Product added successfully"
// ✅ Product appears in table
```

**TC-PF-002: Create Product - Multiple Warehouses**
```typescript
// Steps: Same as TC-PF-001 but add 3 allocations:
// - Warehouse A: 50
// - Warehouse B: 30
// - Warehouse C: 20
// Total stock: 100

// Backend API Calls Expected:
// 1. POST /api/products
// 2. POST /api/product-locations (×3, one per warehouse)

// Expected:
// ✅ 3 product_location records created
// ✅ Stock totals correct
```

**TC-PF-003: Edit Product - Load Existing Allocations**
```typescript
// Prerequisite: Product exists with allocations [W1:50, W2:50]
// Steps:
1. Click edit icon on product
2. Modal/drawer opens

// Expected:
// ✅ Form populated with product data
// ✅ ProductWarehouseAllocation shows 2 existing allocations
// ✅ Warehouse names displayed correctly
// ✅ Quantities and location details match database
```

**TC-PF-004: Edit Product - Add New Warehouse**
```typescript
// Prerequisite: Product has [W1:100]
// Steps:
1. Edit product
2. Add allocation: W2:50
3. Update total stock to 150
4. Submit

// Backend API Calls Expected:
// 1. PUT /api/products/:id (update product stock)
// 2. PUT /api/product-locations/:id (update W1 if changed)
// 3. POST /api/product-locations (create W2 location)

// Expected:
// ✅ W1 location unchanged
// ✅ W2 location created
// ✅ Total stock = 150
```

**TC-PF-005: Edit Product - Remove Warehouse**
```typescript
// Prerequisite: Product has [W1:100, W2:100]
// Steps:
1. Edit product
2. Delete W2 allocation
3. Update stock to 100
4. Submit

// Backend API Calls Expected:
// 1. PUT /api/products/:id
// 2. PUT /api/product-locations/:id (update W1 if changed)
// 3. DELETE /api/product-locations/:id (delete W2 location)

// Expected:
// ✅ W2 location deleted from database
// ✅ W1 location remains
```

**TC-PF-006: Edit Product - Update Quantities**
```typescript
// Prerequisite: Product has [W1:50, W2:50]
// Steps:
1. Edit product
2. Change W1 quantity to 70
3. Change W2 quantity to 80
4. Update total stock to 150
5. Submit

// Backend API Calls Expected:
// 1. PUT /api/products/:id
// 2. PUT /api/product-locations/:w1LocationId (update W1)
// 3. PUT /api/product-locations/:w2LocationId (update W2)

// Expected:
// ✅ Both locations updated with new quantities
```

**TC-PF-007: Form Validation - Missing Warehouse**
```typescript
// Steps:
1. Create product with stock=100
2. Don't add any warehouse allocations
3. Submit

// Expected:
// ⚠️ Soft warning (allows submission)
// ✅ Product created without locations
```

**TC-PF-008: Stock Mismatch Warning**
```typescript
// Steps:
1. Set stock=100
2. Add allocations totaling 150
3. Observe UI

// Expected:
// ⚠️ Warning displayed but doesn't block submission
```

---

### 1.3 Bundle Form Integration Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/products/bundle.tsx:1`

#### Test Cases:

**TC-BF-001: Warehouse Selector Displays**
```typescript
// Steps:
1. Navigate to /dashboard/products/bundle
2. Click "Add Bundle"

// Expected:
// ✅ "Assembly Warehouse" field visible
// ✅ Dropdown populated with all warehouses
// ✅ Field marked as required (*)
```

**TC-BF-002: Create Bundle with Warehouse**
```typescript
// Steps:
1. Fill bundle form:
   - bundleName: "Starter Kit"
   - bundleSKU: "SK-001"
   - bundleDescription: "Basic starter bundle"
   - bundlePrice: 500000
   - availableStock: 50
2. Select products for bundle
3. Select "Assembly Warehouse": "Main Warehouse"
4. Submit

// Backend API Call Expected:
// POST /api/bundles
// Body includes: { ..., warehouseId: "main-warehouse-id" }

// Expected:
// ✅ Bundle created with warehouseId field
// ✅ Success toast displayed
// ✅ Bundle appears in list
```

**TC-BF-003: Required Validation**
```typescript
// Steps:
1. Fill bundle form
2. Leave warehouse unselected
3. Try to submit

// Expected:
// ❌ HTML5 validation error
// 🛑 Form submission blocked
```

**TC-BF-004: Edit Bundle - Warehouse Pre-selected**
```typescript
// Prerequisite: Bundle exists with warehouseId="warehouse-a-id"
// Steps:
1. Click edit on bundle
2. Observe warehouse dropdown

// Expected:
// ✅ "Warehouse A" pre-selected in dropdown
```

**TC-BF-005: Change Bundle Warehouse**
```typescript
// Prerequisite: Bundle assembly warehouse = "Warehouse A"
// Steps:
1. Edit bundle
2. Change warehouse to "Warehouse B"
3. Submit

// Expected:
// ✅ Bundle updated with new warehouseId
```

---

### 1.4 Variant Form Integration Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/products/variant.tsx:1`

#### Test Cases:

**TC-VF-001: Component Renders**
```typescript
// Steps:
1. Navigate to /dashboard/products/variant
2. Click "Add Variant"
3. Scroll down form

// Expected:
// ✅ ProductWarehouseAllocation component visible
// ✅ Separated by divider line
// ✅ Shows "Warehouse Allocation" section
```

**TC-VF-002: Add Variant with Allocations**
```typescript
// Steps:
1. Fill variant form:
   - variantName: "Red XL"
   - variantSKU: "RED-XL-001"
   - price: 150000
   - stock: 100
2. Add warehouse allocations:
   - W1: 60
   - W2: 40
3. Submit

// Backend Expected (when API ready):
// 1. POST /api/variants
// 2. POST /api/variant-locations (×2)

// Current Status:
// ✅ Variant created
// ⚠️ Allocations NOT saved (backend pending)
```

**TC-VF-003: Stock Validation**
```typescript
// Steps:
1. Set variant stock = 50
2. Add allocations: W1:30, W2:30 (total 60)

// Expected:
// ❌ Red alert: "Total allocated (60) exceeds total stock (50)"
```

**TC-VF-004: Reset on Add**
```typescript
// Steps:
1. Open "Add Variant" form
2. Add warehouse allocations
3. Cancel
4. Open "Add Variant" again

// Expected:
// ✅ Allocations cleared
// ✅ Form is empty
```

**TC-VF-005: Edit Variant**
```typescript
// Steps:
1. Click edit on existing variant

// Current Expected:
// ✅ Form populated with variant data
// ⚠️ Allocations empty (placeholder for backend)

// Future Expected (when backend ready):
// ✅ Allocations loaded from database
```

---

### 1.5 Expiration Date Report Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/products/index.tsx:111-147`

#### Test Cases:

**TC-EXP-001: Expired Products Calculation**
```typescript
// Test Data:
const products = [
  { name: "P1", expirationDate: "2025-11-20" }, // 5 days ago
  { name: "P2", expirationDate: "2025-11-24" }, // yesterday
  { name: "P3", expirationDate: "2025-11-25" }, // today
  { name: "P4", expirationDate: null },         // no expiration
];

// Expected:
// Expired Count: 2 (P1, P2)
// P3 (today) NOT counted as expired
// P4 (null) ignored
```

**TC-EXP-002: Expiring Soon (30-day window)**
```typescript
// Today: 2025-11-25
// Test Data:
const products = [
  { name: "P1", expirationDate: "2025-11-26" }, // tomorrow
  { name: "P2", expirationDate: "2025-12-10" }, // 15 days
  { name: "P3", expirationDate: "2025-12-24" }, // 29 days
  { name: "P4", expirationDate: "2025-12-25" }, // 30 days (EDGE)
  { name: "P5", expirationDate: "2025-12-26" }, // 31 days (OUT)
];

// Expected:
// Expiring Soon: 4 (P1, P2, P3, P4)
// P5 NOT included (31 days > 30)
```

**TC-EXP-003: Date Normalization**
```typescript
// Test: Product expires today at 11:59 PM
const product = {
  expirationDate: "2025-11-25T23:59:59.999Z"
};

// Expected:
// NOT counted as expired
// Counted in "expiring soon" (today)
```

**TC-EXP-004: Table Display**
```typescript
// Prerequisite: 3 products expiring soon
// Steps: View Products page

// Expected:
// ✅ "Products Expiring Soon" table visible
// ✅ Shows 3 rows
// ✅ Columns: Name, SKU, Expiration Date, Days Remaining
// ✅ Sorted by expiration date (soonest first)
```

---

### 1.6 Inventory Report Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/inventory/index.tsx:1`

#### Test Cases:

**TC-INV-001: Real API Integration**
```typescript
// Verify no mock data used
// Code Review Checklist:
// ✅ useQuery for inventoryApi.getAll()
// ✅ useQuery for warehouseApi.getAll()
// ✅ useQuery for productApi.getAll()
// ❌ NO hardcoded mock arrays
// ❌ NO mockData.ts imports
```

**TC-INV-002: Loading States**
```typescript
// Steps:
1. Navigate to /dashboard/inventory
2. Observe initial state

// Expected:
// ✅ Loading spinner or skeleton displayed
// ✅ "Loading..." text shown
// ✅ No errors in console
```

**TC-INV-003: Warehouse Cards Display**
```typescript
// Prerequisite: 3 warehouses exist
// Expected:
// ✅ 3 warehouse cards displayed
// ✅ Each card shows:
//    - Warehouse name
//    - Total items count
//    - Low stock count
//    - Total value (formatted currency)
```

**TC-INV-004: Total Items Calculation**
```typescript
// Test Data for Warehouse A:
const inventory = [
  { productId: "p1", warehouseId: "w-a", quantityAvailable: 50 },
  { productId: "p2", warehouseId: "w-a", quantityAvailable: 30 },
  { productId: "p3", warehouseId: "w-a", quantityAvailable: 20 },
];

// Expected:
// Warehouse A Total Items: 100
```

**TC-INV-005: Low Stock Count**
```typescript
// Test Data for Warehouse B:
const inventory = [
  { productId: "p1", warehouseId: "w-b", quantityAvailable: 5, minimumStock: 10 }, // LOW
  { productId: "p2", warehouseId: "w-b", quantityAvailable: 15, minimumStock: 10 }, // OK
  { productId: "p3", warehouseId: "w-b", quantityAvailable: 8, minimumStock: 20 }, // LOW
];

// Expected:
// Warehouse B Low Stock Count: 2
```

**TC-INV-006: Total Value Calculation**
```typescript
// Test Data for Warehouse C:
const inventory = [
  { productId: "p1", warehouseId: "w-c", quantityAvailable: 10 },
  { productId: "p2", warehouseId: "w-c", quantityAvailable: 5 },
];
const products = [
  { id: "p1", price: 10000 },
  { id: "p2", price: 20000 },
];

// Expected:
// Warehouse C Total Value: Rp 200,000
// Calculation: (10 × 10000) + (5 × 20000) = 200000
```

**TC-INV-007: Expiring Products Section**
```typescript
// Test Data:
const inventory = [
  { productId: "p1", warehouseId: "w-a", quantityAvailable: 50 },
];
const products = [
  { id: "p1", name: "Product 1", expirationDate: "2025-12-10" }, // 15 days
];

// Expected:
// ✅ "Products Expiring Soon" section visible
// ✅ Shows: Product 1, Warehouse A, 15 days remaining
```

**TC-INV-008: Empty Warehouse**
```typescript
// Test Data: Warehouse D has no inventory records
// Expected:
// ✅ Warehouse D card displays
// ✅ Total Items: 0
// ✅ Low Stock: 0
// ✅ Total Value: Rp 0
// ✅ No errors
```

---

### 1.7 Informational Notice Card Tests
**File:** `apps/admin-dashboard/src/routes/dashboard/products/index.tsx:187-232`

#### Test Cases:

**TC-NOTICE-001: Display on Products Page**
```typescript
// Steps:
1. Navigate to /dashboard/products

// Expected:
// ✅ Blue informational card visible
// ✅ Positioned above product statistics cards
// ✅ Info icon displayed
```

**TC-NOTICE-002: Content Accuracy**
```typescript
// Verify text content:
// ✅ Title: "About This Report"
// ✅ Mentions "aggregate data"
// ✅ Explains difference from Inventory Report
// ✅ Mentions "warehouse-specific breakdown"
```

**TC-NOTICE-003: Link to Inventory Report**
```typescript
// Steps:
1. Click "Inventory Report" link in notice card

// Expected:
// ✅ Navigates to /dashboard/inventory
// ✅ Link color: blue/primary
// ✅ Link underlined or styled
```

---

## 2. Backend Integration Requirements

### 2.1 Product Location API

**Required Endpoints:**

#### POST /api/product-locations
Create new product warehouse location.

**Request:**
```json
{
  "productId": "uuid-string",
  "warehouseId": "uuid-string",
  "quantity": 100,
  "rack": "A1",
  "bin": "B2",
  "zone": "Z1",
  "aisle": "A"
}
```

**Response (201 Created):**
```json
{
  "id": "location-uuid",
  "productId": "uuid-string",
  "warehouseId": "uuid-string",
  "quantity": 100,
  "rack": "A1",
  "bin": "B2",
  "zone": "Z1",
  "aisle": "A",
  "createdAt": "2025-11-25T10:00:00Z",
  "updatedAt": "2025-11-25T10:00:00Z"
}
```

**Validations:**
- ✅ productId must exist in products table
- ✅ warehouseId must exist in warehouses table
- ✅ quantity must be non-negative integer
- ✅ Unique constraint: (productId, warehouseId) pair
- ✅ rack, bin, zone, aisle are optional strings

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Product or warehouse doesn't exist
- `409 Conflict` - Location already exists for this product + warehouse
- `422 Unprocessable Entity` - Validation errors

---

#### GET /api/product-locations?productId={id}
Retrieve all warehouse locations for a product.

**Response (200 OK):**
```json
{
  "productLocations": [
    {
      "id": "loc-1",
      "productId": "product-uuid",
      "warehouseId": "warehouse-a-uuid",
      "quantity": 50,
      "rack": "A1",
      "bin": "B1",
      "zone": "Z1",
      "aisle": "A",
      "warehouse": {
        "id": "warehouse-a-uuid",
        "name": "Warehouse A",
        "city": "New York"
      }
    },
    {
      "id": "loc-2",
      "productId": "product-uuid",
      "warehouseId": "warehouse-b-uuid",
      "quantity": 50,
      "rack": "A2",
      "bin": "B2",
      "zone": null,
      "aisle": null,
      "warehouse": {
        "id": "warehouse-b-uuid",
        "name": "Warehouse B",
        "city": "Los Angeles"
      }
    }
  ]
}
```

**Notes:**
- Include warehouse details (JOIN)
- Empty array if no locations exist
- Filter by productId query parameter

---

#### PUT /api/product-locations/{id}
Update existing product location.

**Request:**
```json
{
  "quantity": 150,
  "rack": "A2",
  "bin": "B3",
  "zone": "Z2",
  "aisle": "B"
}
```

**Response (200 OK):**
```json
{
  "id": "location-uuid",
  "productId": "product-uuid",
  "warehouseId": "warehouse-uuid",
  "quantity": 150,
  "rack": "A2",
  "bin": "B3",
  "zone": "Z2",
  "aisle": "B",
  "updatedAt": "2025-11-25T11:00:00Z"
}
```

**Validations:**
- ✅ Location must exist
- ✅ Cannot change productId or warehouseId (create new instead)
- ✅ Quantity must be non-negative

**Error Responses:**
- `404 Not Found` - Location doesn't exist
- `400 Bad Request` - Invalid data
- `422 Unprocessable Entity` - Validation errors

---

#### DELETE /api/product-locations/{id}
Delete product location.

**Response (204 No Content):**
No body.

**Error Responses:**
- `404 Not Found` - Location doesn't exist
- `409 Conflict` - Cannot delete if related orders exist (optional constraint)

---

### 2.2 Bundle Warehouse Field

**Required Database Changes:**

#### Migration: Add warehouseId to product_bundles
```sql
ALTER TABLE product_bundles
ADD COLUMN warehouse_id UUID;

ALTER TABLE product_bundles
ADD CONSTRAINT fk_bundle_warehouse
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);

CREATE INDEX idx_bundles_warehouse
ON product_bundles(warehouse_id);
```

**API Changes:**

#### POST /api/bundles
Add `warehouseId` to request body.

**Request:**
```json
{
  "bundleName": "Starter Kit",
  "bundleSKU": "SK-001",
  "bundleDescription": "Complete starter bundle",
  "bundlePrice": 500000,
  "discountPercentage": 10,
  "availableStock": 50,
  "status": "active",
  "warehouseId": "warehouse-uuid", // NEW FIELD
  "items": [
    { "productId": "p1", "quantity": 2 },
    { "productId": "p2", "quantity": 1 }
  ]
}
```

**Business Rule Validation:**
```typescript
// Validate: All bundle component products must exist in the assembly warehouse
const validateBundleComponents = async (warehouseId, items) => {
  for (const item of items) {
    const location = await getProductLocation(item.productId, warehouseId);
    if (!location || location.quantity < item.quantity) {
      throw new Error(
        `Product ${item.productId} not available in warehouse ${warehouseId}`
      );
    }
  }
};
```

**Error Response:**
```json
{
  "error": "Bundle component validation failed",
  "details": [
    "Product 'p1' not found in Warehouse A",
    "Product 'p2' has insufficient stock in Warehouse A (need: 5, available: 2)"
  ]
}
```

---

#### GET /api/bundles/{id}
Include warehouseId in response.

**Response:**
```json
{
  "id": "bundle-uuid",
  "bundleName": "Starter Kit",
  "warehouseId": "warehouse-uuid",
  "warehouse": {
    "id": "warehouse-uuid",
    "name": "Main Warehouse",
    "city": "New York"
  },
  "items": [...]
}
```

---

#### PUT /api/bundles/{id}
Allow updating warehouseId.

**Request:**
```json
{
  "warehouseId": "new-warehouse-uuid"
}
```

**Validation:**
- Re-validate all components exist in new warehouse
- Return 400 if components not available

---

### 2.3 Variant Warehouse Locations

**Required Database Changes:**

#### Create variant_locations table
```sql
CREATE TABLE variant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  rack VARCHAR(50),
  bin VARCHAR(50),
  zone VARCHAR(50),
  aisle VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(variant_id, warehouse_id)
);

CREATE INDEX idx_variant_locations_variant ON variant_locations(variant_id);
CREATE INDEX idx_variant_locations_warehouse ON variant_locations(warehouse_id);
```

**API Endpoints:**

#### POST /api/variant-locations
Create variant warehouse location.

**Request:**
```json
{
  "variantId": "variant-uuid",
  "warehouseId": "warehouse-uuid",
  "quantity": 50,
  "rack": "A1",
  "bin": "B1",
  "zone": "Z1",
  "aisle": "A"
}
```

**Response (201 Created):**
```json
{
  "id": "location-uuid",
  "variantId": "variant-uuid",
  "warehouseId": "warehouse-uuid",
  "quantity": 50,
  "rack": "A1",
  "bin": "B1",
  "zone": "Z1",
  "aisle": "A",
  "createdAt": "2025-11-25T10:00:00Z"
}
```

---

#### GET /api/variant-locations?variantId={id}
Get all locations for a variant.

**Response (200 OK):**
```json
{
  "variantLocations": [
    {
      "id": "loc-1",
      "variantId": "variant-uuid",
      "warehouseId": "warehouse-a-uuid",
      "quantity": 30,
      "rack": "A1",
      "warehouse": {
        "id": "warehouse-a-uuid",
        "name": "Warehouse A"
      }
    },
    {
      "id": "loc-2",
      "variantId": "variant-uuid",
      "warehouseId": "warehouse-b-uuid",
      "quantity": 20,
      "rack": "B1",
      "warehouse": {
        "id": "warehouse-b-uuid",
        "name": "Warehouse B"
      }
    }
  ]
}
```

---

#### PUT /api/variant-locations/{id}
Update variant location.

**Request:**
```json
{
  "quantity": 75,
  "rack": "A2"
}
```

**Response (200 OK):**
```json
{
  "id": "location-uuid",
  "variantId": "variant-uuid",
  "warehouseId": "warehouse-uuid",
  "quantity": 75,
  "rack": "A2",
  "updatedAt": "2025-11-25T12:00:00Z"
}
```

---

#### DELETE /api/variant-locations/{id}
Delete variant location.

**Response (204 No Content)**

---

### 2.4 Frontend Integration Updates

Once backend APIs are ready, update these files:

#### apps/admin-dashboard/src/routes/dashboard/products/variant.tsx

**Load allocations on edit:**
```typescript
const handleEditVariant = async (variant: ProductVariant) => {
  setFormMode('edit');
  setSelectedVariant(variant);
  setFormData({...variant});

  // FETCH variant locations
  const response = await fetch(`/api/variant-locations?variantId=${variant.id}`);
  const data = await response.json();

  const allocations: WarehouseAllocation[] = data.variantLocations.map(loc => ({
    warehouseId: loc.warehouseId,
    warehouseName: loc.warehouse.name,
    quantity: loc.quantity,
    rack: loc.rack,
    bin: loc.bin,
    zone: loc.zone,
    aisle: loc.aisle,
  }));

  setWarehouseAllocations(allocations);
  setFormDrawerOpen(true);
};
```

**Save allocations on create:**
```typescript
const handleCreateVariant = async (formData) => {
  // 1. Create variant
  const variant = await variantApi.create(formData);

  // 2. Create warehouse locations
  for (const allocation of warehouseAllocations) {
    await fetch('/api/variant-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: variant.id,
        warehouseId: allocation.warehouseId,
        quantity: allocation.quantity,
        rack: allocation.rack,
        bin: allocation.bin,
        zone: allocation.zone,
        aisle: allocation.aisle,
      }),
    });
  }
};
```

**Update allocations on edit:**
```typescript
const handleUpdateVariant = async (variantId, formData) => {
  // 1. Update variant
  await variantApi.update(variantId, formData);

  // 2. Sync warehouse locations (same logic as products/all.tsx)
  const existingLocations = await getVariantLocations(variantId);

  // Update or create allocations
  for (const allocation of warehouseAllocations) {
    const existing = existingLocations.find(loc => loc.warehouseId === allocation.warehouseId);
    if (existing) {
      await updateVariantLocation(existing.id, allocation);
    } else {
      await createVariantLocation(variantId, allocation);
    }
  }

  // Delete removed allocations
  for (const existing of existingLocations) {
    const stillExists = warehouseAllocations.find(a => a.warehouseId === existing.warehouseId);
    if (!stillExists) {
      await deleteVariantLocation(existing.id);
    }
  }
};
```

---

### 2.5 Database Schema Summary

**Tables to Create/Modify:**

1. **product_locations** (likely already exists)
   - id, product_id, warehouse_id, quantity, rack, bin, zone, aisle
   - UNIQUE(product_id, warehouse_id)

2. **product_bundles** (modify existing)
   - ADD warehouse_id UUID REFERENCES warehouses(id)

3. **variant_locations** (create new)
   - id, variant_id, warehouse_id, quantity, rack, bin, zone, aisle
   - UNIQUE(variant_id, warehouse_id)

**Indexes:**
```sql
CREATE INDEX idx_product_locations_product ON product_locations(product_id);
CREATE INDEX idx_product_locations_warehouse ON product_locations(warehouse_id);
CREATE INDEX idx_bundles_warehouse ON product_bundles(warehouse_id);
CREATE INDEX idx_variant_locations_variant ON variant_locations(variant_id);
CREATE INDEX idx_variant_locations_warehouse ON variant_locations(warehouse_id);
```

---

## 3. Manual Testing Checklist

### 3.1 Environment Setup
- [ ] Backend server running (check port)
- [ ] Frontend dev server running
- [ ] Database has test data:
  - [ ] At least 3 warehouses
  - [ ] At least 10 products
  - [ ] Some products with expiration dates
  - [ ] Some inventory with low stock
- [ ] User logged in with admin privileges

### 3.2 Products - Multi-Warehouse Allocation

**Create Product - Single Warehouse:**
- [ ] Navigate to /dashboard/products/all
- [ ] Click "Add Product" button
- [ ] Fill required fields (name, SKU, category, price, stock=100)
- [ ] Click "Add Warehouse" in allocation section
- [ ] Select "Warehouse A", quantity=100, rack="A1"
- [ ] Click "Add" allocation button
- [ ] Verify allocation appears in list
- [ ] Submit form
- [ ] **Expected:** Success toast, product in table
- [ ] **Database Check:** 1 product_location record created

**Create Product - Multiple Warehouses:**
- [ ] Open "Add Product" form
- [ ] Set stock = 300
- [ ] Add 3 allocations: W-A:100, W-B:100, W-C:100
- [ ] Verify green checkmark (total matches)
- [ ] Submit form
- [ ] **Expected:** Success toast
- [ ] **Database Check:** 3 product_location records

**Edit Product - Load Allocations:**
- [ ] Click edit icon on product with allocations
- [ ] **Expected:** Modal opens with allocations loaded
- [ ] Verify warehouse names display
- [ ] Verify quantities correct
- [ ] Verify location details (rack, bin) display

**Edit Product - Add Warehouse:**
- [ ] Edit product with [W-A:100]
- [ ] Add allocation: W-B:50
- [ ] Update total stock to 150
- [ ] Submit
- [ ] **Expected:** W-A unchanged, W-B created
- [ ] **Database Check:** 2 product_location records

**Edit Product - Remove Warehouse:**
- [ ] Edit product with [W-A:100, W-B:100]
- [ ] Delete W-B allocation (click trash icon)
- [ ] Update stock to 100
- [ ] Submit
- [ ] **Expected:** W-B location deleted
- [ ] **Database Check:** 1 product_location record remains

**Edit Product - Update Quantities:**
- [ ] Edit product with [W-A:50, W-B:50]
- [ ] Change W-A to 70, W-B to 80
- [ ] Update stock to 150
- [ ] Submit
- [ ] **Database Check:** Both locations updated

**Stock Validation - Match:**
- [ ] Set stock = 100
- [ ] Add allocations: W-A:50, W-B:50
- [ ] **Expected:** Green checkmark icon

**Stock Validation - Over Allocation:**
- [ ] Set stock = 100
- [ ] Add allocations: W-A:60, W-B:60
- [ ] **Expected:** Red alert: "Total allocated (120) exceeds..."

**Stock Validation - Under Allocation:**
- [ ] Set stock = 100
- [ ] Add allocations: W-A:30
- [ ] **Expected:** Yellow alert: "Total allocated (30) is less than..."

### 3.3 Bundles - Warehouse Selection

**Create Bundle:**
- [ ] Navigate to /dashboard/products/bundle
- [ ] Click "Add Bundle"
- [ ] Verify "Assembly Warehouse" dropdown visible
- [ ] Verify field marked required (*)
- [ ] Fill bundle details
- [ ] Select products for bundle
- [ ] Select "Warehouse A" for assembly
- [ ] Submit
- [ ] **Expected:** Bundle created with warehouseId
- [ ] **Database Check:** Bundle record has warehouse_id field

**Required Validation:**
- [ ] Fill bundle form
- [ ] Leave warehouse unselected
- [ ] Try to submit
- [ ] **Expected:** HTML5 validation blocks submission

**Edit Bundle:**
- [ ] Edit existing bundle with warehouse
- [ ] **Expected:** Warehouse dropdown pre-selected correctly

### 3.4 Variants - Warehouse Allocation

**Add Variant:**
- [ ] Navigate to /dashboard/products/variant
- [ ] Click "Add Variant"
- [ ] Scroll to warehouse allocation section
- [ ] **Expected:** ProductWarehouseAllocation component visible
- [ ] Set stock = 100
- [ ] Add allocations: W-A:60, W-B:40
- [ ] **Expected:** Validation shows green checkmark
- [ ] Submit form
- [ ] **Current:** Variant created, allocations NOT saved (backend pending)
- [ ] **Future:** Check variant_locations table

**Stock Validation:**
- [ ] Set variant stock = 50
- [ ] Add allocations totaling 70
- [ ] **Expected:** Red over-allocation alert

**Reset on Cancel:**
- [ ] Add allocations to form
- [ ] Cancel form
- [ ] Open "Add Variant" again
- [ ] **Expected:** Allocations cleared

### 3.5 Expiration Date Report

**Expired Products:**
- [ ] Create test products:
  - Product A: expired 5 days ago
  - Product B: expired yesterday
  - Product C: expires today
  - Product D: no expiration date
- [ ] Navigate to /dashboard/products
- [ ] Check "Expired Products" card
- [ ] **Expected:** Count = 2 (A, B only)
- [ ] Product C NOT counted (expires today)

**Expiring Soon:**
- [ ] Create test products:
  - Product E: expires in 10 days
  - Product F: expires in 30 days
  - Product G: expires in 31 days
- [ ] Check "Expiring Soon" card
- [ ] **Expected:** Count includes E, F but NOT G

**Table Display:**
- [ ] Check "Products Expiring Soon" table
- [ ] **Expected:**
  - Shows products expiring in 0-30 days
  - Sorted by expiration date (soonest first)
  - Displays: Name, SKU, Expiration Date, Days Remaining

### 3.6 Inventory Report

**API Integration:**
- [ ] Navigate to /dashboard/inventory
- [ ] Open browser DevTools > Network tab
- [ ] Refresh page
- [ ] **Expected:** API calls visible:
  - GET /api/inventory
  - GET /api/warehouses
  - GET /api/products
- [ ] **Expected:** NO mock data arrays in code

**Warehouse Cards:**
- [ ] Verify one card per warehouse
- [ ] Check Warehouse A card:
  - [ ] Correct name displayed
  - [ ] Total items count accurate
  - [ ] Low stock count accurate
  - [ ] Total value formatted correctly (Rp X,XXX)

**Low Stock Calculation:**
- [ ] Create inventory item: quantity=5, minimumStock=10
- [ ] **Expected:** Counted in low stock

**Total Value:**
- [ ] Warehouse with:
  - Product A: qty=10, price=Rp 10,000
  - Product B: qty=5, price=Rp 20,000
- [ ] **Expected:** Total value = Rp 200,000

**Expiring Products:**
- [ ] Product with expiration in 15 days
- [ ] **Expected:** Listed in "Products Expiring Soon" section
- [ ] Warehouse name displayed

**Empty Warehouse:**
- [ ] Warehouse with no inventory
- [ ] **Expected:**
  - Card displays
  - Total items: 0
  - Total value: Rp 0
  - No errors

### 3.7 Informational Notice

**Display:**
- [ ] Navigate to /dashboard/products
- [ ] **Expected:** Blue notice card visible above statistics

**Content:**
- [ ] Verify mentions "aggregate data"
- [ ] Verify explains difference from Inventory Report
- [ ] Verify mentions "warehouse-specific breakdown"

**Link:**
- [ ] Click "Inventory Report" link
- [ ] **Expected:** Navigate to /dashboard/inventory

### 3.8 Browser Compatibility

**Test on each browser:**
- [ ] **Chrome:** All features work
- [ ] **Firefox:** All features work
- [ ] **Safari:** All features work
- [ ] **Edge:** All features work

**Check:**
- [ ] Forms render correctly
- [ ] Dropdowns work
- [ ] Modals/drawers open
- [ ] API calls succeed
- [ ] No console errors

### 3.9 Performance

**Large Data:**
- [ ] Product form with 10 warehouse allocations
- [ ] Inventory report with 50+ products
- [ ] Product list with 100+ items

**Benchmarks:**
- [ ] Page load < 3 seconds
- [ ] Form submission < 2 seconds
- [ ] No UI freezing

### 3.10 Error Handling

**Network Error:**
- [ ] Disconnect internet
- [ ] Try to load inventory report
- [ ] **Expected:** Error message to user

**Validation Error:**
- [ ] Submit product form with missing required fields
- [ ] **Expected:** HTML5 validation or error messages

**Invalid Data:**
- [ ] Try entering negative quantity
- [ ] **Expected:** Validation error

---

## 4. Backend Testing Requirements

### 4.1 Unit Tests

**Product Location Service:**
```typescript
describe('ProductLocationService', () => {
  it('should create product location', async () => {
    const location = await service.create({
      productId: 'p1',
      warehouseId: 'w1',
      quantity: 100,
      rack: 'A1',
    });

    expect(location.id).toBeDefined();
    expect(location.quantity).toBe(100);
  });

  it('should prevent duplicate warehouse allocation', async () => {
    await service.create({ productId: 'p1', warehouseId: 'w1', quantity: 50 });

    await expect(
      service.create({ productId: 'p1', warehouseId: 'w1', quantity: 30 })
    ).rejects.toThrow('Location already exists');
  });

  it('should validate warehouse exists', async () => {
    await expect(
      service.create({ productId: 'p1', warehouseId: 'invalid', quantity: 50 })
    ).rejects.toThrow('Warehouse not found');
  });
});
```

**Bundle Warehouse Validation:**
```typescript
describe('BundleService', () => {
  it('should create bundle with warehouse', async () => {
    const bundle = await service.create({
      bundleName: 'Kit',
      warehouseId: 'w1',
      items: [{ productId: 'p1', quantity: 2 }],
    });

    expect(bundle.warehouseId).toBe('w1');
  });

  it('should validate components exist in warehouse', async () => {
    // Product p1 NOT in warehouse w1
    await expect(
      service.create({
        bundleName: 'Kit',
        warehouseId: 'w1',
        items: [{ productId: 'p1', quantity: 2 }],
      })
    ).rejects.toThrow('Product p1 not available in warehouse w1');
  });

  it('should validate sufficient stock for bundle', async () => {
    // Product p1 has only 1 unit in warehouse w1, but bundle needs 2
    await expect(
      service.create({
        bundleName: 'Kit',
        warehouseId: 'w1',
        items: [{ productId: 'p1', quantity: 2 }],
      })
    ).rejects.toThrow('Insufficient stock');
  });
});
```

### 4.2 Integration Tests

**Product Location API:**
```typescript
describe('POST /api/product-locations', () => {
  it('should create location', async () => {
    const response = await request(app)
      .post('/api/product-locations')
      .send({
        productId: testProduct.id,
        warehouseId: testWarehouse.id,
        quantity: 100,
        rack: 'A1',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.quantity).toBe(100);
  });

  it('should return 409 on duplicate', async () => {
    // Create first location
    await createLocation({ productId: 'p1', warehouseId: 'w1' });

    // Try to create duplicate
    await request(app)
      .post('/api/product-locations')
      .send({ productId: 'p1', warehouseId: 'w1', quantity: 50 })
      .expect(409);
  });
});

describe('GET /api/product-locations', () => {
  it('should return locations for product', async () => {
    // Setup: Create 2 locations for product p1
    await createLocation({ productId: 'p1', warehouseId: 'w1', quantity: 50 });
    await createLocation({ productId: 'p1', warehouseId: 'w2', quantity: 30 });

    const response = await request(app)
      .get('/api/product-locations?productId=p1')
      .expect(200);

    expect(response.body.productLocations).toHaveLength(2);
    expect(response.body.productLocations[0].warehouse).toBeDefined();
  });
});
```

---

## 5. Known Limitations & Future Work

### 5.1 Variant Warehouse Locations
**Status:** ⚠️ Frontend ready, backend pending

**Missing:**
- [ ] variant_locations database table
- [ ] POST /api/variant-locations endpoint
- [ ] GET /api/variant-locations?variantId={id} endpoint
- [ ] PUT /api/variant-locations/{id} endpoint
- [ ] DELETE /api/variant-locations/{id} endpoint
- [ ] Form submission integration in variant.tsx

**Impact:**
- Users can see warehouse allocation UI on variant form
- Allocations display validation warnings correctly
- Allocations NOT saved to database on submit
- Edit variant does NOT load existing allocations

**Workaround:**
- None - feature is non-functional until backend implemented

---

### 5.2 Bundle Component Warehouse Validation
**Status:** ⚠️ Frontend implemented, backend validation pending

**Missing:**
- [ ] Bundle warehouseId field in database schema
- [ ] Business rule validation: components must exist in assembly warehouse
- [ ] Validation: components have sufficient stock in warehouse

**Impact:**
- User can select any warehouse for bundle assembly
- No validation that bundle components actually exist in selected warehouse
- Could create bundles that can't be fulfilled

**Workaround:**
- Manual verification before bundle creation
- Warehouse staff should check stock availability

---

### 5.3 Stock Transfer Between Warehouses
**Status:** ❌ Not implemented

**Missing:**
- [ ] UI for transferring stock from Warehouse A to Warehouse B
- [ ] POST /api/stock-transfers endpoint
- [ ] Transfer history/audit trail
- [ ] Validation: sufficient stock in source warehouse

**Impact:**
- To move stock, user must manually edit product allocations
- No audit trail of stock movements
- Difficult to track inventory transfers

**Future Enhancement:**
Create dedicated Stock Transfer page with:
- Source warehouse selector
- Destination warehouse selector
- Product selector
- Quantity input
- Transfer reason/notes
- Approval workflow (optional)

---

### 5.4 Warehouse-Specific Stock Queries
**Status:** ⚠️ Partial implementation

**Available:**
- ✅ Inventory report shows stock by warehouse

**Missing:**
- [ ] GET /api/products/{id}/stock?warehouseId={id} - Get stock for specific warehouse
- [ ] GET /api/products/{id}/warehouses - List all warehouses for product
- [ ] GET /api/warehouses/{id}/low-stock - Products below minimum in warehouse

**Impact:**
- Current implementation requires fetching all inventory then filtering client-side
- Performance issue with large datasets
- No dedicated API for warehouse-specific queries

---

## 6. Pre-PR Checklist

Before creating pull request to main branch:

### 6.1 Code Quality
- [ ] No console.log() statements (or only intentional logging)
- [ ] No commented-out code blocks
- [ ] No TODO comments (move to GitHub issues)
- [ ] ESLint warnings resolved
- [ ] TypeScript errors resolved
- [ ] Code formatted (prettier)

### 6.2 Functionality
- [ ] All features from MULTI_WAREHOUSE_REFACTOR_PLAN.md implemented
- [ ] Product multi-warehouse allocation works (Phase 1)
- [ ] Bundle warehouse selection works (Phase 2)
- [ ] Variant warehouse allocation UI ready (Phase 3)
- [ ] Expiration date report fixed
- [ ] Inventory report uses real APIs
- [ ] Informational notice card displays

### 6.3 Testing
- [ ] Manual testing checklist 100% complete
- [ ] No critical bugs found
- [ ] All browsers tested (Chrome, Firefox, Safari, Edge)
- [ ] Performance acceptable (< 3s page loads)
- [ ] Error handling tested (network errors, validation errors)

### 6.4 Documentation
- [ ] BUSINESS_RULES.md updated (Rule #9)
- [ ] MULTI_WAREHOUSE_REFACTOR_PLAN.md status updated
- [ ] MULTI_WAREHOUSE_TESTING.md created
- [ ] MANUAL_TESTING_CHECKLIST.md created
- [ ] Backend integration requirements documented

### 6.5 Git
- [ ] All changes committed
- [ ] Commit messages clear and descriptive
- [ ] Branch pushed to remote
- [ ] Branch up to date with main (rebase if needed)
- [ ] No merge conflicts

### 6.6 Database
- [ ] Schema changes documented
- [ ] Migration scripts ready (if applicable)
- [ ] Test data seed scripts updated

### 6.7 API Contracts
- [ ] Product location API endpoints documented
- [ ] Bundle warehouse field documented
- [ ] Variant location API endpoints documented
- [ ] Request/response examples provided

### 6.8 Known Issues Documented
- [ ] Variant warehouse locations - backend pending
- [ ] Bundle component validation - backend pending
- [ ] Stock transfer feature - not implemented
- [ ] All limitations listed in this document

---

## 7. Success Criteria

This implementation is ready for production when:

- ✅ **Phase 1 Complete:** Product multi-warehouse allocation fully functional
- ✅ **Phase 2 Complete:** Bundle warehouse selection functional (pending validation)
- ⚠️ **Phase 3 Partial:** Variant warehouse UI ready (backend pending)
- ✅ **Bug Fixes:** Expiration date report accurate
- ✅ **API Integration:** Inventory report uses real data
- ✅ **Documentation:** All business rules documented
- ✅ **Testing:** Manual testing checklist completed
- ⚠️ **Backend:** Integration requirements documented for implementation

---

## 8. Post-Deployment Verification

After merging to main and deploying:

### 8.1 Smoke Tests
- [ ] Create test product with 2 warehouse allocations
- [ ] Edit product, verify allocations load
- [ ] Create test bundle with warehouse
- [ ] View inventory report, verify real data loads
- [ ] Check products page, verify expiration dates correct

### 8.2 Monitoring
- [ ] Check error logs for any new errors
- [ ] Monitor API response times
- [ ] Track database query performance
- [ ] Monitor user feedback/support tickets

### 8.3 Rollback Plan
If critical issues found:
1. Revert PR merge
2. Redeploy previous version
3. Investigate issues
4. Fix and retest
5. Redeploy

---

## Document Information

**Version:** 1.0
**Created:** 2025-11-25
**Last Updated:** 2025-11-25
**Maintained By:** Development Team
**Related Documents:**
- MULTI_WAREHOUSE_REFACTOR_PLAN.md
- BUSINESS_RULES.md
- MANUAL_TESTING_CHECKLIST.md

---

## Appendix A: Test Data SQL

```sql
-- Insert test warehouses
INSERT INTO warehouses (id, name, address, city, state, postal_code, country) VALUES
  ('w1', 'Warehouse A', '123 Main St', 'New York', 'NY', '10001', 'USA'),
  ('w2', 'Warehouse B', '456 Oak Ave', 'Los Angeles', 'CA', '90001', 'USA'),
  ('w3', 'Warehouse C', '789 Elm Rd', 'Chicago', 'IL', '60601', 'USA');

-- Insert test products with expiration dates
INSERT INTO products (id, name, sku, price, stock, expiration_date) VALUES
  ('p1', 'Expired Product', 'EXP-001', 50000, 10, CURRENT_DATE - INTERVAL '5 days'),
  ('p2', 'Expiring Soon', 'EXP-002', 75000, 20, CURRENT_DATE + INTERVAL '10 days'),
  ('p3', 'Expiring in 30 days', 'EXP-003', 100000, 30, CURRENT_DATE + INTERVAL '30 days'),
  ('p4', 'Normal Product', 'NORM-001', 150000, 100, NULL);

-- Insert test inventory with low stock
INSERT INTO inventory (product_id, warehouse_id, quantity_available, minimum_stock) VALUES
  ('p1', 'w1', 5, 10),   -- LOW STOCK
  ('p2', 'w1', 20, 10),  -- OK
  ('p3', 'w2', 8, 20),   -- LOW STOCK
  ('p4', 'w2', 100, 50); -- OK
```

---

**END OF DOCUMENT**
