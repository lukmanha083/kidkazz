# DDD and Hexagonal Architecture Boundary Review

## Executive Summary

This document provides a comprehensive review of the **Bounded Context** between Product Service and Inventory Service, specifically analyzing whether stock-related data is correctly placed according to DDD (Domain-Driven Design) principles.

**Review Date**: 2025-12-08
**Reviewer**: Claude (Architecture Analysis)
**Status**: Review Complete - Issues Found

---

## Overview of Current Architecture

### Bounded Contexts Defined

Based on `docs/ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md`:

| Context | Owner | Responsibility |
|---------|-------|----------------|
| **Product Context** | Product Service | Product catalog, pricing, categories, product information |
| **Inventory Context** | Inventory Service | Stock levels, warehouses, movements, batches, expiration |

---

## Schema Analysis

### Product Service (`services/product-service/src/infrastructure/db/schema.ts`)

| Table | Stock-Related Fields | DDD Status |
|-------|---------------------|------------|
| `products` | `minimumStock`, `expirationDate`, `alertDate` | **VIOLATION** |
| `productUOMs` | `stock` | **VIOLATION** |
| `productVariants` | `stock` | **VIOLATION** |
| `productLocations` | `quantity` | **VIOLATION** |
| `variantLocations` | `quantity` | **VIOLATION** |
| `productUOMLocations` | `quantity` | **VIOLATION** |
| `productBundles` | (removed `availableStock`) | **FIXED** |

### Inventory Service (`services/inventory-service/src/infrastructure/db/schema.ts`)

| Table | Stock-Related Fields | DDD Status |
|-------|---------------------|------------|
| `inventory` | `quantityAvailable`, `quantityReserved`, `minimumStock` | **CORRECT** |
| `inventoryBatches` | `quantityAvailable`, `expirationDate`, `alertDate` | **CORRECT** |
| `inventoryMovements` | `quantity` | **CORRECT** |
| `inventoryReservations` | `quantityReserved` | **CORRECT** |

---

## Detailed Violation Analysis

### 1. `minimumStock` - INCORRECT PLACEMENT

**Current State:**
- `products.minimumStock` (Product Service) - Line 60 in schema
- `inventory.minimumStock` (Inventory Service) - Line 57 in schema

**Problem:** Data duplication across bounded contexts

**Analysis:**
`minimumStock` is used for reorder alerts - this is an **Inventory Management** concern, not a Product Catalog concern. The Product Catalog should describe "what" a product is, not "how much to keep in stock."

**Documentation Reference:** From `docs/DDD_ANALYSIS_AND_FIX.md`:
> "minimumStock duplicated - caused Low Stock Report to be empty (now fixed)"

**Recommendation:**
- **REMOVE** `minimumStock` from `products` table in Product Service
- **KEEP** only in `inventory` table in Inventory Service
- **Rationale:** Single source of truth principle - Inventory Service owns all stock thresholds

**Business Rule Impact:**
- Minimum stock can be different per warehouse (some warehouses need higher safety stock)
- Product Service doesn't need to know about reorder levels

---

### 2. `expirationDate` and `alertDate` - INCORRECT PLACEMENT

**Current State:**
- `products.expirationDate` (Product Service) - Line 88 in schema
- `products.alertDate` (Product Service) - Line 89 in schema
- `inventoryBatches.expirationDate` (Inventory Service) - Line 147 in schema
- `inventoryBatches.alertDate` (Inventory Service) - Line 148 in schema

**Problem:** Product-level expiration is fundamentally wrong

**Analysis:**
Expiration is a **batch/lot characteristic**, NOT a product characteristic. Different batches of the same product have different expiration dates.

**Real-World Example:**
```
Product: "Fresh Milk 1L" (SKU: MILK-001)

Jakarta Warehouse:
  - Batch #A001: expires 2025-12-15 (100 units)
  - Batch #A002: expires 2025-12-30 (50 units)

Cilangkap Warehouse:
  - Batch #B001: expires 2026-01-10 (75 units)

Current Implementation Problem:
  products.expirationDate = ??? (can only store ONE date!)
```

