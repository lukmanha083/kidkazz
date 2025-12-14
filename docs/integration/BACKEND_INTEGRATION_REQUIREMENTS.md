# Backend Integration Requirements
## Multi-Warehouse Refactoring

**Branch:** `claude/continue-previous-session-01LUzTBn6NBu18Em7jtaPcYC`
**Date:** 2025-11-25
**Status:** Frontend Complete, Backend Pending
**Priority:** HIGH

---

## Overview

This document specifies the backend API and database changes required to fully support the multi-warehouse refactoring implementation. The frontend is complete and ready for integration.

**Related Documents:**
- `MULTI_WAREHOUSE_REFACTOR_PLAN.md` - Overall implementation plan
- `MULTI_WAREHOUSE_TESTING.md` - Comprehensive testing plan
- `BUSINESS_RULES.md` - Business Rule #9 (Multi-Warehouse Allocation)

---

## Implementation Status

| Feature | Frontend Status | Backend Status |
|---------|----------------|----------------|
| Product Multi-Warehouse Allocation | ✅ Complete | ⚠️ Partial (API exists, needs verification) |
| Bundle Warehouse Selection | ✅ Complete | ❌ Pending (warehouseId field missing) |
| Variant Warehouse Allocation | ✅ Complete | ❌ Pending (variant_locations table missing) |

---

## 1. Product Location API

### Status: ⚠️ VERIFY EXISTING IMPLEMENTATION

**Assumption:** Product location API likely already exists in codebase. Verify the following endpoints exist and match specifications.

### Required Endpoints:

#### 1.1 POST /api/product-locations
**Purpose:** Create new product warehouse location

**Request Body:**
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

**Field Specifications:**
- `productId` (required, UUID): Must reference existing product
- `warehouseId` (required, UUID): Must reference existing warehouse
- `quantity` (required, integer): Non-negative integer
- `rack` (optional, string, max 50 chars): Rack identifier
- `bin` (optional, string, max 50 chars): Bin identifier
- `zone` (optional, string, max 50 chars): Zone identifier
- `aisle` (optional, string, max 50 chars): Aisle identifier

**Success Response (201 Created):**
```json
{
  "id": "location-uuid-123",
  "productId": "product-uuid-456",
  "warehouseId": "warehouse-uuid-789",
  "quantity": 100,
  "rack": "A1",
  "bin": "B2",
  "zone": "Z1",
  "aisle": "A",
  "createdAt": "2025-11-25T10:30:00.000Z",
  "updatedAt": "2025-11-25T10:30:00.000Z"
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid input
{
  "error": "Validation failed",
  "details": [
    { "field": "productId", "message": "Product ID is required" },
    { "field": "quantity", "message": "Quantity must be a non-negative integer" }
  ]
}

// 404 Not Found - Product or warehouse doesn't exist
{
  "error": "Resource not found",
  "message": "Product with ID 'product-uuid' not found"
}

// 409 Conflict - Duplicate location
{
  "error": "Conflict",
  "message": "Location already exists for this product and warehouse combination"
}

// 422 Unprocessable Entity - Validation errors
{
  "error": "Unprocessable Entity",
  "message": "Quantity cannot be negative"
}
```

**Validation Rules:**
1. `productId` must exist in `products` table (foreign key constraint)
2. `warehouseId` must exist in `warehouses` table (foreign key constraint)
3. `quantity` must be >= 0
4. Unique constraint: Cannot have duplicate `(productId, warehouseId)` pair
5. Optional fields can be null/empty but max length enforced if provided

**Database Constraints:**
```sql
ALTER TABLE product_locations
  ADD CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0),
  ADD CONSTRAINT uq_product_warehouse UNIQUE (product_id, warehouse_id);
```

---

#### 1.2 GET /api/product-locations?productId={id}
**Purpose:** Retrieve all warehouse locations for a specific product

**Query Parameters:**
- `productId` (required, UUID): Product ID to filter by

