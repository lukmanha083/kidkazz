# Business Rules Documentation

## Overview

This document describes all business rules implemented in the system, where they're enforced, and how to work with them.

---

## Inventory Management Rules

### Rule 1: Negative Stock Restrictions

**Rule**: Only POS sales can create negative stock. Warehouse operations cannot.

**Business Rationale**:
- POS operates on a "first-pay-first-served" model
- Customer purchases must always succeed (even if stock goes negative)
- Warehouse operations must be strictly validated to maintain data integrity

**Implementation**:

**Domain Layer** (`Inventory` aggregate):
```typescript
// Warehouse operations - STRICT
public warehouseAdjustOut(quantity: number, reason?: string, performedBy?: string): void {
  if (this.currentStock < quantity) {
    throw new Error('Insufficient stock for warehouse adjustment');
  }
  // ... deduct stock
}

// POS operations - ALLOWS NEGATIVE
public posSale(quantity: number, reason?: string, performedBy?: string): void {
  // No validation - business rule allows negative
  // ... deduct stock (can go negative)
}
```

**API Usage**:
```typescript
// Warehouse adjustment (will fail if insufficient stock)
POST /api/inventory/adjust
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "movementType": "out",
  "source": "warehouse"  // Strict validation
}

// POS sale (can create negative stock)
POST /api/inventory/adjust
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "movementType": "out",
  "source": "pos"  // Allows negative
}
```

**Frontend Validation**:
```typescript
const errors = businessRules.inventory.validateAdjustment(
  quantity,
  'out',
  currentStock,
  'warehouse'  // Will show error if insufficient
);
```

**Tracking**: All movements record `source` field ('warehouse' or 'pos') for audit trail.

---

### Rule 2: Minimum Stock Levels

**Rule**: Cannot set minimum stock to negative value.

**Business Rationale**: Minimum stock is used for reorder alerts. Negative values don't make sense.

**Implementation**:
```typescript
public setMinimumStock(minimumStock: number): void {
  if (minimumStock < 0) {
    throw new Error('Minimum stock cannot be negative');
  }
  this.props.minimumStock = minimumStock;
}
```

**Frontend Validation**:
```typescript
const error = businessRules.inventory.validateMinimumStock(value);
if (error) {
  // Show error to user
}
```

---

## Product Management Rules

### Rule 3: SKU Uniqueness

**Rule**: Product SKU must be unique across all products.

**Business Rationale**: SKU is used as an alternate identifier. Duplicates would cause inventory tracking issues.

**Implementation**:

**Domain Layer**:
```typescript
const existingProduct = await repository.findBySKU(input.sku);
if (existingProduct) {
  throw new Error(`Product with SKU ${input.sku} already exists`);
}
```

**Frontend Validation**:
```typescript
const error = businessRules.product.validateSKU(sku);
// Checks:
// - Not empty
// - Minimum 3 characters
// - Backend will check uniqueness
```

**Error Message**: "This SKU is already in use. Product SKUs must be unique."

---

### Rule 4: Product Sales Channel Status

**Rule**: Product status must be one of: 'online sales', 'offline sales', 'omnichannel sales', 'inactive', or 'discontinued'.

**Business Rationale**: Products can be sold through different channels (online and/or offline) and this needs to be explicitly controlled.

**Status Definitions**:
- **Online Sales**: Product is available for sale through:
  - Retail website
  - Wholesale website (automatically displayed if stock is above wholesale threshold)
  - Mobile retail app (Android/iOS via React Native/Expo)
- **Offline Sales**: Product is available for sale through:
  - Point of Sales (POS) for retail sales
  - Sales invoice (for wholesale via salesperson)
- **Omnichannel Sales**: Product is available for both online and offline sales channels
- **Inactive**: Product does not display on both online and offline sales channels (temporarily unavailable)
- **Discontinued**: Product is no longer available for sale and cannot be restocked. Data is preserved in database but no longer indexed.

**Implementation**:
```typescript
export type ProductStatus =
  | 'online sales'
  | 'offline sales'
  | 'omnichannel sales'
  | 'inactive'
  | 'discontinued';

interface ProductProps {
  status: ProductStatus;
  // ... other props
}
```

