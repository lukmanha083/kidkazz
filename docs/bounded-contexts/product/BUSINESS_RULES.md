# Product Business Rules Documentation

## Overview

This document describes all business rules implemented in the Product Service. The Product Service is responsible for the product catalog, pricing, UOMs, variants, categories, and virtual bundles.

> **Critical Principle**: Product Service owns product metadata (name, SKU, barcode, prices, attributes). Stock quantities are owned by Inventory Service - Product Service MUST delegate all stock queries.

---

## Product Identification Rules

### Rule 1: SKU Uniqueness

**Rule**: Product SKU must be unique across all products in the system.

**Business Rationale**:
- SKU is the primary business identifier for products
- Used for inventory tracking, order processing, and reporting
- Duplicates would cause data integrity issues

**Implementation**:
```typescript
const existingProduct = await repository.findBySKU(input.sku);
if (existingProduct) {
  throw new Error(`Product with SKU ${input.sku} already exists`);
}
```

**Validation Rules**:
- Required field (cannot be empty)
- Minimum 3 characters
- Must be unique across all products
- Recommended format: `CATEGORY-SEQUENCE` (e.g., `BOT-001`, `DIA-012`)

**Error Message**: "This SKU is already in use. Product SKUs must be unique."

---

### Rule 2: Barcode Uniqueness

**Rule**: Product barcode must be unique across all products.

**Business Rationale**:
- Barcode is used for POS scanning and warehouse operations
- Duplicate barcodes would cause incorrect product identification
- Supports industry-standard barcodes (EAN-13, UPC-A, etc.)

**Implementation**:
```typescript
const existingProduct = await repository.findByBarcode(input.barcode);
if (existingProduct && existingProduct.id !== productId) {
  throw new Error(`Barcode ${input.barcode} is already assigned to another product`);
}
```

**Validation Rules**:
- Optional field (can be empty for internal products)
- If provided, must be unique
- Supports various formats: EAN-13, EAN-8, UPC-A, UPC-E, custom

**Error Message**: "This barcode is already assigned to another product."

---

### Rule 3: Base Unit UOM Barcode Sync

**Rule**: The base unit UOM (PCS, KG, L, M, etc.) must always have the same barcode as the product barcode.

**Business Rationale**:
- Base unit represents the smallest sellable/trackable unit
- Scanning product barcode at POS should identify the base unit
- Ensures consistency between product identification and UOM tracking
- Applies to ALL base unit types, not just PCS

**Implementation**:
```typescript
// When creating/updating product UOMs
export function syncBaseUnitBarcode(
  product: Product,
  productUOMs: ProductUOM[]
): ProductUOM[] {
  const baseUnitCode = product.baseUnit || "PCS";
  const baseUOMIndex = productUOMs.findIndex(u => u.uomCode === baseUnitCode);

  if (baseUOMIndex !== -1) {
    // Sync barcode with product barcode
    productUOMs[baseUOMIndex].barcode = product.barcode;
  }

  return productUOMs;
}
```

**Business Rules**:
1. Base unit UOM barcode always equals product barcode
2. Changing product barcode automatically updates base unit UOM barcode
3. Base unit UOM barcode field is read-only (inherited from product)
4. Non-base UOMs can have independent barcodes

**Examples**:
```typescript
// Standard product (PCS base unit)
Product: "Baby Bottle"
Barcode: "8991234567890"
Base Unit: PCS
→ PCS UOM barcode = "8991234567890" (same as product)
→ BOX6 UOM barcode = "8991234567891" (unique)

// Weight-based product (KG base unit)
Product: "Baby Formula Powder"
Barcode: "8992345678901"  // Represents 1 KG
Base Unit: KG
→ KG UOM barcode = "8992345678901" (same as product)
→ BAG500G UOM barcode = "8992345678902" (unique)
```

**Error Message**: "Base unit UOM barcode must match product barcode"

---

## Product Status Rules

### Rule 4: Product Sales Channel Status

**Rule**: Product status must be one of: 'online sales', 'offline sales', 'omnichannel sales', 'inactive', or 'discontinued'.

