# Multi-UOM Barcode System - Implementation Guide

## Problem Statement
In ERP systems, products can be sold in different packaging levels:
- Individual pieces (PCS) - Barcode: 8901234567890
- Box of 6 (BOX6) - Barcode: 8901234567906
- Carton of 18 (CARTON18) - Barcode: 8901234567918

Each packaging level needs its own barcode, but inventory must be tracked in a single base unit (PCS).

## How It Works

### 1. Product UOM Definition
Each product can have multiple UOMs:
```typescript
interface ProductUOM {
  id: string;
  uomCode: string;        // PCS, BOX6, CARTON18
  uomName: string;        // Pieces, Box of 6, Carton (18 PCS)
  barcode: string;        // Unique barcode for this UOM
  conversionFactor: number; // How many base units (from UOM master)
  price: number;          // Selling price for this UOM
  isBaseUnit: boolean;    // One UOM must be base
}
```

### 2. Example: Baby Bottle Product
```
Product UOMs:
┌─────────┬──────────────────┬──────────┬───────────┐
│ UOM     │ Barcode          │ Factor   │ Price     │
├─────────┼──────────────────┼──────────┼───────────┤
│ PCS     │ 8901234567890    │ 1        │ $29.99    │
│ BOX6    │ 8901234567906    │ 6        │ $170.00   │
│ CARTON18│ 8901234567918    │ 18       │ $485.00   │
└─────────┴──────────────────┴──────────┴───────────┘
```

### 3. Inventory Flow

**Receiving Inventory:**
- Scan barcode: 8901234567918 (Carton)
- System looks up barcode → Finds "Baby Bottle" + "CARTON18"
- Gets conversion factor: 18
- Receives 10 cartons
- Adds to inventory: 10 × 18 = 180 PCS

**Selling:**
- Scan barcode: 8901234567906 (Box)
- System looks up barcode → Finds "Baby Bottle" + "BOX6"
- Gets conversion factor: 6
- Sell 5 boxes
- Deducts from inventory: 5 × 6 = 30 PCS
- Remaining: 180 - 30 = 150 PCS

### 4. Barcode Lookup Logic
```typescript
function lookupBarcode(scannedBarcode: string) {
  // Find which product and UOM this barcode belongs to
  for (const product of products) {
    for (const uom of product.uoms) {
      if (uom.barcode === scannedBarcode) {
        return {
          productId: product.id,
          productName: product.name,
          uomCode: uom.uomCode,
          uomName: uom.uomName,
          conversionFactor: uom.conversionFactor,
          price: uom.price
        };
      }
    }
  }
  return null; // Barcode not found
}
```

### 5. Stock Calculation
```typescript
// When selling/transferring, always convert to base unit
function processTransaction(barcode: string, quantity: number) {
  const lookup = lookupBarcode(barcode);
  if (!lookup) return "Barcode not found";

  const baseUnitQuantity = quantity * lookup.conversionFactor;

  // Deduct from inventory in base units
  product.stock -= baseUnitQuantity;

  return `Sold ${quantity} ${lookup.uomName} (${baseUnitQuantity} PCS)`;
}
```

## Implementation in Product Form

### UI Changes Needed:
1. Remove single barcode field from basic info
2. Add "Product UOMs" section after pricing
3. Add interface similar to bundle items:
   - Combobox to select UOM (from UOM master table)
   - Barcode input field
   - Price input field
   - Conversion factor display (read-only, from UOM master)
   - Add/Remove buttons
4. Table showing all product UOMs
5. Validation: At least one base unit (PCS) required

### Form Structure:
```
Basic Info
├── Product Name
├── Description
├── SKU
└── Category

Pricing & Stock
├── Warehouse
└── Initial Stock

Product UOMs (New Section)
├── Add UOM
│   ├── Select UOM (Combobox) → Auto-fills conversion factor
│   ├── Barcode Input → Unique barcode for this UOM
│   ├── Price Input → Selling price
│   └── [Add Button]
└── UOM Table
    ├── UOM Code | UOM Name | Barcode | Factor | Price | Actions
    ├── PCS | Pieces | 890123456789 | 1 | $29.99 | [×]
    ├── BOX6 | Box of 6 | 890123456790 | 6 | $170.00 | [×]
    └── CARTON18 | Carton | 890123456791 | 18 | $485.00 | [×]
```

## Database Schema (for reference)

```sql
-- Products table (existing)
products (
  id, name, description, sku, category, ...
)

-- UOM Master table (already created)
uoms (
  id, code, name, conversion_factor, is_base_unit, ...
)

-- Product UOMs (new table needed)
product_uoms (
  id,
  product_id,
  uom_id,
  barcode,          -- Unique barcode for this product-UOM combination
  price,            -- Selling price for this UOM
  is_default        -- Which UOM to use by default
)

-- Inventory (always in base units)
inventory (
  product_id,
  warehouse_id,
  quantity_pcs      -- Always in base unit (PCS)
)
```

## Benefits
1. **Flexible Selling**: Sell by piece, box, or carton
2. **Accurate Inventory**: Single source of truth (PCS)
3. **Barcode Scanning**: Each package level has unique barcode
4. **Bulk Pricing**: Different prices for different quantities
5. **Easy Receiving**: Scan carton barcode to receive 18 pieces