**Success Response (200 OK):**
```json
{
  "productLocations": [
    {
      "id": "loc-1-uuid",
      "productId": "product-uuid",
      "warehouseId": "warehouse-a-uuid",
      "quantity": 50,
      "rack": "A1",
      "bin": "B1",
      "zone": "Z1",
      "aisle": "A",
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-11-25T10:00:00.000Z",
      "warehouse": {
        "id": "warehouse-a-uuid",
        "name": "Main Warehouse",
        "city": "New York",
        "state": "NY",
        "country": "USA"
      }
    },
    {
      "id": "loc-2-uuid",
      "productId": "product-uuid",
      "warehouseId": "warehouse-b-uuid",
      "quantity": 50,
      "rack": "A2",
      "bin": "B2",
      "zone": null,
      "aisle": null,
      "createdAt": "2025-11-25T11:00:00.000Z",
      "updatedAt": "2025-11-25T11:00:00.000Z",
      "warehouse": {
        "id": "warehouse-b-uuid",
        "name": "West Coast Warehouse",
        "city": "Los Angeles",
        "state": "CA",
        "country": "USA"
      }
    }
  ]
}
```

**Empty Result (200 OK):**
```json
{
  "productLocations": []
}
```

**Error Response:**
```json
// 400 Bad Request - Missing productId
{
  "error": "Bad Request",
  "message": "productId query parameter is required"
}
```

**Implementation Notes:**
- **MUST JOIN** with `warehouses` table to include warehouse details
- Return empty array if no locations found (don't return 404)
- Sort by `warehouse.name` ASC for consistent ordering
- Include all location fields even if null

**SQL Example:**
```sql
SELECT
  pl.*,
  json_build_object(
    'id', w.id,
    'name', w.name,
    'city', w.city,
    'state', w.state,
    'country', w.country
  ) as warehouse
FROM product_locations pl
INNER JOIN warehouses w ON pl.warehouse_id = w.id
WHERE pl.product_id = $1
ORDER BY w.name ASC;
```

---

#### 1.3 PUT /api/product-locations/{id}
**Purpose:** Update existing product warehouse location

**Path Parameters:**
- `id` (required, UUID): Location ID to update

**Request Body:**
```json
{
  "quantity": 150,
  "rack": "A2",
  "bin": "B3",
  "zone": "Z2",
  "aisle": "B"
}
```

**Updatable Fields:**
- `quantity` (optional, integer >= 0)
- `rack` (optional, string)
- `bin` (optional, string)
- `zone` (optional, string)
- `aisle` (optional, string)

**Non-Updatable Fields:**
- `productId` - Cannot change (create new location instead)
- `warehouseId` - Cannot change (create new location instead)

**Success Response (200 OK):**
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
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T12:30:00.000Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": "Not Found",
  "message": "Product location with ID 'location-uuid' not found"
}

// 400 Bad Request - Invalid data
{
  "error": "Validation failed",
  "details": [
    { "field": "quantity", "message": "Quantity must be a non-negative integer" }
  ]
}

// 422 Unprocessable Entity - Trying to change productId/warehouseId
{
  "error": "Unprocessable Entity",
  "message": "Cannot change productId or warehouseId. Create a new location instead."
}
```

**Implementation Notes:**
- Only update fields provided in request body (partial update)
- Automatically update `updatedAt` timestamp
- Validate quantity >= 0 if provided
- Reject attempts to change `productId` or `warehouseId`

---

#### 1.4 DELETE /api/product-locations/{id}
**Purpose:** Delete product warehouse location

**Path Parameters:**
- `id` (required, UUID): Location ID to delete

**Success Response (204 No Content):**
No response body.

**Alternative Success Response (200 OK):**
```json
{
  "message": "Product location deleted successfully"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": "Not Found",
  "message": "Product location with ID 'location-uuid' not found"
}

// 409 Conflict - Cannot delete (optional constraint)
{
  "error": "Conflict",
  "message": "Cannot delete location with active orders or reservations"
}
```

**Implementation Notes:**
- Soft delete vs hard delete: Decision depends on business requirements
- Consider cascade behavior: What happens to orders referencing this location?
- May need to check for active orders/reservations before deletion

---

## 2. Bundle Warehouse Field

### Status: ❌ NOT IMPLEMENTED

**Priority:** HIGH
**Estimated Effort:** Medium (1-2 days)

### Required Changes:

#### 2.1 Database Schema Migration

**Add `warehouse_id` column to `product_bundles` table:**

```sql
-- Migration: Add warehouse_id to product_bundles
-- File: migrations/YYYYMMDDHHMMSS_add_warehouse_to_bundles.sql