**Documentation Reference:** From `docs/DDD_ANALYSIS_AND_FIX.md`:
> "expirationDate in Product Service... Product Service stores ONE expirationDate per product. Real-world: Different batches have different expiration dates"

**Recommendation:**
- **REMOVE** `expirationDate` and `alertDate` from `products` table
- **KEEP** only in `inventoryBatches` table (already correct in Inventory Service)
- **Rationale:** FEFO (First Expired, First Out) requires batch-level expiration tracking

---

### 3. `productUOMs.stock` - INCORRECT PLACEMENT

**Current State:**
```typescript
// Product Service - Line 136
stock: integer('stock').default(0).notNull(), // Stock in this UOM
```

**Problem:** Stock data stored in Product Service

**Analysis:**
The `productUOMs` table should only contain:
- UOM conversion information (how many base units in BOX6, CARTON18, etc.)
- Barcode mappings
- Display names

Stock levels in different UOMs should be tracked by Inventory Service.

**Recommendation:**
- **REMOVE** `stock` field from `productUOMs` table
- **ADD** UOM-based inventory tracking in Inventory Service (or rely on base unit conversion)
- **Rationale:** Inventory Service should be the single source of truth for all stock data

---

### 4. `productVariants.stock` - INCORRECT PLACEMENT

**Current State:**
```typescript
// Product Service - Line 161
stock: integer('stock').default(0).notNull(), // Variant stock
```

**Problem:** Variant stock stored in Product Service

**Analysis:**
Product variants (colors, sizes, materials) have their own inventory tracking needs. This stock should be in Inventory Service, not Product Service.

**Recommendation:**
- **REMOVE** `stock` field from `productVariants` table
- **USE** Inventory Service to track variant stock (by variant ID)
- **Rationale:** Inventory Service owns all stock data regardless of product type

---

### 5. Location Tables with Quantity - GRAY AREA

**Current State:**
- `productLocations.quantity` (Line 360)
- `variantLocations.quantity` (Line 389)
- `productUOMLocations.quantity` (Line 422)

**Analysis:**
These tables serve a dual purpose:
1. **Physical Location Tracking** (rack, bin, zone, aisle) - Product Service concern
2. **Stock Quantity at Location** - Inventory Service concern

**Current Implementation Logic:**
According to `docs/DDD_ANALYSIS_AND_FIX.md`, these tables trigger Inventory Service updates:
> "productLocations integration (lines 158-228)... Auto-creates inventory records"

**Recommendation:**
This is a **design decision point** with two valid approaches:

**Option A: Keep in Product Service (Current)**
- Pro: Physical location + quantity together
- Pro: Simpler queries for warehouse operations
- Con: Duplication of stock data
- Con: Sync complexity

**Option B: Split Responsibilities (DDD Pure)**
- Physical location fields (rack, bin, zone, aisle) stay in Product Service
- Quantity/stock moves to Inventory Service
- Pro: Clean separation
- Con: More cross-service queries

**Current Documentation Approach:**
The existing documentation suggests keeping quantity in these tables but auto-syncing to Inventory Service. This is acceptable as long as:
- Inventory Service is the **authoritative source**
- Product Service quantities are **derived/cached** from Inventory Service

---

### 6. `minimumOrderQuantity` - CORRECT PLACEMENT

**Current State:**
```typescript
// Product Service - Line 67
minimumOrderQuantity: integer('minimum_order_quantity').default(1),
```

**Analysis:**
`minimumOrderQuantity` (MOQ) is a **sales rule**, not an inventory concept. It defines the minimum quantity a customer can order, which is a business/sales decision.

**Verdict:** **CORRECT** - This belongs in Product Service as it's part of the product catalog definition.

---