**Frontend Validation**:
- All product forms must use dropdown with these 5 status options
- Display appropriate icons/badges for each status
- Discontinued products cannot be edited (except to change status)

**Business Rules**:
1. Online sales products automatically appear on wholesale website when stock > wholesale threshold
2. Discontinued products cannot have prices changed
3. Discontinued products cannot be restocked
4. Inactive products can be reactivated to any active status
5. Status changes must be logged for audit purposes

---

### Rule 5: Price Restrictions for Discontinued Products

**Rule**: Cannot change prices of discontinued products.

**Business Rationale**: Discontinued products should not have their prices modified to maintain historical data integrity.

**Implementation**:
```typescript
public changePrice(priceType: 'retail' | 'wholesale' | 'base', newPrice: number): void {
  if (this.props.status === 'discontinued') {
    throw new Error('Cannot change price of discontinued product');
  }
  // ... update price
}
```

**Frontend Validation**:
- Disable price fields when product status is 'discontinued'
- Show info message explaining why

**Error Message**: "Cannot change price of discontinued product. Please reactivate the product first."

---

### Rule 6: Stock Adjustments for Products

**Rule**: Stock can go negative (aligns with Inventory Rule #1).

**Business Rationale**: Product service allows negative for compatibility with POS first-pay-first-served model.

**Implementation**:
```typescript
// Stock value object allows negative
export class Stock extends ValueObject<number> {
  protected validate(value: number): void {
    // No minimum check - negative is allowed
    if (!Number.isFinite(value)) {
      throw new Error('Stock must be a finite number');
    }
  }
}
```

---

## Physical Attributes Rules

### Rule 7: Weight Validation

**Rule**:
- Weight cannot be negative
- Weight cannot exceed 100kg
- Weight must be finite

**Business Rationale**: Physical constraints for shipping and handling.

**Implementation**:
```typescript
protected validate(props: PhysicalAttributesProps): void {
  if (props.weight < 0) {
    throw new Error('Weight cannot be negative');
  }
  if (props.weight > 100) {
    throw new Error('Weight cannot exceed 100kg');
  }
  if (!Number.isFinite(props.weight)) {
    throw new Error('Weight must be a finite number');
  }
}
```

**Frontend Validation**:
```typescript
const errors = businessRules.product.validatePhysicalAttributes({
  weight: 2.5,
  length: 30,
  width: 20,
  height: 15,
});
```

**Error Messages**:
- "Weight cannot be negative"
- "Weight cannot exceed 100kg"

---

### Rule 8: Dimension Validation

**Rule**:
- Length, width, height must be positive
- No dimension can exceed 200cm
- All must be finite numbers

**Business Rationale**: Standard shipping limits. Oversized items require special handling.

**Implementation**:
```typescript
if (props.length <= 0 || props.width <= 0 || props.height <= 0) {
  throw new Error('Dimensions must be positive numbers');
}

const MAX_DIMENSION_CM = 200;
if (props.length > MAX_DIMENSION_CM || props.width > MAX_DIMENSION_CM || props.height > MAX_DIMENSION_CM) {
  throw new Error(`Dimensions cannot exceed ${MAX_DIMENSION_CM}cm per side`);
}
```

**Frontend Validation**: Same as weight validation.

**Error Message**: "Dimensions cannot exceed 200cm per side"

---

### Rule 9: Volume Weight Calculation

**Formula**: `(Length × Width × Height) / 5000 = Volume Weight (kg)`

**Business Rationale**: Shipping carriers charge based on whichever is higher: actual weight or volume weight.

**Implementation**:
```typescript
public getVolumeWeight(): number {
  return (this._value.length * this._value.width * this._value.height) / 5000;
}

public getChargeableWeight(): number {
  return Math.max(this._value.weight, this.getVolumeWeight());
}
```

**Usage**: When calculating shipping costs, always use `getChargeableWeight()`.

---

## Warehouse Management Rules

### Rule 10: Multi-Warehouse Product Allocation

**Rule**: Products, product bundles, and product variants must support multi-warehouse allocation. Stock must be tracked separately per warehouse.

**Business Rationale**:
- Businesses often operate multiple warehouse locations
- Each warehouse needs independent stock tracking for accurate inventory management
- Product bundles and variants must maintain warehouse-specific stock levels
- Enables location-based inventory visibility and stock transfers

**Implementation**:

**Product Level**:
- Products can be allocated to multiple warehouses simultaneously
- Each warehouse allocation tracks its own stock quantity
- Total product stock = sum of stock across all warehouses
- Product locations stored in `product_locations` table with warehouse reference

**Product Bundle Level**:
- Bundles can be assembled at specific warehouses
- Bundle stock tracked per warehouse location
- Bundle components must exist in the same warehouse
- Warehouse-specific bundle availability

**Product Variant Level**:
- Variants inherit multi-warehouse capability from parent product
- Each variant can have different stock levels per warehouse
- Variant locations tracked separately from base product
- Warehouse-specific variant pricing and availability

**Domain Layer**:
```typescript
// Product can have multiple locations
interface ProductLocation {
  productId: string;
  warehouseId: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
}

// Stock is aggregated from all warehouse locations
public getTotalStock(): number {
  return this.productLocations.reduce(
    (total, location) => total + location.quantity,
    0
  );
}

// Get stock at specific warehouse
public getWarehouseStock(warehouseId: string): number {
  const location = this.productLocations.find(
    loc => loc.warehouseId === warehouseId
  );
  return location?.quantity || 0;
}
```

**API Usage**:
```typescript
// Allocate product to warehouse
POST /api/product-locations
{
  "productId": "product-123",
  "warehouseId": "WH-001",
  "quantity": 100,
  "rack": "A1",
  "bin": "TOP",
  "zone": "Zone A",
  "aisle": "1"
}

// Get product stock by warehouse
GET /api/products/{productId}/locations
// Returns array of warehouse locations with quantities

// Transfer stock between warehouses
POST /api/inventory/transfer
{
  "productId": "product-123",
  "fromWarehouseId": "WH-001",
  "toWarehouseId": "WH-002",
  "quantity": 20
}
```

**Frontend Validation**:
- Product form must allow multiple warehouse selection
- Stock allocation UI must show warehouse breakdown
- Prevent negative stock at warehouse level (unless POS transaction)
- Warn when transferring more stock than available at source warehouse

**Warehouse Breakdown Requirements**:
- Product report page: Shows aggregate stock (no warehouse breakdown)
- Inventory report page: Shows detailed warehouse breakdown with:
  - Stock levels per warehouse
  - Stock alerts per warehouse
  - Expiration dates per warehouse location
- Product detail view: Shows all warehouse locations with quantities

**Business Rules**:
1. Product can exist in zero, one, or multiple warehouses
2. Stock transfers between warehouses must maintain stock integrity
3. Product bundles can only be created if all components exist in target warehouse
4. Product variants follow parent product's warehouse allocation rules
5. Expiration dates tracked per warehouse location (different batches may expire at different times)

---

### Rule 11: Product Stock Consistency Per Warehouse (UPDATED)

**Rule**: For EACH warehouse, the stock of a product in product_locations must match the total stock from product_uom_locations (converted to base units). Validation is done PER WAREHOUSE, not globally.

**Business Rationale**: Ensures data integrity and consistency between different stock tracking tables (product_locations and product_uom_locations) at each individual warehouse. The product location is the source of truth for warehouse-specific stock.

**Key Change**: Previous implementation validated global totals. New implementation validates stock consistency per warehouse, ensuring that each warehouse's product location stock equals the sum of its UOM location stocks (in base units).

**Implementation**:

**Validation Logic (Per Warehouse)**:
```typescript
// For each warehouse:
for (const warehouse of warehouses) {
  // Get product location stock at this warehouse (base units)
  const warehouseBaseStock = productLocation[warehouse].quantity;

  // Calculate total UOM stock at this warehouse (in base units)
  let totalUOMStockAtWarehouse = 0;
  for (const uom of productUOMs) {
    const uomLocation = getUOMLocation(uom.id, warehouse.id);
    if (uomLocation) {
      totalUOMStockAtWarehouse += uomLocation.quantity * uom.conversionFactor;
    }
  }

  // Validation: Warehouse stock must match
  if (warehouseBaseStock !== totalUOMStockAtWarehouse) {
    throw new Error(
      `Stock mismatch in ${warehouse.name}: ` +
      `Product location: ${warehouseBaseStock} ${baseUnit}, ` +
      `UOM locations: ${totalUOMStockAtWarehouse} ${baseUnit}`
    );
  }
}
```

**API Validation**:
```typescript
// When creating/updating product UOM locations
POST /api/uoms/locations
{
  "productUOMId": "uom-123",
  "warehouseId": "wh-jakarta",
  "quantity": 10
}

// Validation: Checks that total UOM stock at Jakarta warehouse doesn't exceed
// the product location stock at Jakarta warehouse

// When validating overall consistency
POST /api/products/:id/validate-stock-consistency

// Response (Per Warehouse):
{
  "isValid": true|false,
  "globalSummary": {
    "totalLocationStock": 500,
    "totalUOMStock": 500,
    "globalDifference": 0,
    "baseUnit": "PCS"
  },
  "warehouseValidation": [
    {
      "warehouseId": "wh-jakarta",
      "locationStock": 200,
      "uomStock": 200,
      "difference": 0,
      "isValid": true,
      "status": "valid",
      "statusMessage": "Stock totals match",
      "uomBreakdown": [
        {
          "uomCode": "BOX6",
          "quantity": 30,
          "conversionFactor": 6,
          "baseUnits": 180
        },
        {
          "uomCode": "PCS",
          "quantity": 20,
          "conversionFactor": 1,
          "baseUnits": 20
        }
      ]
    },
    {
      "warehouseId": "wh-cilangkap",
      "locationStock": 300,
      "uomStock": 305,
      "difference": -5,
      "isValid": false,
      "status": "uom_exceeds_location",
      "statusMessage": "UOM locations have 5 PCS more than product location"
    }
  ],
  "message": "Stock mismatch detected in 1 warehouse(s)"
}
```

**Frontend Validation**:
- Show real-time validation when editing warehouse allocations
- Display warning badge if any warehouse has mismatched totals
- Block form submission if validation fails for any warehouse
- Show detailed per-warehouse breakdown of stock and UOM allocations

**Error Messages (Using Dynamic Base Unit)**:
- ❌ "Stock validation failed for warehouse: Total UOM stock at this warehouse would be 205 KG, but product location stock is only 200 KG. Please adjust product location stock first or reduce UOM quantities."
- ⚠️ "Stock mismatch in Cilangkap warehouse. Product locations: 200 PCS, UOM locations: 205 PCS"
- ✅ "All warehouses have consistent stock totals"

**Business Rules**:
1. When adding UOM stock via product_uom_locations, it must not exceed the warehouse's product_locations stock (in base units)
2. When transferring stock between warehouses, both product_locations and product_uom_locations must be updated atomically
3. When removing UOM from a warehouse, corresponding base units should be removed from product_uom_locations
4. Validation runs automatically before any warehouse-specific stock operation completes
5. Product location is the source of truth for each warehouse's stock
6. Base units are dynamic (not always PCS) - can be KG, L, M, etc.

**Example Scenario (Using Dynamic Base Unit)**:
```typescript
Product: "Baby Bottle"
Base Unit: PCS

Warehouse Jakarta:
- product_locations: 100 PCS
- product_uom_locations: 16 BOX6 (16 × 6 = 96 PCS) + 4 PCS (4 × 1 = 4 PCS)
- Validation: 100 PCS (location) === 96 + 4 = 100 PCS (UOMs) ✅

Warehouse Cilangkap:
- product_locations: 200 PCS
- product_uom_locations: 30 BOX6 (30 × 6 = 180 PCS) + 25 PCS (25 × 1 = 25 PCS)
- Validation: 200 PCS (location) !== 180 + 25 = 205 PCS (UOMs) ❌ FAIL

Error: "Stock mismatch in Cilangkap warehouse. Product locations: 200 PCS, UOM locations: 205 PCS"

Product: "Baby Formula Powder"
Base Unit: KG (not PCS!)

Warehouse Jakarta:
- product_locations: 50 KG
- product_uom_locations: 100 BOX500G (100 × 0.5 = 50 KG)
- Validation: 50 KG (location) === 50 KG (UOMs) ✅

Warehouse Cilangkap:
- product_locations: 30 KG
- product_uom_locations: 15 CARTON2KG (15 × 2 = 30 KG)
- Validation: 30 KG (location) === 30 KG (UOMs) ✅
```

**Migration Note**:
The system now supports products with different base units (e.g., KG for weight-based products, L for liquids). All validation logic uses the product's `baseUnit` field, not hardcoded 'PCS'. Error messages dynamically display the correct base unit.

---

### Rule 12: Warehouse Code Format

**Rule**: Warehouse code must contain only uppercase letters, numbers, and hyphens.

**Business Rationale**: Standardized format for easy identification and system integration.

**Implementation**:
```typescript
const error = businessRules.warehouse.validateCode(code);
// Regex: /^[A-Z0-9-]+$/
```

**Error Message**: "Code must contain only uppercase letters, numbers, and hyphens"

**Examples**:
- ✅ Valid: `WH-001`, `WH-JAKARTA-01`, `WH001`
- ❌ Invalid: `wh-001` (lowercase), `WH_001` (underscore), `WH 001` (space)

---

### Rule 13: Warehouse Location Required Fields

**Rule**: Address line 1, city, province, and postal code are required.

**Business Rationale**: Minimum information needed for logistics and shipping.

**Implementation**:
```typescript
const errors = businessRules.warehouse.validateLocation({
  addressLine1: '123 Test Street',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
});
```

**Required Fields**:
- ✅ `addressLine1` - Street address
- ✅ `city` - City name
- ✅ `province` - Province/state
- ✅ `postalCode` - Postal/ZIP code
- ⚠️ `addressLine2` - Optional (suite, apartment)
- ⚠️ `country` - Optional (defaults to Indonesia)

---

## Price Management Rules

### Rule 14: Price Cannot Be Negative

**Rule**: All prices (base, retail, wholesale) must be non-negative.

**Business Rationale**: Negative prices don't make business sense.

**Implementation**:
```typescript
export class Money extends ValueObject<number> {
  protected validate(amount: number): void {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be a finite number');
    }
  }
}
```

**Frontend Validation**:
```typescript
const error = businessRules.product.validatePrice(price);
```

**Warning**: If price is 0, show warning but allow (might be intentional for free items).

---

## Event Business Rules

### Rule 15: Domain Events Must Be Published

**Rule**: All state-changing operations must publish domain events.

**Business Rationale**: Event-driven architecture enables:
- Audit trail
- Service-to-service communication
- Real-time updates
- Analytics

**Events Published**:

**Product Service**:
- `ProductCreated` - When product is created
- `StockAdjusted` - When product stock changes
- `PriceChanged` - When any price is updated
- `ProductDiscontinued` - When product is discontinued

**Inventory Service**:
- `WarehouseCreated` - When warehouse is created
- `InventoryCreated` - When inventory record is created
- `InventoryAdjusted` - When stock is adjusted (includes source field)

**Implementation**: Events are published after persistence but before response:
```typescript
await repository.save(product);
await eventPublisher.publishAll(product.getDomainEvents());
product.clearDomainEvents();
```

---

## Validation Hierarchy

### Where Rules Are Enforced

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Validation (First Line of Defense)              │
│    - Format validation (SKU format, code format)            │
│    - Range validation (weight < 100kg)                      │
│    - Required field validation                              │
│    - User gets immediate feedback                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer Validation (Second Line)                       │
│    - Input schema validation (Zod)                          │
│    - Type checking                                           │
│    - Basic business rules                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Layer Validation (Final Authority)                │
│    - Complex business rules                                  │
│    - Cross-entity validation                                 │
│    - Invariant enforcement                                   │
│    - THIS IS THE SOURCE OF TRUTH                            │
└─────────────────────────────────────────────────────────────┘
```

**Principle**: Frontend validation is for UX. Domain validation is for correctness.

---

## Rule Testing

### How to Test Business Rules

**1. Domain Layer Tests** (Unit tests):
```typescript
test('warehouse operation cannot create negative stock', () => {
  const inventory = Inventory.create({ ...});
  inventory.adjustIn(50);

  expect(() => {
    inventory.warehouseAdjustOut(70); // Only 50 available
  }).toThrow('Insufficient stock');
});

test('POS sale can create negative stock', () => {
  const inventory = Inventory.create({ ...});
  inventory.adjustIn(50);

  inventory.posSale(70); // Should not throw
  expect(inventory.getAvailableQuantity()).toBe(-20);
});
```

**2. API Tests** (Integration tests):
```bash
# See test-negative-stock-fix.js
# See test-e2e-complete-workflow.js
```

**3. E2E Tests** (User workflows):
```typescript
test('user cannot create warehouse adjustment with negative stock', async () => {
  // ... fill form
  // ... try to adjust 100 units (only 50 available)
  // ... expect error message
});
```

---

## Rule Exceptions

### When Rules Can Be Bypassed

**NEVER**: Business rules in the domain layer cannot be bypassed.

**Exception Handling**: If a rule needs to be relaxed, it must be:
1. Documented here
2. Approved by business stakeholders
3. Implemented in domain layer
4. Tested thoroughly

---

## Rule Change Process

### How to Add/Modify Business Rules

1. **Document** the rule in this file first
2. **Implement** in domain layer (aggregate/value object)
3. **Add** to use case if needed
4. **Update** frontend validation in `validation.ts`
5. **Write** tests for the rule
6. **Update** API documentation

### Example: Adding New Rule

```typescript
// 1. Document in BUSINESS_RULES.md
// Rule X: Products cannot be discontinued if they have active orders

// 2. Implement in domain
public discontinue(performedBy: string): void {
  if (this.hasActiveOrders()) {
    throw new Error('Cannot discontinue product with active orders');
  }
  this.props.status = 'discontinued';
  this.addDomainEvent(new ProductDiscontinued(...));
}

// 3. Update use case if needed
// 4. Add frontend validation
businessRules.product.canDiscontinue = (product) => {
  // Check with backend
};

// 5. Write tests
test('cannot discontinue product with active orders', () => {
  // ...
});
```

---

## Common Scenarios

### Scenario 1: POS Sale with Negative Stock

```typescript
// Customer buys 10 items, but only 5 in stock
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "warehouse-001",
  "quantity": 10,
  "movementType": "out",
  "source": "pos",  // ← Important!
  "reason": "POS Sale - Order #12345",
  "performedBy": "POS Terminal 1"
}