BEGIN;

-- Add warehouse_id column (nullable initially for existing data)
ALTER TABLE product_bundles
ADD COLUMN warehouse_id UUID;

-- Add foreign key constraint
ALTER TABLE product_bundles
ADD CONSTRAINT fk_bundle_warehouse
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX idx_bundles_warehouse
ON product_bundles(warehouse_id);

-- Optionally: Make it required for new bundles (if business rule demands)
-- ALTER TABLE product_bundles
-- ALTER COLUMN warehouse_id SET NOT NULL;

COMMIT;
```

**Rollback Migration:**
```sql
-- Rollback: Remove warehouse_id from product_bundles
BEGIN;

DROP INDEX IF EXISTS idx_bundles_warehouse;
ALTER TABLE product_bundles DROP CONSTRAINT IF EXISTS fk_bundle_warehouse;
ALTER TABLE product_bundles DROP COLUMN IF EXISTS warehouse_id;

COMMIT;
```

---

#### 2.2 API Endpoint Updates

**2.2.1 POST /api/bundles - Create Bundle**

**Updated Request Body:**
```json
{
  "bundleName": "Starter Kit",
  "bundleSKU": "SK-001",
  "bundleDescription": "Complete starter bundle",
  "bundlePrice": 500000,
  "discountPercentage": 10,
  "availableStock": 50,
  "status": "active",
  "warehouseId": "warehouse-uuid-123",  // ← NEW FIELD (REQUIRED)
  "items": [
    {
      "productId": "product-1-uuid",
      "quantity": 2
    },
    {
      "productId": "product-2-uuid",
      "quantity": 1
    }
  ]
}
```

**New Field:**
- `warehouseId` (required, UUID): Warehouse where bundle is assembled

**Updated Response (201 Created):**
```json
{
  "id": "bundle-uuid",
  "bundleName": "Starter Kit",
  "bundleSKU": "SK-001",
  "bundleDescription": "Complete starter bundle",
  "bundlePrice": 500000,
  "discountPercentage": 10,
  "availableStock": 50,
  "status": "active",
  "warehouseId": "warehouse-uuid-123",  // ← INCLUDED IN RESPONSE
  "items": [...],
  "createdAt": "2025-11-25T10:00:00.000Z"
}
```

**Additional Validation:**
```json
// 404 Not Found - Warehouse doesn't exist
{
  "error": "Not Found",
  "message": "Warehouse with ID 'warehouse-uuid-123' not found"
}
```

---

**2.2.2 Business Rule Validation (IMPORTANT)**

**Business Rule #9 (from BUSINESS_RULES.md):**
> Bundle components must exist in the same warehouse where the bundle is assembled.

**Validation Logic:**
```typescript
// Pseudo-code for bundle component validation
async function validateBundleComponents(warehouseId: string, items: BundleItem[]) {
  const errors = [];

  for (const item of items) {
    // Check if product exists in the specified warehouse
    const location = await getProductLocation(item.productId, warehouseId);

    if (!location) {
      errors.push({
        productId: item.productId,
        error: `Product not found in warehouse ${warehouseId}`
      });
      continue;
    }

    // Check if sufficient stock available
    if (location.quantity < item.quantity) {
      errors.push({
        productId: item.productId,
        error: `Insufficient stock. Required: ${item.quantity}, Available: ${location.quantity}`
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Bundle component validation failed', errors);
  }
}
```

**Error Response for Validation Failure:**
```json
// 400 Bad Request - Component validation failed
{
  "error": "Bundle component validation failed",
  "details": [
    {
      "productId": "product-1-uuid",
      "productName": "Product A",
      "error": "Product not found in warehouse Main Warehouse"
    },
    {
      "productId": "product-2-uuid",
      "productName": "Product B",
      "error": "Insufficient stock. Required: 5, Available: 2"
    }
  ]
}
```

**Implementation Steps:**
1. Validate `warehouseId` exists
2. For each bundle item:
   - Query `product_locations` WHERE `product_id = item.productId AND warehouse_id = warehouseId`
   - If no location found: Add error
   - If `location.quantity < item.quantity`: Add error
3. If errors exist: Return 400 with detailed error list
4. If validation passes: Proceed with bundle creation

---

**2.2.3 GET /api/bundles/{id} - Get Bundle**

**Updated Response:**
```json
{
  "id": "bundle-uuid",
  "bundleName": "Starter Kit",
  "bundleSKU": "SK-001",
  "bundleDescription": "Complete starter bundle",
  "bundlePrice": 500000,
  "discountPercentage": 10,
  "availableStock": 50,
  "status": "active",
  "warehouseId": "warehouse-uuid-123",  // ← INCLUDE THIS
  "warehouse": {  // ← OPTIONAL: Include warehouse details
    "id": "warehouse-uuid-123",
    "name": "Main Warehouse",
    "city": "New York",
    "state": "NY"
  },
  "items": [...]
}
```

**SQL Update:**
```sql
SELECT
  pb.*,
  json_build_object(
    'id', w.id,
    'name', w.name,
    'city', w.city,
    'state', w.state
  ) as warehouse
FROM product_bundles pb
LEFT JOIN warehouses w ON pb.warehouse_id = w.id
WHERE pb.id = $1;
```

---

**2.2.4 PUT /api/bundles/{id} - Update Bundle**

**Allow Updating Warehouse:**
```json
{
  "warehouseId": "new-warehouse-uuid"
}
```

**Validation:**
- When changing warehouse, **re-validate** all bundle components exist in new warehouse
- Return 400 if components not available in new warehouse

**Implementation:**
```typescript
async function updateBundle(bundleId: string, updates: BundleUpdate) {
  const bundle = await getBundle(bundleId);

  // If warehouse is being changed, re-validate components
  if (updates.warehouseId && updates.warehouseId !== bundle.warehouseId) {
    await validateBundleComponents(updates.warehouseId, bundle.items);
  }

  // Proceed with update
  return await db.updateBundle(bundleId, updates);
}
```

---

**2.2.5 GET /api/bundles - List Bundles**

**Query Parameter (Optional):**
- `?warehouseId={uuid}` - Filter bundles by warehouse

**Example:**
```
GET /api/bundles?warehouseId=warehouse-uuid-123
```

**Response:**
```json
{
  "bundles": [
    {
      "id": "bundle-1",
      "bundleName": "Kit A",
      "warehouseId": "warehouse-uuid-123",
      "warehouse": {
        "id": "warehouse-uuid-123",
        "name": "Main Warehouse"
      }
    }
  ]
}
```

---

#### 2.3 TypeScript Type Updates

**Update `ProductBundle` interface:**

**File:** `lib/api.ts` (or similar)

```typescript
// Before:
export interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  bundleDescription?: string;
  bundlePrice: number;
  discountPercentage: number;
  availableStock: number;
  status: 'active' | 'inactive';
  items: BundleItem[];
  createdAt: string;
  updatedAt: string;
}

// After:
export interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  bundleDescription?: string;
  bundlePrice: number;
  discountPercentage: number;
  availableStock: number;
  status: 'active' | 'inactive';
  warehouseId: string;  // ← ADD THIS
  warehouse?: {  // ← ADD THIS (optional, populated by JOIN)
    id: string;
    name: string;
    city: string;
    state?: string;
  };
  items: BundleItem[];
  createdAt: string;
  updatedAt: string;
}

// Update CreateBundleInput
export interface CreateBundleInput {
  bundleName: string;
  bundleSKU: string;
  bundleDescription?: string;
  bundlePrice: number;
  discountPercentage: number;
  availableStock: number;
  status: 'active' | 'inactive';
  warehouseId: string;  // ← ADD THIS (REQUIRED)
  items: BundleItem[];
}
```

---

## 3. Variant Warehouse Locations

### Status: ❌ NOT IMPLEMENTED

**Priority:** HIGH
**Estimated Effort:** Medium-High (2-3 days)

### Required Changes:

#### 3.1 Database Schema

**Create `variant_locations` table:**

```sql
-- Migration: Create variant_locations table
-- File: migrations/YYYYMMDDHHMMSS_create_variant_locations.sql

BEGIN;

CREATE TABLE variant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  rack VARCHAR(50),
  bin VARCHAR(50),
  zone VARCHAR(50),
  aisle VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints
  CONSTRAINT fk_variant_id FOREIGN KEY (variant_id)
    REFERENCES product_variants(id) ON DELETE CASCADE,

  CONSTRAINT fk_warehouse_id FOREIGN KEY (warehouse_id)
    REFERENCES warehouses(id) ON DELETE RESTRICT,

  -- Unique constraint: one location per variant per warehouse
  CONSTRAINT uq_variant_warehouse UNIQUE (variant_id, warehouse_id)
);

