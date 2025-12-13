# UOM Conversion Procedure

## Overview
When selling products, sometimes the smallest unit (PCS) runs out of stock, but larger UOMs (BOX, CARTON) are still available in the warehouse. In this case, warehouse staff need to "break down" or "convert" larger UOMs into PCS to continue selling individual pieces.

## Base Unit Creation and Usage

### What is a Base Unit?
A base unit is the fundamental unit of measure used for inventory tracking. By default, the system uses **PCS (Pieces)** as the base unit. However, users can create custom base units for specific product types.

### Why Create Custom Base Units?
Different products may have different natural base units:
- **Weight-based products**: KG (Kilogram), LB (Pound), GR (Gram)
- **Volume-based products**: L (Liter), ML (Milliliter), GAL (Gallon)
- **Length-based products**: M (Meter), CM (Centimeter), FT (Feet)
- **Count-based products**: PCS (Pieces), UNIT, EA (Each)

### How to Create a Custom Base Unit

1. **Navigate to UOM Management Page**
   - Go to Dashboard → Products → Unit of Measure (UOM)
   - Click "Add Custom UOM" button

2. **Fill in the UOM Form**
   - **UOM Code**: Enter a unique code (e.g., `KG`, `L`, `M`)
   - **Unit Name**: Enter descriptive name (e.g., `Kilogram`, `Liter`, `Meter`)
   - **Check "This is a base unit"**: ✅ Enable this checkbox
   - **Conversion Factor**: Automatically set to `1` (cannot be changed for base units)

3. **Save the Base Unit**
   - Click "Create UOM"
   - The new base unit is now available system-wide

**Example: Creating KG as Base Unit**
```
UOM Code: KG
Unit Name: Kilogram
☑ This is a base unit
Conversion Factor: 1 (auto-set, disabled)
```

### Using Custom Base Units in Product Forms

Once a custom base unit is created, it becomes available in the product form:

1. **Navigate to Product Creation/Edit**
   - Go to Dashboard → Products → All Products
   - Click "Add Product" or edit an existing product

2. **Select Base Unit**
   - In the product form, find the "Base Unit" field
   - Default value: `PCS`
   - Available options include all base units created in the system:
     - PCS (default)
     - KG (if created)
     - L (if created)
     - M (if created)
     - etc.

3. **Inventory Tracking with Custom Base Unit**
   - Once selected, all inventory tracking for this product uses the chosen base unit
   - Stock quantities are measured in the base unit
   - Example: If `KG` is selected as base unit:
     - Product stock: `50 KG`
     - Stock adjustments: Add/remove in KG
     - Sales deductions: Track in KG

**Example: Baby Formula Product**
```
Product Name: Baby Formula Powder
Base Unit: KG (instead of PCS)
Stock: 100 KG
Minimum Stock: 20 KG

Custom UOMs for this product:
- KG (Base Unit, conversion factor: 1)
- BOX500G (Box of 500g, conversion factor: 0.5)
- CARTON2KG (Carton of 2kg, conversion factor: 2)
```

When selling:
- Sell 1 BOX500G → Deduct 0.5 KG from inventory
- Sell 1 CARTON2KG → Deduct 2 KG from inventory

### Important Notes

1. **Base Unit Selection is Required**: Every product must have a base unit for inventory tracking
2. **Cannot Change Base Unit After Stock Allocation**: Once a product has stock or transactions, the base unit should not be changed to maintain data integrity
3. **Custom UOMs Relate to Base Unit**: All custom UOMs for a product are converted to the selected base unit
4. **Multiple Products, Different Base Units**:
   - Product A (Baby Bottle): Base Unit = PCS
   - Product B (Baby Formula): Base Unit = KG
   - Product C (Baby Oil): Base Unit = L

### Base Unit vs Custom UOM

| Aspect | Base Unit | Custom UOM |
|--------|-----------|------------|
| Conversion Factor | Always `1` | Greater than 1 (e.g., 6, 12, 18) |
| Checkbox in Form | ☑ This is a base unit | ☐ This is a base unit |
| Purpose | Fundamental tracking unit | Packaging/sales unit |
| Examples | PCS, KG, L, M | BOX6, CARTON18, PACK12 |
| Can be selected in product form | ✅ Yes | ❌ No |

### Validation Rules

1. **Base Unit Conversion Factor**: Always `1`, cannot be changed
2. **Cannot Delete Base Units**: Base units used by products cannot be deleted
3. **Unique UOM Codes**: Each UOM code must be unique across the system
4. **At Least One Base Unit**: The system must have at least one base unit available

