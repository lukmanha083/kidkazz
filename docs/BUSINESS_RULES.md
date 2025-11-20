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

### Rule 4: Price Restrictions for Discontinued Products

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

### Rule 5: Stock Adjustments for Products

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

### Rule 6: Weight Validation

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

### Rule 7: Dimension Validation

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

### Rule 8: Volume Weight Calculation

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

### Rule 9: Warehouse Code Format

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

### Rule 10: Warehouse Location Required Fields

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

### Rule 11: Price Cannot Be Negative

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

### Rule 12: Domain Events Must Be Published

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