// Result: Stock goes to -5
// Movement record created with source='pos'
// Customer gets their purchase ✅
```

### Scenario 2: Warehouse Transfer

```typescript
// Transfer 20 units from WH-001 to WH-002
// Step 1: OUT from WH-001 (must have 20+ units)
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "WH-001",
  "quantity": 20,
  "movementType": "out",
  "source": "warehouse",  // ← Strict validation
  "reason": "Transfer to WH-002"
}

// Step 2: IN to WH-002
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "WH-002",
  "quantity": 20,
  "movementType": "in",
  "reason": "Received from WH-001"
}
```

### Scenario 3: Creating Product with Dimensions

```typescript
POST /api/products
{
  "barcode": "1234567890",
  "sku": "PROD-001",
  "name": "Test Product",
  "price": 50000,
  "retailPrice": 60000,
  "baseUnit": "PCS",
  // Physical attributes for shipping
  "weight": 2.5,   // 2.5 kg
  "length": 30,    // 30 cm
  "width": 20,     // 20 cm
  "height": 15     // 15 cm
}

// Validation:
// - Weight: 0 < weight ≤ 100 ✅
// - Dimensions: all > 0 and ≤ 200 ✅
// - Volume weight: (30×20×15)/5000 = 1.8 kg
// - Chargeable weight: max(2.5, 1.8) = 2.5 kg
```

---

## Troubleshooting

### "Insufficient stock for warehouse adjustment"

**Cause**: Trying to use `source='warehouse'` (or default) with quantity exceeding available stock.

**Solution**:
- For POS sales, use `source='pos'`
- For warehouse operations, check available stock first
- For transfers, ensure source warehouse has enough stock

### "Cannot change price of discontinued product"

**Cause**: Product status is 'discontinued'.

**Solution**: Reactivate product first, then change price.

### "SKU already exists"

**Cause**: Another product already uses this SKU.

**Solution**: Choose a different SKU. Use search to find the conflicting product.

### "Dimensions cannot exceed 200cm"

**Cause**: One or more dimensions > 200cm.

**Solution**: Either split into multiple packages or use special handling (not in standard system).

---

**Last Updated**: November 20, 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