## Example Scenario
**Product: Baby Bottle Set**
- Total Stock: 100 PCS
- Current Allocation:
  - PCS (Pieces): 10 units in stock
  - BOX6 (Box of 6): 10 boxes in stock = 60 PCS worth
  - CARTON18 (Carton of 18): 1 carton in stock = 18 PCS worth

**Problem:**
- Customer wants to buy 15 individual bottles (PCS)
- Only 10 PCS available in loose pieces
- Need to open 1 BOX6 to get 6 more pieces

**Solution:**
Convert 1 BOX6 → 6 PCS

## Implementation Location
**Warehouse Page** (`/dashboard/inventory/warehouse`)

This feature should be implemented on the warehouse page because:
1. It's a warehouse operation (breaking down bulk packages)
2. Affects inventory levels across multiple UOMs
3. Requires audit trail for stock movements
4. Should be restricted to warehouse staff role

## Feature Requirements

### 1. UOM Conversion Interface
**Location:** Warehouse page → Product detail view

**UI Components:**
- List of all UOMs for the product with current stock
- "Convert to PCS" button for each non-PCS UOM
- Conversion form modal/drawer

**Conversion Form Fields:**
```
┌─────────────────────────────────────────┐
│ Convert BOX6 to PCS                     │
├─────────────────────────────────────────┤
│                                         │
│ Source UOM: BOX6 (Box of 6)             │
│ Available: 10 boxes                     │
│                                         │
│ Quantity to Convert: [___] boxes       │
│                                         │
│ Will produce: 0 PCS (0 boxes × 6)      │
│                                         │
│ Reason: [dropdown or text field]       │
│  - PCS sold out                         │
│  - Damaged packaging                    │
│  - Bulk order breakdown                 │
│  - Other                                │
│                                         │
│ Notes: [___________________]            │
│                                         │
│ [Cancel]           [Convert to PCS]     │
└─────────────────────────────────────────┘
```

### 2. Conversion Logic

**Stock Updates:**
```typescript
// Before conversion
BOX6: 10 boxes (60 PCS worth)
PCS: 10 pieces

// Convert 1 BOX6 to PCS
BOX6: 10 - 1 = 9 boxes (54 PCS worth)
PCS: 10 + 6 = 16 pieces

// Total stock remains the same (100 PCS)
```

**Validation Rules:**
1. Cannot convert more than available UOM stock
2. Conversion factor must be greater than 1 (cannot convert PCS to PCS)
3. Cannot convert if it would create negative stock
4. Must provide a reason for audit trail

### 3. Database Schema