-- Indexes for performance
CREATE INDEX idx_variant_locations_variant ON variant_locations(variant_id);
CREATE INDEX idx_variant_locations_warehouse ON variant_locations(warehouse_id);

-- Updated_at trigger (if using PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variant_locations_updated_at
BEFORE UPDATE ON variant_locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**Rollback Migration:**
```sql
BEGIN;

DROP TRIGGER IF EXISTS update_variant_locations_updated_at ON variant_locations;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS variant_locations;

COMMIT;
```

**Table Structure:**
- **id:** UUID primary key
- **variant_id:** References `product_variants.id`, CASCADE delete
- **warehouse_id:** References `warehouses.id`, RESTRICT delete
- **quantity:** Non-negative integer, stock at this warehouse
- **rack, bin, zone, aisle:** Optional location details (max 50 chars)
- **created_at, updated_at:** Timestamps

**Constraints:**
- Unique constraint on `(variant_id, warehouse_id)` - One location per variant per warehouse
- Check constraint: `quantity >= 0`

---

#### 3.2 API Endpoints

**3.2.1 POST /api/variant-locations**

**Purpose:** Create variant warehouse location

**Request Body:**
```json
{
  "variantId": "variant-uuid-123",
  "warehouseId": "warehouse-uuid-456",
  "quantity": 50,
  "rack": "A1",
  "bin": "B1",
  "zone": "Z1",
  "aisle": "A"
}
```

**Field Specifications:**
- `variantId` (required, UUID): Must reference existing variant
- `warehouseId` (required, UUID): Must reference existing warehouse
- `quantity` (required, integer >= 0): Stock quantity
- `rack`, `bin`, `zone`, `aisle` (optional, string max 50 chars)

**Success Response (201 Created):**
```json
{
  "id": "location-uuid-789",
  "variantId": "variant-uuid-123",
  "warehouseId": "warehouse-uuid-456",
  "quantity": 50,
  "rack": "A1",
  "bin": "B1",
  "zone": "Z1",
  "aisle": "A",
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T10:00:00.000Z"
}
```

**Error Responses:**
```json
// 404 Not Found - Variant or warehouse doesn't exist
{
  "error": "Not Found",
  "message": "Variant with ID 'variant-uuid-123' not found"
}

// 409 Conflict - Duplicate location
{
  "error": "Conflict",
  "message": "Location already exists for this variant and warehouse combination"
}

// 400 Bad Request - Invalid data
{
  "error": "Validation failed",
  "details": [
    { "field": "quantity", "message": "Quantity must be a non-negative integer" }
  ]
}
```

---

**3.2.2 GET /api/variant-locations?variantId={id}**

**Purpose:** Get all warehouse locations for a variant

**Query Parameters:**
- `variantId` (required, UUID): Filter by variant ID

**Success Response (200 OK):**
```json
{
  "variantLocations": [
    {
      "id": "loc-1-uuid",
      "variantId": "variant-uuid",
      "warehouseId": "warehouse-a-uuid",
      "quantity": 30,
      "rack": "A1",
      "bin": "B1",
      "zone": "Z1",
      "aisle": "A",
      "createdAt": "2025-11-25T10:00:00.000Z",
      "updatedAt": "2025-11-25T10:00:00.000Z",
      "warehouse": {
        "id": "warehouse-a-uuid",
        "name": "Main Warehouse",
        "city": "New York"
      }
    },
    {
      "id": "loc-2-uuid",
      "variantId": "variant-uuid",
      "warehouseId": "warehouse-b-uuid",
      "quantity": 20,
      "rack": "B1",
      "bin": null,
      "zone": null,
      "aisle": null,
      "createdAt": "2025-11-25T11:00:00.000Z",
      "updatedAt": "2025-11-25T11:00:00.000Z",
      "warehouse": {
        "id": "warehouse-b-uuid",
        "name": "West Coast Warehouse",
        "city": "Los Angeles"
      }
    }
  ]
}
```

**Empty Result:**
```json
{
  "variantLocations": []
}
```

**Implementation Notes:**
- JOIN with `warehouses` table to include warehouse details
- Return empty array if no locations found
- Sort by `warehouse.name` ASC

**SQL Example:**
```sql
SELECT
  vl.*,
  json_build_object(
    'id', w.id,
    'name', w.name,
    'city', w.city,
    'state', w.state
  ) as warehouse
FROM variant_locations vl
INNER JOIN warehouses w ON vl.warehouse_id = w.id
WHERE vl.variant_id = $1
ORDER BY w.name ASC;
```

---

**3.2.3 PUT /api/variant-locations/{id}**

**Purpose:** Update variant warehouse location

**Request Body:**
```json
{
  "quantity": 75,
  "rack": "A2",
  "bin": "B2"
}
```

**Updatable Fields:**
- `quantity` (optional, integer >= 0)
- `rack`, `bin`, `zone`, `aisle` (optional, strings)

**Non-Updatable:**
- `variantId`, `warehouseId` (create new location instead)

**Success Response (200 OK):**
```json
{
  "id": "location-uuid",
  "variantId": "variant-uuid",
  "warehouseId": "warehouse-uuid",
  "quantity": 75,
  "rack": "A2",
  "bin": "B2",
  "zone": "Z1",
  "aisle": "A",
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-11-25T12:30:00.000Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "error": "Not Found",
  "message": "Variant location with ID 'location-uuid' not found"
}

// 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "field": "quantity", "message": "Quantity must be non-negative" }
  ]
}
```

---

**3.2.4 DELETE /api/variant-locations/{id}**

**Purpose:** Delete variant warehouse location

**Success Response (204 No Content):**
No body.

**Alternative Response (200 OK):**
```json
{
  "message": "Variant location deleted successfully"
}
```

**Error Response:**
```json
// 404 Not Found
{
  "error": "Not Found",
  "message": "Variant location with ID 'location-uuid' not found"
}
```

---

#### 3.3 Frontend Integration Update

**File:** `apps/admin-dashboard/src/routes/dashboard/products/variant.tsx`

**Current Status:** UI complete, form submission NOT saving allocations

**Required Code Updates:**

**3.3.1 Load Allocations on Edit:**

```typescript
// CURRENT (placeholder):
const handleEditVariant = (variant: ProductVariant) => {
  setFormMode('edit');
  setSelectedVariant(variant);
  setFormData({...variant});
  setWarehouseAllocations([]); // ← Empty placeholder
  setFormDrawerOpen(true);
};

// UPDATED (fetch from API):
const handleEditVariant = async (variant: ProductVariant) => {
  setFormMode('edit');
  setSelectedVariant(variant);
  setFormData({...variant});

  // FETCH variant locations from backend
  try {
    const response = await fetch(`/api/variant-locations?variantId=${variant.id}`);
    const data = await response.json();

    const allocations: WarehouseAllocation[] = data.variantLocations.map(loc => ({
      warehouseId: loc.warehouseId,
      warehouseName: loc.warehouse.name,
      quantity: loc.quantity,
      rack: loc.rack || undefined,
      bin: loc.bin || undefined,
      zone: loc.zone || undefined,
      aisle: loc.aisle || undefined,
    }));

    setWarehouseAllocations(allocations);
  } catch (error) {
    console.error('Failed to load variant allocations:', error);
    toast.error('Failed to load warehouse allocations');
    setWarehouseAllocations([]);
  }

  setFormDrawerOpen(true);
};
```

---

**3.3.2 Save Allocations on Create:**

```typescript
// ADD to create variant mutation:
const createVariantMutation = useMutation({
  mutationFn: async (newVariant) => {
    // 1. Create variant first
    const variant = await variantApi.create(newVariant);

    // 2. Create warehouse locations
    for (const allocation of warehouseAllocations) {
      await fetch('/api/variant-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          warehouseId: allocation.warehouseId,
          quantity: allocation.quantity,
          rack: allocation.rack || null,
          bin: allocation.bin || null,
          zone: allocation.zone || null,
          aisle: allocation.aisle || null,
        }),
      });
    }

    return variant;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['variants'] });
    toast.success('Variant created successfully');
    setFormDrawerOpen(false);
  },
});
```

---

**3.3.3 Update Allocations on Edit:**

```typescript
// ADD to update variant mutation:
const updateVariantMutation = useMutation({
  mutationFn: async ({ id, updates }) => {
    // 1. Update variant
    const variant = await variantApi.update(id, updates);

    // 2. Sync warehouse locations (same logic as products)
    const response = await fetch(`/api/variant-locations?variantId=${id}`);
    const data = await response.json();
    const existingLocations = data.variantLocations;

    // Update or create allocations
    for (const allocation of warehouseAllocations) {
      const existing = existingLocations.find(
        loc => loc.warehouseId === allocation.warehouseId
      );

      if (existing) {
        // Update existing location
        await fetch(`/api/variant-locations/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: allocation.quantity,
            rack: allocation.rack || null,
            bin: allocation.bin || null,
            zone: allocation.zone || null,
            aisle: allocation.aisle || null,
          }),
        });
      } else {
        // Create new location
        await fetch('/api/variant-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantId: id,
            warehouseId: allocation.warehouseId,
            quantity: allocation.quantity,
            rack: allocation.rack || null,
            bin: allocation.bin || null,
            zone: allocation.zone || null,
            aisle: allocation.aisle || null,
          }),
        });
      }
    }

    // Delete removed allocations
    for (const existing of existingLocations) {
      const stillExists = warehouseAllocations.find(
        alloc => alloc.warehouseId === existing.warehouseId
      );
      if (!stillExists) {
        await fetch(`/api/variant-locations/${existing.id}`, {
          method: 'DELETE',
        });
      }
    }

    return variant;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['variants'] });
    toast.success('Variant updated successfully');
    setFormDrawerOpen(false);
  },
});
```

---

#### 3.4 TypeScript Type Definitions

**Add to `lib/api.ts`:**

```typescript
export interface VariantLocation {
  id: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
  createdAt: string;
  updatedAt: string;
  warehouse?: {
    id: string;
    name: string;
    city: string;
    state?: string;
  };
}

