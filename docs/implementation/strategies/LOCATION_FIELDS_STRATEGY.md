# Location Fields Strategy - productLocations vs productUOMLocations

## Overview

The system has two location tracking tables with overlapping fields:
- **productLocations**: Warehouse-level product allocation
- **productUOMLocations**: Detailed UOM-specific location tracking

This document clarifies the responsibility of each and how location fields (rack, bin, zone, aisle) should be used.

---

## Current Schema

### productLocations
```typescript
{
  id: string;
  productId: string;
  warehouseId: string;
  rack: string;          // ⚠️ Should not be used in UI
  bin: string;           // ⚠️ Should not be used in UI
  zone: string;          // ⚠️ Should not be used in UI
  aisle: string;         // ⚠️ Should not be used in UI
  quantity: number;      // ⚠️ Will be removed in Phase 2
}
```

### productUOMLocations
```typescript
{
  id: string;
  productUOMId: string;
  warehouseId: string;
  rack: string;          // ✅ Used for detailed tracking
  bin: string;           // ✅ Used for detailed tracking
  zone: string;          // ✅ Used for detailed tracking
  aisle: string;         // ✅ Used for detailed tracking
  quantity: number;      // ⚠️ Will be removed in Phase 2
}
```

---

## Design Decision: Separation of Concerns

### productLocations = Warehouse-Level Allocation
**Purpose**: Track which warehouses have this product
**Use case**: Initial allocation, high-level inventory planning
**Fields used**: warehouseId, quantity
**Fields NOT used**: rack, bin, zone, aisle

**Example**:
```
Product: Baby Bottle (SKU: BOT-001)
├── Warehouse: Jakarta Main - 500 units
├── Warehouse: Surabaya Branch - 300 units
└── Warehouse: Bandung Branch - 200 units
```

No detailed location info needed at this level. Just "Product X is at Warehouse Y with Z units."

---

### productUOMLocations = Detailed Location Tracking
**Purpose**: Track exact physical location of UOM packaging within warehouse
**Use case**: Warehouse picking, FEFO, bin management
**Fields used**: warehouseId, rack, bin, zone, aisle, quantity

**Example**:
```
Product: Baby Bottle (SKU: BOT-001)
├── Warehouse: Jakarta Main
│   ├── 10 BOX6 at Rack A1, Bin TOP, Zone A, Aisle 1
│   ├── 5 CARTON24 at Rack B3, Bin MIDDLE, Zone B, Aisle 2
│   └── 50 PCS at Rack C2, Bin BOTTOM, Zone C, Aisle 3
└── Warehouse: Surabaya Branch
    └── 8 BOX6 at Rack D1, Bin TOP, Zone D, Aisle 1
```

Detailed location info for efficient warehouse operations.

---

## Why This Separation?

### Problem with Mixing Concerns
If productLocations includes rack/bin/zone/aisle:
- **Redundancy**: Same info stored in two places
- **Confusion**: Which table is source of truth?
- **Poor UX**: Admin must fill location fields even for simple allocation
- **Data inconsistency**: productLocations says "Rack A1" but productUOMLocations says "Rack B2"

### Solution: Clear Boundaries
**productLocations**: "Does this warehouse have this product?" (Yes/No, How many?)
**productUOMLocations**: "Where exactly in this warehouse?" (Rack, Bin, Zone, Aisle)

---

## UI Changes

### Before (Confusing)
**Add to Warehouse dialog in Product Form:**
```
┌─────────────────────────────────────┐
│ Add Warehouse Allocation            │
├─────────────────────────────────────┤
│ Warehouse: [Jakarta Main]           │
│ Quantity: [100]                     │
│ Rack: [A1]    Bin: [TOP]           │  ⚠️ Confusing - why fill this here?
│ Zone: [A]     Aisle: [1]           │  ⚠️ Should be in UOM locations!
└─────────────────────────────────────┘
```

### After (Clear)
**Add to Warehouse dialog in Product Form:**
```
┌─────────────────────────────────────┐
│ Add Warehouse Allocation            │
├─────────────────────────────────────┤
│ Warehouse: [Jakarta Main]           │
│ Quantity: [100]                     │
│                                     │
│ Note: Use UOM Locations to assign  │
│ detailed rack/bin positions        │
└─────────────────────────────────────┘
```

**Add UOM Location dialog (in UOM Warehouse Allocation):**
```
┌─────────────────────────────────────┐
│ Add UOM Location                    │
├─────────────────────────────────────┤
│ Warehouse: [Jakarta Main]           │
│ UOM: [BOX6]                         │
│ Quantity: [10]                      │
│ Rack: [A1]    Bin: [TOP]           │  ✅ Makes sense here!
│ Zone: [A]     Aisle: [1]           │  ✅ Detailed tracking
└─────────────────────────────────────┘
```

---

## Implementation

### Phase 1 (Current) - UI Changes Only