**New Table: `uom_conversions`**
```sql
CREATE TABLE uom_conversions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,

  -- Source UOM (what we're converting FROM)
  from_uom_code TEXT NOT NULL,
  from_uom_name TEXT NOT NULL,
  from_quantity INTEGER NOT NULL,
  from_conversion_factor INTEGER NOT NULL,

  -- Target is always PCS
  to_uom_code TEXT DEFAULT 'PCS',
  to_quantity INTEGER NOT NULL, -- = from_quantity × from_conversion_factor

  -- Audit
  reason TEXT NOT NULL,
  notes TEXT,
  performed_by TEXT NOT NULL,
  warehouse_id TEXT,
  created_at INTEGER NOT NULL,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

### 4. API Endpoints

**POST** `/api/inventory/convert-uom`
```json
{
  "productId": "prod-123",
  "fromUomCode": "BOX6",
  "quantity": 1,
  "reason": "PCS sold out",
  "notes": "Customer needed 15 pieces, only 10 PCS available",
  "warehouseId": "WH-001",
  "performedBy": "user-456"
}
```

**Response:**
```json
{
  "success": true,
  "conversion": {
    "id": "conv-789",
    "productId": "prod-123",
    "fromUom": "BOX6",
    "fromQuantity": 1,
    "toQuantity": 6,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "updatedStock": {
    "BOX6": 9,
    "PCS": 16
  }
}
```

### 5. Business Rules

**When to Convert:**
1. **PCS Sold Out:** Most common case - customer wants individual pieces but none available
2. **Damaged Packaging:** Box/carton is damaged but contents are fine
3. **Bulk Order Breakdown:** Customer orders odd quantities (e.g., 15 pieces from 18-piece carton)
4. **Promotion:** Special offers requiring individual pieces

**Restrictions:**
1. **One Direction Only:** Can only convert TO PCS, not FROM PCS (reverse operation is "repackaging")
2. **Whole Units:** Cannot convert partial boxes (e.g., cannot convert 0.5 BOX6)
3. **Permission Required:** Only warehouse staff and admins can perform conversions
4. **Audit Trail:** All conversions must be logged with reason

### 6. UI/UX Flow

**Step-by-step Process:**

1. **Navigate to Warehouse Page**
   - View product inventory
   - See UOM breakdown: PCS (10), BOX6 (10), CARTON18 (1)

2. **Identify Need**
   - Notice PCS is low/sold out
   - Have BOX6 or CARTON18 available

3. **Initiate Conversion**
   - Click "Convert to PCS" button on BOX6 row
   - Conversion drawer opens

4. **Enter Details**
   - Quantity: 1 box
   - Reason: "PCS sold out"
   - Notes: Optional explanation

5. **Confirm**
   - Review: "Convert 1 BOX6 → 6 PCS?"
   - Click "Convert to PCS"

6. **Success**
   - Toast notification: "✓ Converted 1 BOX6 to 6 PCS"
   - Stock updates immediately
   - Conversion logged in history

### 7. History & Reporting

**Conversion History Table**
Show all past conversions with filters:
- Date range
- Product
- Performed by
- Reason

**Columns:**
| Date | Product | From UOM | Qty | To PCS | Performed By | Reason |
|------|---------|----------|-----|--------|--------------|--------|
| Jan 15, 2025 10:30 | Baby Bottle Set | BOX6 | 1 | 6 | John Doe | PCS sold out |
| Jan 14, 2025 15:45 | Kids Backpack | CARTON18 | 2 | 36 | Jane Smith | Bulk breakdown |

### 8. Integration Points

**Inventory Service:**
- Update `productUOMs` table when conversion happens
- Maintain total stock integrity (sum of all UOM stocks × conversion factors)
- Trigger stock alerts if any UOM falls below minimum

**Product Service:**
- Link conversions to product ID
- Provide UOM metadata (conversion factors, names)

**Warehouse Service:**
- Track which warehouse performed the conversion
- Generate movement records for stock transfer

## Implementation Priority

**Phase 1: Core Functionality (MVP)**
- ✅ UOM stock validation (prevent exceeding total stock)
- ⏳ Conversion interface on warehouse page
- ⏳ Basic conversion logic (FROM UOM → TO PCS)
- ⏳ Stock updates in database

**Phase 2: Audit & History**
- ⏳ Conversion history table
- ⏳ Reason tracking
- ⏳ User attribution (performed by)

**Phase 3: Advanced Features**
- ⏳ Conversion reports & analytics
- ⏳ Batch conversions (convert multiple UOMs at once)
- ⏳ Undo/reverse conversion (within time window)
- ⏳ Automated suggestions (AI: "Consider converting 1 BOX6 to meet demand")

## Code Example

```typescript
// Conversion function
const convertUOMtoPCS = async (params: {
  productId: string;
  fromUomCode: string;
  quantity: number;
  reason: string;
  notes?: string;
  warehouseId: string;
  performedBy: string;
}) => {
  // 1. Get UOM details
  const fromUom = await getProductUOM(params.productId, params.fromUomCode);
  if (!fromUom) throw new Error('UOM not found');

  // 2. Validate quantity
  if (params.quantity > fromUom.stock) {
    throw new Error(`Insufficient stock. Only ${fromUom.stock} ${fromUom.uomName} available`);
  }

  // 3. Calculate PCS to add
  const pcsToAdd = params.quantity * fromUom.conversionFactor;

  // 4. Update stocks
  await db.transaction(async (tx) => {
    // Decrease source UOM stock
    await tx.update(productUOMs)
      .set({ stock: fromUom.stock - params.quantity })
      .where(eq(productUOMs.id, fromUom.id));

    // Increase PCS stock
    const pcsUom = await getPCSUOM(params.productId);
    await tx.update(productUOMs)
      .set({ stock: pcsUom.stock + pcsToAdd })
      .where(eq(productUOMs.id, pcsUom.id));

    // 5. Log conversion
    await tx.insert(uomConversions).values({
      id: generateId(),
      productId: params.productId,
      fromUomCode: params.fromUomCode,
      fromQuantity: params.quantity,
      toQuantity: pcsToAdd,
      reason: params.reason,
      notes: params.notes,
      performedBy: params.performedBy,
      warehouseId: params.warehouseId,
      createdAt: new Date(),
    });
  });

  return {
    success: true,
    converted: {
      from: `${params.quantity} ${fromUom.uomName}`,
      to: `${pcsToAdd} PCS`,
    },
  };
};
```

## Next Steps

1. **Review this document** with the team
2. **Design UI mockups** for conversion interface
3. **Create database migration** for uom_conversions table
4. **Implement backend API** for conversion
5. **Build frontend UI** on warehouse page
6. **Write tests** for conversion logic
7. **Deploy to staging** for warehouse staff testing
8. **Train warehouse staff** on new feature
9. **Monitor usage** and gather feedback

---

**Document Version:** 1.0
**Last Updated:** January 15, 2025
**Author:** Claude
**Status:** Pending Implementation