export interface CreateVariantLocationInput {
  variantId: string;
  warehouseId: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
}

export interface UpdateVariantLocationInput {
  quantity?: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
}

// API functions
export const variantLocationApi = {
  create: (data: CreateVariantLocationInput): Promise<VariantLocation> =>
    fetch('/api/variant-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  getByVariantId: (variantId: string): Promise<{ variantLocations: VariantLocation[] }> =>
    fetch(`/api/variant-locations?variantId=${variantId}`).then(res => res.json()),

  update: (id: string, data: UpdateVariantLocationInput): Promise<VariantLocation> =>
    fetch(`/api/variant-locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  delete: (id: string): Promise<void> =>
    fetch(`/api/variant-locations/${id}`, { method: 'DELETE' }).then(() => {}),
};
```

---

## 4. Testing Requirements

### 4.1 Unit Tests

**Product Location API:**
```typescript
describe('ProductLocationAPI', () => {
  it('should create product location', async () => {
    const location = await productLocationApi.create({
      productId: 'p1',
      warehouseId: 'w1',
      quantity: 100,
      rack: 'A1',
    });

    expect(location.id).toBeDefined();
    expect(location.quantity).toBe(100);
  });

  it('should prevent duplicate warehouse allocation', async () => {
    await productLocationApi.create({ productId: 'p1', warehouseId: 'w1', quantity: 50 });

    await expect(
      productLocationApi.create({ productId: 'p1', warehouseId: 'w1', quantity: 30 })
    ).rejects.toThrow('Conflict');
  });

  it('should validate warehouse exists', async () => {
    await expect(
      productLocationApi.create({ productId: 'p1', warehouseId: 'invalid', quantity: 50 })
    ).rejects.toThrow('not found');
  });
});
```

**Bundle Warehouse Validation:**
```typescript
describe('BundleAPI', () => {
  it('should create bundle with warehouse', async () => {
    const bundle = await bundleApi.create({
      bundleName: 'Kit',
      warehouseId: 'w1',
      items: [{ productId: 'p1', quantity: 2 }],
    });

    expect(bundle.warehouseId).toBe('w1');
  });

  it('should validate components exist in warehouse', async () => {
    await expect(
      bundleApi.create({
        bundleName: 'Kit',
        warehouseId: 'w1',
        items: [{ productId: 'p-not-in-w1', quantity: 2 }],
      })
    ).rejects.toThrow('not found in warehouse');
  });

  it('should validate sufficient stock', async () => {
    // Product has only 1 unit in warehouse, but bundle needs 5
    await expect(
      bundleApi.create({
        bundleName: 'Kit',
        warehouseId: 'w1',
        items: [{ productId: 'p1', quantity: 5 }],
      })
    ).rejects.toThrow('Insufficient stock');
  });
});
```

---

### 4.2 Integration Tests

**See:** `MULTI_WAREHOUSE_TESTING.md` Section 2: Backend Integration Testing

---

## 5. Documentation Updates

**Update API documentation:**
- [ ] Add product location endpoints to API docs
- [ ] Document bundle `warehouseId` field
- [ ] Add variant location endpoints to API docs
- [ ] Update Postman/Swagger collections

**Update database schema docs:**
- [ ] Document `product_bundles.warehouse_id` column
- [ ] Document `variant_locations` table

---

## 6. Deployment Checklist

### 6.1 Pre-Deployment
- [ ] All migrations tested in development
- [ ] API endpoints tested with Postman/curl
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Code reviewed by senior developer

### 6.2 Database Migrations
- [ ] Backup production database
- [ ] Run migrations in staging environment first
- [ ] Verify data integrity after migration
- [ ] Test rollback procedure

### 6.3 API Deployment
- [ ] Deploy backend API changes
- [ ] Verify endpoints accessible
- [ ] Test with frontend (staging environment)
- [ ] Monitor error logs

### 6.4 Frontend Integration
- [ ] Update frontend to use new APIs
- [ ] Test all CRUD operations
- [ ] Verify no regressions

### 6.5 Post-Deployment
- [ ] Smoke test critical paths
- [ ] Monitor API performance
- [ ] Check database query performance
- [ ] Update documentation

---

## 7. Timeline Estimate

| Task | Estimated Effort | Priority |
|------|-----------------|----------|
| Verify Product Location API | 0.5 days | HIGH |
| Add Bundle `warehouse_id` field | 0.5 days | HIGH |
| Implement Bundle Component Validation | 1 day | HIGH |
| Create `variant_locations` table | 0.5 days | HIGH |
| Implement Variant Location API (4 endpoints) | 1.5 days | HIGH |
| Update Frontend Integration | 0.5 days | HIGH |
| Write Unit Tests | 1 day | MEDIUM |
| Write Integration Tests | 1 day | MEDIUM |
| Documentation Updates | 0.5 days | LOW |

**Total Estimated Effort:** 6-7 days (1-1.5 weeks)

---

## 8. Contact & Support

For questions or clarifications:
- **Frontend Implementation:** See files in `apps/admin-dashboard/src/routes/dashboard/products/`
- **Business Rules:** See `docs/BUSINESS_RULES.md` Rule #9
- **Testing Requirements:** See `MULTI_WAREHOUSE_TESTING.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
**Status:** Ready for Backend Implementation

---

**END OF DOCUMENT**