**Business Rationale**:
- Products can be sold through different channels
- Explicit control over where products appear
- Supports business strategy for channel-specific products

**Status Definitions**:

| Status | Online | Offline | Description |
|--------|--------|---------|-------------|
| **online sales** | ✅ | ❌ | Available on website, mobile apps |
| **offline sales** | ❌ | ✅ | Available at POS, sales invoice |
| **omnichannel sales** | ✅ | ✅ | Available everywhere |
| **inactive** | ❌ | ❌ | Temporarily unavailable |
| **discontinued** | ❌ | ❌ | Permanently removed from sale |

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
}
```

**Channel Visibility**:
- **Online Sales** includes:
  - Retail website
  - Wholesale website (if stock > wholesale threshold)
  - Mobile retail app (Android/iOS)
- **Offline Sales** includes:
  - Point of Sales (POS) for retail
  - Sales invoice (wholesale via salesperson)

---

### Rule 5: Discontinued Product Restrictions

**Rule**: Discontinued products cannot have their prices changed, cannot be restocked, and cannot be edited (except to change status).

**Business Rationale**:
- Maintains historical data integrity
- Prevents accidental sales of discontinued items
- Preserves audit trail

**Implementation**:
```typescript
public changePrice(priceType: 'retail' | 'wholesale' | 'base', newPrice: number): void {
  if (this.props.status === 'discontinued') {
    throw new Error('Cannot change price of discontinued product');
  }
  // ... update price
}

public restock(quantity: number): void {
  if (this.props.status === 'discontinued') {
    throw new Error('Cannot restock discontinued product');
  }
  // ... add stock
}

public update(changes: Partial<ProductProps>): void {
  if (this.props.status === 'discontinued' && !('status' in changes)) {
    throw new Error('Cannot edit discontinued product. Change status first.');
  }
  // ... apply changes
}
```

**Allowed Operations on Discontinued Products**:
- ✅ Change status (reactivate)
- ✅ View product details
- ✅ View historical orders
- ❌ Change price
- ❌ Add stock
- ❌ Edit other fields

**Error Messages**:
- "Cannot change price of discontinued product"
- "Cannot restock discontinued product"
- "Cannot edit discontinued product. Change status first."

---

### Rule 6: Status Transition Rules

**Rule**: Product status transitions must follow valid paths.

**Business Rationale**:
- Prevents invalid state changes
- Ensures proper workflow
- Maintains data consistency

**Valid Transitions**:
```
                    ┌──────────────┐
                    │  inactive    │
                    └──────┬───────┘
                           │ can reactivate
                           ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ online sales │◄──►│ omnichannel  │◄──►│ offline sales│
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │    can deactivate │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ discontinued │ (one-way, requires reactivation)
                    └──────────────┘
```

**Implementation**:
```typescript
const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  'online sales': ['offline sales', 'omnichannel sales', 'inactive', 'discontinued'],
  'offline sales': ['online sales', 'omnichannel sales', 'inactive', 'discontinued'],
  'omnichannel sales': ['online sales', 'offline sales', 'inactive', 'discontinued'],
  'inactive': ['online sales', 'offline sales', 'omnichannel sales', 'discontinued'],
  'discontinued': ['online sales', 'offline sales', 'omnichannel sales', 'inactive'],
};