**Hide fields in ProductWarehouseAllocation component:**
```typescript
// apps/erp-dashboard/src/components/products/ProductWarehouseAllocation.tsx

// Remove from interface (optional fields, not required in UI):
export interface WarehouseAllocation {
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  // ❌ Remove these from UI (keep in type for backward compatibility):
  // rack?: string;
  // bin?: string;
  // zone?: string;
  // aisle?: string;
}

// Remove from dialog form (lines 312-352)
// Remove from table columns (lines 210-213, 226-236)
```

**Keep fields visible in ProductUOMWarehouseAllocation component:**
```typescript
// apps/erp-dashboard/src/components/products/ProductUOMWarehouseAllocation.tsx
// Keep rack, bin, zone, aisle fields visible ✅
```

---

### Phase 2 (Future) - Schema Changes

When removing quantity fields from location tables (moving to Inventory Service):

**Option 1: Keep fields but deprecate**
```typescript
// Keep fields in schema for backward compatibility
// Add comments marking them as deprecated
rack: text('rack'), // DEPRECATED: Use productUOMLocations for detailed tracking
bin: text('bin'),   // DEPRECATED: Use productUOMLocations for detailed tracking
```

**Option 2: Remove fields entirely**
```sql
-- Migration: Remove location fields from productLocations
ALTER TABLE product_locations DROP COLUMN rack;
ALTER TABLE product_locations DROP COLUMN bin;
ALTER TABLE product_locations DROP COLUMN zone;
ALTER TABLE product_locations DROP COLUMN aisle;
```

**Recommendation**: Option 1 (keep but deprecate) to avoid breaking existing data.

---

## Data Flow After Changes

### Creating Product with Warehouse Allocation

**Step 1: Add to Warehouse (productLocations)**
```
Admin clicks "Add Warehouse" in product form
└─> Creates productLocations record
    └─> warehouseId: "WH001", quantity: 100
    └─> Creates inventory record via INVENTORY_SERVICE
        └─> productId, warehouseId, quantity: 100
```

**Step 2: Add UOM Location (productUOMLocations) - Optional**
```
Admin adds UOM "BOX6" with location details
└─> Creates productUOMLocations record
    └─> productUOMId: "PUOM123"
    └─> warehouseId: "WH001"
    └─> quantity: 10 (BOX6)
    └─> rack: "A1", bin: "TOP", zone: "A", aisle: "1"
    └─> Creates/updates inventory record
        └─> quantity: 10 × 6 = 60 units (converted to base units)
```

---

## Benefits

### 1. Clear Responsibility
- **productLocations**: "Product is at this warehouse" (macro level)
- **productUOMLocations**: "Here's the exact location" (micro level)

### 2. Simpler Workflow
- Quick allocation: Just select warehouse + quantity
- Detailed tracking: Use UOM locations when needed

### 3. No Data Duplication
- Location fields (rack/bin/zone/aisle) only stored where they make sense

### 4. Better UX
- Less clutter in main product form
- Location details grouped with UOM management

### 5. Scalability
- Small businesses: Use productLocations only (simple)
- Large warehouses: Add productUOMLocations for detailed tracking (advanced)

---

## Testing Scenarios

### Test 1: Create Product with Simple Warehouse Allocation
```
Given: Admin creates new product "Baby Bottle"
When: Admin adds warehouse allocation
  - Warehouse: Jakarta Main
  - Quantity: 100
Then:
  - productLocations created (no rack/bin/zone/aisle)
  - inventory record created
  - UI does NOT show location fields
```

### Test 2: Add UOM Location with Detailed Info
```
Given: Product "Baby Bottle" exists with UOM "BOX6"
When: Admin adds UOM location
  - Warehouse: Jakarta Main
  - UOM: BOX6
  - Quantity: 10
  - Rack: A1, Bin: TOP, Zone: A, Aisle: 1
Then:
  - productUOMLocations created with location fields
  - inventory record updated (60 units = 10 × 6)
  - UI shows location fields in UOM dialog
```

### Test 3: Backward Compatibility
```
Given: Existing productLocations with rack/bin/zone/aisle populated
When: Admin views product
Then:
  - Data preserved in database
  - UI hides these fields (shows only warehouse + quantity)
  - Can still query via API if needed
```

---

## Migration Notes

### No Schema Migration Needed (Phase 1)
- Fields remain in database (nullable/optional)
- Only UI changes required
- Backward compatible with existing data

### Optional Cleanup (Phase 2)
- Can remove or deprecate fields later
- Not critical for DDD compliance
- Main violation is `quantity` field (addressed separately)

---

## Summary

| Aspect | productLocations | productUOMLocations |
|--------|-----------------|---------------------|
| Purpose | Warehouse-level allocation | Detailed location tracking |
| Scope | Which warehouses have product | Exact location within warehouse |
| Location fields | Hidden in UI | Visible in UI |
| Use case | Simple allocation | Warehouse operations |
| Required | Yes (at least 1 warehouse) | Optional |
| Complexity | Low | High |

**Key Takeaway**: productLocations = "What warehouse?", productUOMLocations = "Where in warehouse?"

---

**Status**: Documentation complete ✅
**Next**: Update ProductWarehouseAllocation UI component to hide location fields