### 7. Product Bundle Stock - FIXED

**Current State:**
```typescript
// Product Service - Lines 192-193 (REMOVED)
// REMOVED: availableStock field - bundles now use virtual stock calculation
// Deprecated: Use GET /api/bundles/:id/available-stock API for virtual stock
```

**Analysis:**
This was previously a violation but has been fixed. Bundle stock is now calculated virtually from component inventory.

**Documentation Reference:** From `docs/PRODUCT_BUNDLES_STOCK_HANDLING.md`:
> "Virtual Bundles (Recommended for E-commerce)... Bundle stock is calculated in real-time based on component availability."

**Verdict:** **CORRECT** - Virtual calculation from Inventory Service

---

## Boundary Context Verdict

### Summary Table

| Data Element | Current Location | Should Be In | Status |
|-------------|------------------|--------------|--------|
| `minimumStock` | Product + Inventory | **Inventory Only** | **VIOLATION** |
| `expirationDate` | Product + Inventory | **Inventory Only** (batch level) | **VIOLATION** |
| `alertDate` | Product + Inventory | **Inventory Only** (batch level) | **VIOLATION** |
| `productUOMs.stock` | Product | **Inventory** | **VIOLATION** |
| `productVariants.stock` | Product | **Inventory** | **VIOLATION** |
| `productLocations.quantity` | Product | **Inventory** (or keep with sync) | **GRAY AREA** |
| `variantLocations.quantity` | Product | **Inventory** (or keep with sync) | **GRAY AREA** |
| `productUOMLocations.quantity` | Product | **Inventory** (or keep with sync) | **GRAY AREA** |
| `minimumOrderQuantity` | Product | **Product** | **CORRECT** |
| `productBundles.availableStock` | (Removed) | Virtual API | **CORRECT** |

### Bounded Context Ownership

**Product Service Should Own:**
- Product catalog information (name, SKU, barcode, description)
- Pricing (retail, wholesale, tier pricing, cost price)
- Categories and subcategories
- Product images and videos
- Physical attributes (weight, dimensions)
- Sales rules (`minimumOrderQuantity`, `wholesaleThreshold`)
- Product status (active, inactive, discontinued)
- Product variants (variant info without stock)
- Product UOMs (conversion factors without stock)
- Product bundles (composition without stock)
- Physical location metadata (rack, bin, zone, aisle) - WITHOUT quantity

**Inventory Service Should Own:**
- All stock quantities (available, reserved, in-transit)
- Minimum stock thresholds for reorder alerts
- Expiration dates (at batch level)
- Warehouse information
- Stock movements and audit trails
- Reservations
- Batch/lot tracking
- Stock at locations (quantity per warehouse/location)

---

## Recommendations

### High Priority Fixes

#### 1. Remove `minimumStock` from Product Service

**Migration Steps:**
1. Create migration to remove `minimumStock` from `products` table
2. Update Product Service API to not return `minimumStock`
3. Update Real Time ERP Dashboard to fetch `minimumStock` from Inventory Service
4. Test Low Stock Report uses Inventory Service data

**Impact:** Low Stock alerts will work correctly

#### 2. Remove `expirationDate` and `alertDate` from Products

**Migration Steps:**
1. Migrate existing `products.expirationDate` to `inventoryBatches.expirationDate`
2. Create one batch per product's warehouse location
3. Remove columns from `products` table
4. Update Real Time ERP Dashboard expired stock reports

**Impact:** FEFO picking becomes possible, accurate expiration tracking

#### 3. Remove `stock` from `productUOMs` and `productVariants`

**Migration Steps:**
1. Ensure Inventory Service tracks stock by variant ID and UOM
2. Remove `stock` fields from both tables
3. Update Real Time ERP Dashboard to call Inventory Service for stock display

**Impact:** Single source of truth for all stock data

### Medium Priority Improvements

#### 4. Clarify Location Table Strategy