public changeStatus(newStatus: ProductStatus): void {
  if (!VALID_TRANSITIONS[this.status].includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }
  this.status = newStatus;
  this.addDomainEvent(new ProductStatusChanged(this.id, this.status, newStatus));
}
```

---

## Pricing Rules

### Rule 7: Price Cannot Be Negative

**Rule**: All prices (base, retail, wholesale, cost) must be non-negative.

**Business Rationale**:
- Negative prices don't make business sense
- Zero price is allowed for free items or promotions

**Implementation**:
```typescript
export class Money extends ValueObject<number> {
  protected validate(amount: number): void {
    if (amount < 0) {
      throw new Error('Price cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Price must be a finite number');
    }
  }
}
```

**Price Types**:
- `basePrice` - Cost/purchase price (internal)
- `retailPrice` - B2C selling price
- `wholesalePrice` - B2B selling price
- `costPrice` - Manufacturing/procurement cost

**Warning**: If price is 0, show warning but allow (might be intentional).

**Error Message**: "Price cannot be negative"

---

### Rule 8: Wholesale Price Validation

**Rule**: Wholesale price should typically be less than retail price.

**Business Rationale**:
- Wholesale customers buy in bulk and expect discounts
- Higher wholesale than retail indicates potential data entry error

**Implementation**:
```typescript
public validatePricing(): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (this.wholesalePrice > this.retailPrice) {
    warnings.push({
      field: 'wholesalePrice',
      message: 'Wholesale price is higher than retail price. Is this intentional?',
      severity: 'warning'
    });
  }

  if (this.retailPrice < this.costPrice) {
    warnings.push({
      field: 'retailPrice',
      message: 'Retail price is below cost price. This will result in a loss.',
      severity: 'warning'
    });
  }

  return warnings;
}
```

**Note**: These are warnings, not errors. Business may have valid reasons.

---

### Rule 9: Minimum Order Quantity for Wholesale

**Rule**: Wholesale orders require minimum order quantity per product.

**Business Rationale**:
- Wholesale pricing is volume-based
- Prevents small orders at wholesale prices
- Configurable per product

**Implementation**:
```typescript
interface ProductProps {
  minimumOrderQuantity: number;  // For wholesale
}

public validateWholesaleOrder(quantity: number): void {
  if (quantity < this.minimumOrderQuantity) {
    throw new Error(
      `Minimum order quantity for wholesale is ${this.minimumOrderQuantity} units`
    );
  }
}
```

**Default**: 1 (no minimum) unless specified.

---

## UOM Rules

### Rule 10: Base Unit Required

**Rule**: Every product must have a base unit defined.

**Business Rationale**:
- Base unit is the fundamental tracking unit
- All inventory operations convert to base units
- Enables consistent stock calculations

**Implementation**:
```typescript
interface ProductProps {
  baseUnit: string;  // PCS, KG, L, M, etc.
}

public constructor(props: ProductProps) {
  if (!props.baseUnit) {
    throw new Error('Base unit is required');
  }
  // Default to PCS if not specified
  this.baseUnit = props.baseUnit || 'PCS';
}
```

**Common Base Units**:
- `PCS` - Pieces (default)
- `KG` - Kilogram
- `L` - Liter
- `M` - Meter

**Error Message**: "Base unit is required"

---

### Rule 11: UOM Conversion Factor

**Rule**: Base unit has conversion factor of 1. All other UOMs have conversion factor > 0.

**Business Rationale**:
- Base unit is the reference point
- Conversion factor defines relationship to base unit
- Enables selling in different package sizes

**Implementation**:
```typescript
interface ProductUOM {
  uomCode: string;
  uomName: string;
  conversionFactor: number;  // Relative to base unit
  barcode?: string;
}

// Validation
if (isBaseUnit && conversionFactor !== 1) {
  throw new Error('Base unit must have conversion factor of 1');
}

if (!isBaseUnit && conversionFactor <= 0) {
  throw new Error('Conversion factor must be greater than 0');
}
```

**Examples**:
```typescript
Product: "Baby Bottle" (Base Unit: PCS)
UOMs:
- PCS: conversionFactor = 1 (base unit)
- BOX6: conversionFactor = 6 (1 box = 6 pieces)
- CARTON18: conversionFactor = 18 (1 carton = 18 pieces)

Product: "Baby Formula" (Base Unit: KG)
UOMs:
- KG: conversionFactor = 1 (base unit)
- BAG500G: conversionFactor = 0.5 (1 bag = 0.5 kg)
- CARTON2KG: conversionFactor = 2 (1 carton = 2 kg)
```

---

### Rule 12: UOM Code Uniqueness Per Product

**Rule**: UOM codes must be unique within a product.

**Business Rationale**:
- Prevents duplicate UOM definitions
- Each UOM code represents a specific package size

**Implementation**:
```typescript
public addUOM(uom: ProductUOM): void {
  const existing = this.uoms.find(u => u.uomCode === uom.uomCode);
  if (existing) {
    throw new Error(`UOM ${uom.uomCode} already exists for this product`);
  }
  this.uoms.push(uom);
}
```

**Error Message**: "UOM {code} already exists for this product"

---

## Physical Attributes Rules

### Rule 13: Weight Validation

**Rule**: Weight must be non-negative and cannot exceed 100kg.

**Business Rationale**:
- Physical constraints for shipping and handling
- Standard shipping limits
- Heavy items may require special handling

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

**Error Messages**:
- "Weight cannot be negative"
- "Weight cannot exceed 100kg"

---

### Rule 14: Dimension Validation

**Rule**: Length, width, height must be positive and cannot exceed 200cm.

**Business Rationale**:
- Standard shipping limits
- Oversized items require special handling
- Enables accurate shipping cost calculation

**Implementation**:
```typescript
const MAX_DIMENSION_CM = 200;

if (props.length <= 0 || props.width <= 0 || props.height <= 0) {
  throw new Error('Dimensions must be positive numbers');
}

if (props.length > MAX_DIMENSION_CM ||
    props.width > MAX_DIMENSION_CM ||
    props.height > MAX_DIMENSION_CM) {
  throw new Error(`Dimensions cannot exceed ${MAX_DIMENSION_CM}cm per side`);
}
```

**Error Message**: "Dimensions cannot exceed 200cm per side"

---

### Rule 15: Volume Weight Calculation

**Rule**: Volume weight = (Length × Width × Height) / 5000. Chargeable weight = max(actual weight, volume weight).

**Business Rationale**:
- Shipping carriers charge based on higher of actual or volume weight
- Prevents undercharging for light but bulky items
- Industry-standard calculation

**Implementation**:
```typescript
public getVolumeWeight(): number {
  return (this.length * this.width * this.height) / 5000;
}

public getChargeableWeight(): number {
  return Math.max(this.weight, this.getVolumeWeight());
}
```

**Example**:
```typescript
// Light but bulky product
Actual weight: 2.5 kg
Dimensions: 30cm × 20cm × 15cm
Volume weight: (30 × 20 × 15) / 5000 = 1.8 kg
Chargeable weight: max(2.5, 1.8) = 2.5 kg

// Heavy but compact product
Actual weight: 5 kg
Dimensions: 10cm × 10cm × 10cm
Volume weight: (10 × 10 × 10) / 5000 = 0.2 kg
Chargeable weight: max(5, 0.2) = 5 kg
```

---

## Variant Rules

### Rule 16: Variant SKU Uniqueness

**Rule**: Variant SKUs must be unique across all variants (not just within parent product).

**Business Rationale**:
- Variants are independently trackable items
- SKU is used for inventory and order processing
- Global uniqueness prevents confusion

**Implementation**:
```typescript
const existingVariant = await repository.findVariantBySKU(input.sku);
if (existingVariant && existingVariant.id !== variantId) {
  throw new Error(`Variant SKU ${input.sku} already exists`);
}
```

**Error Message**: "Variant SKU already exists"

---

### Rule 17: Variant Inherits Parent Status

**Rule**: Variant status cannot be more permissive than parent product status.

**Business Rationale**:
- If parent is inactive/discontinued, variants should follow
- Prevents selling variants of unavailable products
- Maintains consistency

**Implementation**:
```typescript
public setVariantStatus(variantId: string, status: VariantStatus): void {
  if (this.status === 'discontinued' && status !== 'inactive') {
    throw new Error('Cannot activate variant of discontinued product');
  }
  if (this.status === 'inactive' && status === 'active') {
    throw new Error('Cannot activate variant while parent product is inactive');
  }

  const variant = this.variants.find(v => v.id === variantId);
  variant.status = status;
}
```

**Error Messages**:
- "Cannot activate variant of discontinued product"
- "Cannot activate variant while parent product is inactive"

---

### Rule 18: Variant Attribute Requirements

**Rule**: Variants must have at least one distinguishing attribute (size, color, etc.).

**Business Rationale**:
- Variants represent product variations
- Without attributes, they're duplicate products
- Enables proper variant selection in UI

**Implementation**:
```typescript
public addVariant(variant: ProductVariant): void {
  if (!variant.attributes || Object.keys(variant.attributes).length === 0) {
    throw new Error('Variant must have at least one attribute (e.g., size, color)');
  }

  // Check for duplicate attribute combination
  const duplicate = this.variants.find(v =>
    JSON.stringify(v.attributes) === JSON.stringify(variant.attributes)
  );
  if (duplicate) {
    throw new Error('A variant with these attributes already exists');
  }

  this.variants.push(variant);
}
```

**Error Messages**:
- "Variant must have at least one attribute"
- "A variant with these attributes already exists"

---

## Category Rules

### Rule 19: Category Hierarchy

**Rule**: Categories support hierarchical structure (parent-child relationships).

**Business Rationale**:
- Enables organized product catalog
- Supports navigation and filtering
- Standard e-commerce pattern

**Implementation**:
```typescript
interface Category {
  id: string;
  name: string;
  parentId: string | null;  // null = top-level
  level: number;            // 0 = top, 1 = sub, etc.
  path: string;             // Full path: "Baby/Feeding/Bottles"
}