**Decision Required:**
- Keep quantity in Product Service with sync to Inventory Service (current approach)
- OR move quantity completely to Inventory Service

**Recommendation:** Keep current approach with clear documentation that Inventory Service is authoritative.

---

## Architectural Diagram

### Current State (With Violations)

```
Product Service (Violations Marked with ❌)
├── products
│   ├── catalog info ✅
│   ├── pricing ✅
│   ├── minimumStock ❌ (duplicate)
│   ├── expirationDate ❌ (should be batch-level)
│   └── alertDate ❌ (should be batch-level)
├── productUOMs
│   ├── conversion info ✅
│   └── stock ❌ (should be in Inventory)
├── productVariants
│   ├── variant info ✅
│   └── stock ❌ (should be in Inventory)
├── productLocations
│   ├── location info ✅
│   └── quantity ⚠️ (gray area - synced to Inventory)
├── variantLocations
│   ├── location info ✅
│   └── quantity ⚠️ (gray area - synced to Inventory)
└── productUOMLocations
    ├── location info ✅
    └── quantity ⚠️ (gray area - synced to Inventory)

Inventory Service (Correct)
├── inventory
│   ├── quantityAvailable ✅
│   ├── quantityReserved ✅
│   └── minimumStock ✅
├── inventoryBatches
│   ├── batchNumber ✅
│   ├── expirationDate ✅ (correct: batch level!)
│   └── quantityAvailable ✅
└── inventoryMovements ✅
```

### Target State (DDD Compliant)

```
Product Service (Catalog Only)
├── products
│   ├── catalog info ✅
│   ├── pricing ✅
│   ├── minimumOrderQuantity ✅ (sales rule)
│   └── wholesaleThreshold ✅ (sales rule)
├── productUOMs
│   ├── conversion info ✅
│   └── barcode ✅
├── productVariants
│   └── variant info ✅
├── productLocations
│   └── location info only (rack, bin, zone, aisle) ✅
├── variantLocations
│   └── location info only ✅
└── productUOMLocations
    └── location info only ✅

Inventory Service (All Stock Data)
├── inventory
│   ├── productId
│   ├── variantId (for variants)
│   ├── warehouseId
│   ├── quantityAvailable ✅
│   ├── quantityReserved ✅
│   └── minimumStock ✅ (single source)
├── inventoryBatches
│   ├── batchNumber
│   ├── expirationDate ✅ (batch level only)
│   ├── alertDate ✅
│   └── quantityAvailable ✅
├── inventoryLocations (NEW - optional)
│   ├── inventoryId
│   ├── rack, bin, zone, aisle
│   └── quantity ✅
└── inventoryMovements ✅
```

---

## Conclusion

### Boundary Context Assessment

The boundary between Product Service and Inventory Service is **NOT correctly implemented** for the following data:

1. **minimumStock** - Duplicated, should be in Inventory only
2. **expirationDate/alertDate** - Product-level is wrong, should be batch-level only
3. **productUOMs.stock** - Should be in Inventory
4. **productVariants.stock** - Should be in Inventory

### What is Correctly Placed

1. **minimumOrderQuantity** - Correct in Product Service (sales rule)
2. **productBundles.availableStock** - Fixed with virtual calculation
3. **inventoryBatches** - Correct implementation of batch-level expiration

### Recommended Action Items

1. **Create migration plan** to remove stock-related fields from Product Service
2. **Ensure Inventory Service APIs** exist for all stock queries
3. **Update Real Time ERP Dashboard** to use Inventory Service for stock display
4. **Test thoroughly** to ensure reports work correctly after migration

---

**Document Status**: Complete
**Next Steps**: Review with team and plan migration
**Related Documents**:
- `docs/DDD_ANALYSIS_AND_FIX.md`
- `docs/DDD_REFACTORING_COMPLETE_SUMMARY.md`
- `docs/PRODUCT_BUNDLES_STOCK_HANDLING.md`
- `docs/ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md`