public addSubCategory(parent: Category, child: Category): void {
  child.parentId = parent.id;
  child.level = parent.level + 1;
  child.path = `${parent.path}/${child.name}`;
}
```

---

### Rule 20: Category Deletion Restrictions

**Rule**: Categories with products or subcategories cannot be deleted.

**Business Rationale**:
- Prevents orphaned products
- Maintains catalog integrity
- Must reassign or delete children first

**Implementation**:
```typescript
public deleteCategory(categoryId: string): void {
  const hasProducts = await this.productRepo.countByCategory(categoryId) > 0;
  if (hasProducts) {
    throw new Error('Cannot delete category with products. Reassign products first.');
  }

  const hasSubcategories = await this.categoryRepo.countChildren(categoryId) > 0;
  if (hasSubcategories) {
    throw new Error('Cannot delete category with subcategories. Delete subcategories first.');
  }

  await this.categoryRepo.delete(categoryId);
}
```

**Error Messages**:
- "Cannot delete category with products"
- "Cannot delete category with subcategories"

---

## Virtual Bundle Rules

### Rule 21: Virtual Bundle Ownership

**Rule**: Virtual bundle definitions (composition) are owned by Product Service. Stock is calculated by Inventory Service.

**Business Rationale**:
- Bundle is a product concept (what components make up the bundle)
- Stock is an inventory concept (how many can be assembled)
- Separation of concerns

**Implementation**:
```typescript
// Product Service - Bundle definition
interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  bundlePrice: number;
  discountPercentage: number;
  status: 'active' | 'inactive';
  // NO availableStock field!
}

interface BundleItem {
  bundleId: string;
  productId: string;
  quantity: number;  // How many of this product in bundle
}

// Stock is fetched from Inventory Service
app.get('/api/bundles/:id/available-stock', async (c) => {
  // Delegate to Inventory Service for stock calculation
  return c.env.INVENTORY_SERVICE.fetch(
    new Request(`http://inventory-service/api/bundles/${bundleId}/available-stock`)
  );
});
```

---

### Rule 22: Bundle Component Validation

**Rule**: Bundle components must be active products.

**Business Rationale**:
- Cannot create bundle with discontinued products
- Ensures bundle can be fulfilled
- Maintains consistency

**Implementation**:
```typescript
public addBundleComponent(bundleId: string, productId: string, quantity: number): void {
  const product = await this.productRepo.findById(productId);

  if (!product) {
    throw new Error('Component product not found');
  }

  if (product.status === 'discontinued') {
    throw new Error('Cannot add discontinued product to bundle');
  }

  if (product.status === 'inactive') {
    throw new Error('Cannot add inactive product to bundle');
  }

  await this.bundleRepo.addComponent(bundleId, productId, quantity);
}
```

**Error Messages**:
- "Cannot add discontinued product to bundle"
- "Cannot add inactive product to bundle"

---

### Rule 23: Bundle Price Validation

**Rule**: Bundle price should typically be less than sum of component prices (discount).

**Business Rationale**:
- Bundles are usually offered at a discount
- Price higher than components indicates error

**Implementation**:
```typescript
public validateBundlePrice(bundle: ProductBundle): ValidationWarning[] {
  const componentTotal = bundle.items.reduce((sum, item) => {
    const product = this.products.get(item.productId);
    return sum + (product.retailPrice * item.quantity);
  }, 0);

  const warnings: ValidationWarning[] = [];

  if (bundle.bundlePrice >= componentTotal) {
    warnings.push({
      field: 'bundlePrice',
      message: `Bundle price (${bundle.bundlePrice}) is not less than component total (${componentTotal}). Is this intentional?`,
      severity: 'warning'
    });
  }

  return warnings;
}
```

---

## Location Rules

### Rule 24: Product Location Delegation

**Rule**: Physical location details (rack, bin, zone, aisle) are managed through Inventory Service, not Product Service.

**Business Rationale**:
- Location is an inventory/warehouse concept
- Product Service only tracks which warehouses have the product
- Detailed location is warehouse staff concern

**Implementation**:
```typescript
// Product Service - Simplified
interface ProductLocation {
  productId: string;
  warehouseId: string;
  // NO rack, bin, zone, aisle - these are in Inventory Service
}

// Inventory Service - Full details
interface InventoryLocation {
  inventoryId: string;
  warehouseId: string;
  rack: string;
  bin: string;
  zone: string;
  aisle: string;
}
```

---

## Event Rules

### Rule 25: Product Events

**Rule**: Product state changes must publish domain events.

**Business Rationale**:
- Enables event-driven architecture
- Other services can react to changes
- Maintains audit trail

**Events Published**:
- `ProductCreated` - New product added
- `ProductUpdated` - Product details changed
- `ProductStatusChanged` - Status transition
- `ProductDiscontinued` - Product discontinued
- `PriceChanged` - Any price updated
- `VariantAdded` - New variant created
- `VariantRemoved` - Variant deleted
- `BundleCreated` - New bundle defined
- `BundleUpdated` - Bundle composition changed

**Implementation**:
```typescript
public discontinue(performedBy: string): void {
  this.status = 'discontinued';
  this.addDomainEvent(new ProductDiscontinued({
    productId: this.id,
    sku: this.sku,
    name: this.name,
    performedBy,
    timestamp: new Date()
  }));
}
```

---

## Validation Hierarchy

### Where Rules Are Enforced

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Validation (First Line of Defense)              │
│    - SKU format (minimum 3 characters)                      │
│    - Price format (non-negative)                            │
│    - Required fields                                        │
│    - User gets immediate feedback                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer Validation (Second Line)                       │
│    - Input schema validation (Zod)                          │
│    - Type checking                                          │
│    - Basic format validation                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Layer Validation (Final Authority)                │
│    - SKU uniqueness check                                   │
│    - Status transition rules                                │
│    - Business rule enforcement                              │
│    - THIS IS THE SOURCE OF TRUTH                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: Creating a Product with Variants

```typescript
// Step 1: Create product
POST /api/products
{
  "name": "Baby Bottle",
  "sku": "BOT-001",
  "barcode": "8991234567890",
  "baseUnit": "PCS",
  "retailPrice": 50000,
  "wholesalePrice": 45000,
  "status": "omnichannel sales"
}

// Step 2: Add UOMs
POST /api/products/{productId}/uoms
{
  "uomCode": "BOX6",
  "uomName": "Box of 6",
  "conversionFactor": 6,
  "barcode": "8991234567891"
}

// Step 3: Add variants
POST /api/products/{productId}/variants
{
  "sku": "BOT-001-BLU-S",
  "name": "Baby Bottle - Blue Small",
  "attributes": {
    "color": "Blue",
    "size": "Small"
  },
  "retailPrice": 50000
}
```

### Scenario 2: Discontinuing a Product

```typescript
// Step 1: Check for active orders
GET /api/products/{productId}/active-orders

// Step 2: If no active orders, discontinue
PATCH /api/products/{productId}/status
{
  "status": "discontinued",
  "reason": "Product line retired"
}

// Step 3: All variants automatically become inactive
// Step 4: ProductDiscontinued event published
// Step 5: Other services react (remove from catalog, etc.)
```

### Scenario 3: Creating a Bundle

```typescript
// Step 1: Create bundle
POST /api/bundles
{
  "bundleName": "Baby Starter Kit",
  "bundleSKU": "BUN-STARTER-001",
  "bundlePrice": 200000,  // Discounted from component total
  "discountPercentage": 15,
  "status": "active"
}

// Step 2: Add components
POST /api/bundles/{bundleId}/items
{
  "items": [
    { "productId": "prod-bottle", "quantity": 2 },
    { "productId": "prod-diaper", "quantity": 1 },
    { "productId": "prod-wipes", "quantity": 3 }
  ]
}

// Step 3: Get available stock (delegated to Inventory Service)
GET /api/bundles/{bundleId}/available-stock
// Returns: { "availableStock": 20, "limitingComponent": "Diaper Pack" }
```

---

## Troubleshooting

### "SKU already exists"

**Cause**: Another product has the same SKU.

**Solution**:
- Search for existing product with that SKU
- Choose a different, unique SKU
- Follow naming convention: CATEGORY-SEQUENCE

### "Cannot change price of discontinued product"

**Cause**: Product is discontinued.

**Solution**:
- Reactivate product first
- Then change price
- Consider if product should remain discontinued

### "Weight cannot exceed 100kg"

**Cause**: Weight value too high.

**Solution**:
- Verify weight is in kilograms (not grams)
- If product genuinely exceeds 100kg, contact admin for special handling

### "Variant must have at least one attribute"

**Cause**: Trying to create variant without size/color/etc.

**Solution**:
- Add at least one attribute (size, color, material, etc.)
- If no variation needed, update the main product instead

### "Cannot add discontinued product to bundle"

**Cause**: Trying to add discontinued product as bundle component.

**Solution**:
- Choose an active product
- Or reactivate the discontinued product first

---

## Rule Testing

### Unit Tests for Domain Rules

```typescript
describe('Product', () => {
  it('should not allow negative price', () => {
    expect(() => {
      Product.create({ retailPrice: -100 });
    }).toThrow('Price cannot be negative');
  });

  it('should not allow price change on discontinued product', () => {
    const product = Product.create({ status: 'discontinued' });

    expect(() => {
      product.changePrice('retail', 50000);
    }).toThrow('Cannot change price of discontinued product');
  });

  it('should sync base unit barcode with product barcode', () => {
    const product = Product.create({
      barcode: '8991234567890',
      baseUnit: 'PCS'
    });

    const pcsUOM = product.uoms.find(u => u.uomCode === 'PCS');
    expect(pcsUOM.barcode).toBe('8991234567890');
  });
});

describe('ProductVariant', () => {
  it('should require at least one attribute', () => {
    const product = Product.create({});

    expect(() => {
      product.addVariant({ sku: 'VAR-001', attributes: {} });
    }).toThrow('Variant must have at least one attribute');
  });
});
```

---

## Rule Change Process

### How to Add/Modify Product Rules

1. **Document** the rule in this file first
2. **Implement** in domain layer (Product/Variant/Bundle entity)
3. **Add** validation to use cases
4. **Update** frontend validation
5. **Write** tests for the rule
6. **Update** API documentation
7. **Notify** product team of changes

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
**Related Docs**:
- [Product Service Implementation Plan](./PRODUCT_SERVICE_IMPLEMENTATION_PLAN.md)
- [Inventory Business Rules](../inventory/BUSINESS_RULES.md)
- [DDD Business Rules (Main)](../../ddd/BUSINESS_RULES.md)
