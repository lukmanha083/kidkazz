# POS Variant Selection Workflow

 

**Version**: 1.0

**Date**: 2025-11-25

**Status**: 📋 Design Document for Future Implementation

 

---

 

## Overview

 

This document defines the workflow for handling product variants in the Point of Sale (POS) system. It addresses the critical question:

 

> **"When a cashier scans a product barcode that has variants, which price should be used?"**

 

**Answer**: The system should prompt the cashier to select the specific variant, and use the **variant's price**, not the parent product's price.

 

---

 

## Current System Architecture

 

### Products

- **Have barcode**: Yes (unique identifier for scanning)

- **Have price**: Yes (base price)

- **Have stock**: Yes (aggregate across all variants)

- **Have variants**: Optional (0 or more variants)

 

### Product Variants

- **Have barcode**: No (use parent product's barcode)

- **Have price**: Yes (variant-specific price, can differ from parent)

- **Have stock**: Yes (variant-specific stock)

- **Variant types**: Color, Size, Material, Style

 

**Example:**

```

Product: "Baby Bottle Set" (Barcode: 8901234567890, Price: Rp 30,000)

├─ Variant: "Pink" (Price: Rp 29,000, Stock: 50)

├─ Variant: "Blue" (Price: Rp 29,000, Stock: 95)

└─ Variant: "Yellow" (Price: Rp 32,000, Stock: 30) // Premium color

```

 

---

 

## POS Workflow

 

### Scenario 1: Product Without Variants (Simple Flow)

 

**Steps:**

1. Cashier scans product barcode

2. System checks: Product has variants? **No**

3. System adds product to cart with parent product price

4. Done ✅

 

**Example:**

```

Scan: 8901234567891 (Kids Backpack - No variants)

Result: Add "Kids Backpack" to cart at Rp 45,000

```

 

---

 

### Scenario 2: Product With Variants (Variant Selection Required)

 

**Steps:**

1. Cashier scans product barcode

2. System checks: Product has variants? **Yes**

3. System displays variant selection modal/dialog

4. Cashier selects specific variant (e.g., "Pink")

5. System adds variant to cart with **variant price**

6. Done ✅

 

**Example:**

```

Scan: 8901234567890 (Baby Bottle Set)

System: "This product has 3 variants. Please select:"

  [Pink - Rp 29,000] [Stock: 50]

  [Blue - Rp 29,000] [Stock: 95]

  [Yellow - Rp 32,000] [Stock: 30] ← Premium

Cashier selects: "Yellow"

Result: Add "Baby Bottle Set - Yellow" to cart at Rp 32,000

```

 

---

 

## Variant Selection UI Design

 

### Option A: Modal Dialog (Recommended for Desktop POS)

 

```

┌───────────────────────────────────────────────────┐

│  Select Product Variant                           │

├───────────────────────────────────────────────────┤

│                                                   │

│  Product: Baby Bottle Set                         │

│  SKU: BB-001                                      │

│                                                   │

│  Please select a variant:                         │

│                                                   │

│  ┌─────────────────────────────────────────┐     │

│  │ ○ Pink                                   │     │

│  │   Price: Rp 29,000   Stock: 50          │     │

│  └─────────────────────────────────────────┘     │

│                                                   │

│  ┌─────────────────────────────────────────┐     │

│  │ ○ Blue                                   │     │

│  │   Price: Rp 29,000   Stock: 95          │     │

│  └─────────────────────────────────────────┘     │

│                                                   │

│  ┌─────────────────────────────────────────┐     │

│  │ ○ Yellow (Premium)                       │     │

│  │   Price: Rp 32,000   Stock: 30          │     │

│  └─────────────────────────────────────────┘     │

│                                                   │

│  [Cancel]                    [Add to Cart]       │

└───────────────────────────────────────────────────┘

```

 

### Option B: Quick Select Buttons (For Touch Screen POS)

 

```

┌───────────────────────────────────────────────────┐

│  Baby Bottle Set - Select Variant                 │

├───────────────────────────────────────────────────┤

│                                                   │

│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │

│  │    Pink     │  │    Blue     │  │ Yellow  │  │

│  │             │  │             │  │         │  │

│  │ Rp 29,000   │  │ Rp 29,000   │  │ Rp 32k  │  │

│  │ Stock: 50   │  │ Stock: 95   │  │ Stk: 30 │  │

│  └─────────────┘  └─────────────┘  └─────────┘  │

│                                                   │

│  [Cancel]                                         │

└───────────────────────────────────────────────────┘

```

 

### Option C: Dropdown (For Compact UI)

 

```

Product: Baby Bottle Set

 

Variant: [Select variant ▼]

         ├─ Pink (Rp 29,000) - Stock: 50

         ├─ Blue (Rp 29,000) - Stock: 95

         └─ Yellow (Rp 32,000) - Stock: 30

 

Price: Rp 0 → Rp 32,000 (after selection)

```

 

---

 

## Price Determination Logic

 

### Rule 1: Always Use Variant Price When Available

 

```typescript

function getPriceForPOS(product: Product, selectedVariant?: ProductVariant): number {

  if (selectedVariant) {

    return selectedVariant.price; // ✅ Use variant price

  }

  return product.price; // Fallback to product price

}

```

 

### Rule 2: Validate Stock Before Adding to Cart

 

```typescript

function canAddToCart(variant: ProductVariant, quantity: number): boolean {

  if (variant.status !== 'active') {

    return false; // Inactive variants cannot be sold

  }

 

  if (variant.stock < quantity) {

    return false; // Insufficient stock

  }

 

  return true;

}

```

 

### Rule 3: Display Stock Availability

 

- **In Stock (> 10)**: Show as "In Stock" (green badge)

- **Low Stock (1-10)**: Show as "Low Stock" (orange badge) + exact count

- **Out of Stock (0)**: Show as "Out of Stock" (red badge) + disable selection

 

---

 

## API Requirements for POS

 

### 1. Get Product with Variants for POS

 

**Endpoint:** `GET /api/products/:id/for-pos`

 

```typescript

// Request

GET /api/products/prod-123/for-pos

 

// Response

{

  "product": {

    "id": "prod-123",

    "name": "Baby Bottle Set",

    "sku": "BB-001",

    "barcode": "8901234567890",

    "price": 30000,

    "image": "https://...",

    "hasVariants": true

  },

  "variants": [

    {

      "id": "var-1",

      "variantName": "Pink",

      "variantSKU": "BB-001-PNK",

      "variantType": "Color",

      "price": 29000,

      "stock": 50,

      "status": "active",

      "image": "https://..."

    },

    {

      "id": "var-2",

      "variantName": "Blue",

      "variantSKU": "BB-001-BLU",

      "variantType": "Color",

      "price": 29000,

      "stock": 95,

      "status": "active",

      "image": "https://..."

    },

    {

      "id": "var-3",

      "variantName": "Yellow",

      "variantSKU": "BB-001-YLW",

      "variantType": "Color",

      "price": 32000,

      "stock": 30,

      "status": "active",

      "image": "https://...",

      "tags": ["premium"]

    }

  ]

}

```

 

### 2. Search Product by Barcode

 

**Endpoint:** `GET /api/products/search?barcode={barcode}`

 

```typescript

// Request

GET /api/products/search?barcode=8901234567890

 

// Response

{

  "found": true,

  "product": {

    "id": "prod-123",

    "name": "Baby Bottle Set",

    "barcode": "8901234567890",

    "hasVariants": true,

    "variantCount": 3

  }

}

```

 

---

 

## POS Cart Data Structure

 

### Cart Item with Variant

 

```typescript

interface POSCartItem {

  id: string; // Cart item ID (unique per cart entry)

  productId: string;

  productName: string;

  productSKU: string;

  productBarcode: string;

 

  // Variant information (if applicable)

  variantId?: string;

  variantName?: string;

  variantSKU?: string;

  variantType?: 'Color' | 'Size' | 'Material' | 'Style';

 

  // Pricing

  price: number; // The price used (variant price or product price)

  quantity: number;

  subtotal: number; // price × quantity

 

  // Display

  image?: string;

  displayName: string; // "Baby Bottle Set - Pink"

}

```

 

**Example Cart:**

```json

[

  {

    "id": "cart-item-1",

    "productId": "prod-123",

    "productName": "Baby Bottle Set",

    "productSKU": "BB-001",

    "productBarcode": "8901234567890",

    "variantId": "var-3",

    "variantName": "Yellow",

    "variantSKU": "BB-001-YLW",

    "variantType": "Color",

    "price": 32000,

    "quantity": 2,

    "subtotal": 64000,

    "displayName": "Baby Bottle Set - Yellow"

  },

  {

    "id": "cart-item-2",

    "productId": "prod-456",

    "productName": "Kids Backpack",

    "productSKU": "BP-002",

    "productBarcode": "8901234567891",

    "price": 45000,

    "quantity": 1,

    "subtotal": 45000,

    "displayName": "Kids Backpack"

  }

]

```

 

---

 

## Stock Deduction Logic

 

### When Order is Completed

 

**For Product Without Variants:**

```typescript

// Deduct from product.stock

await productApi.updateStock(productId, newStock);

```

 

**For Product With Variants:**

```typescript

// Deduct from variant.stock (NOT product.stock)

await variantApi.updateStock(variantId, newStock);

 

// Also update product aggregate stock

await productApi.updateStock(productId, newProductStock);

```

 

**Important Rule:**

When selling a variant, you must update BOTH:

1. The variant's stock (specific variant)

2. The parent product's aggregate stock (sum of all variants)

 

---

 

## Business Rules

 

### Rule 1: Variant Price Independence

- Each variant can have its own price

- Variant price can be higher or lower than parent product price

- Price differences should reflect value (e.g., premium colors, larger sizes)

 

### Rule 2: Mandatory Variant Selection

- If product has variants, cashier MUST select one

- Cannot add parent product to cart without variant selection

- Exception: If only 1 active variant exists, auto-select it

 

### Rule 3: Stock Validation

- Check variant stock before adding to cart

- Show real-time stock availability

- Prevent overselling (quantity > available stock)

 

### Rule 4: Inactive Variants

- Variants with status = 'inactive' should not appear in POS

- Only show active variants in selection dialog

 

### Rule 5: Price Display

- Always show currency symbol (Rp)

- Format numbers with thousand separators (Rp 32,000)

- Highlight price differences (if variant price differs from base)

 

---

 

## UX Considerations

 

### Fast Checkout Flow

 

**Scenario**: Busy store, long queue

 

**Optimization:**

1. Use keyboard shortcuts for variant selection (1, 2, 3, etc.)

2. Remember last selected variant per customer session

3. Default to most popular variant

4. Allow barcode scanning even during variant selection (queue next scan)

 

**Example:**

```

Cashier scans: 8901234567890

Dialog appears: [1] Pink  [2] Blue  [3] Yellow

Cashier presses: "2" (Blue selected)

Auto-added to cart

Cashier scans next item immediately

```

 

### Variant Images

 

- Show variant-specific images if available

- Fallback to product image if variant has no image

- Helps cashier visually confirm the correct variant

 

### Search by Variant SKU

 

- Allow manual SKU entry: "BB-001-YLW"

- Directly add that specific variant to cart

- Useful when barcode scanner is not available

 

---

 

## Implementation Phases

 

### Phase 1: Basic Variant Support

- ✅ Database schema (variants table) - Already exists

- ✅ API endpoints for variants - Already exists

- ⏳ POS product search by barcode

- ⏳ Variant selection modal UI

- ⏳ Cart management with variants

 

### Phase 2: Enhanced UX

- ⏳ Keyboard shortcuts for variant selection

- ⏳ Variant images display

- ⏳ Stock availability indicators

- ⏳ Auto-select if only 1 variant

 

### Phase 3: Advanced Features

- ⏳ Recently selected variants memory

- ⏳ Popular variants suggestions

- ⏳ Variant search by name/SKU

- ⏳ Batch variant selection (add multiple variants at once)

 

### Phase 4: Analytics

- ⏳ Track which variants sell most

- ⏳ Variant sales reports

- ⏳ Price performance analysis

- ⏳ Stock turnover by variant

 

---

 

## Example User Scenarios

 

### Scenario A: Clothing Store

 

**Product**: "Premium T-Shirt" (Barcode: 1234567890)

- Small (Rp 100,000) - Stock: 20

- Medium (Rp 100,000) - Stock: 50

- Large (Rp 100,000) - Stock: 30

- XL (Rp 120,000) - Stock: 15 ← Premium size

 

**POS Flow:**

1. Customer brings Medium and XL t-shirts

2. Cashier scans barcode: 1234567890

3. System: "Select size"

4. Cashier selects: Medium → Adds at Rp 100,000

5. Cashier scans again: 1234567890

6. System: "Select size"

7. Cashier selects: XL → Adds at Rp 120,000

8. Total: Rp 220,000

 

### Scenario B: Electronics Store

 

**Product**: "Wireless Mouse" (Barcode: 9876543210)

- Black (Rp 150,000) - Stock: 100

- White (Rp 150,000) - Stock: 80

- Pink (Rp 165,000) - Stock: 30 ← Limited edition

 

**POS Flow:**

1. Cashier scans: 9876543210

2. System shows variants with images

3. Customer says: "The pink one"

4. Cashier clicks: Pink variant

5. Adds to cart at Rp 165,000

 

### Scenario C: Shoe Store

 

**Product**: "Running Shoes" (Barcode: 5555555555)

- Size 39 (Rp 500,000) - Stock: 5

- Size 40 (Rp 500,000) - Stock: 10

- Size 41 (Rp 500,000) - Stock: 8

- Size 42 (Rp 500,000) - Stock: 12

- Size 43 (Rp 500,000) - Stock: 6

 

**POS Flow:**

1. Customer wants Size 42

2. Cashier can either:

   - Scan barcode → Select "Size 42"

   - OR manually enter SKU: "RS-001-42" → Direct add

3. Adds to cart at Rp 500,000

 

---

 

## Error Handling

 

### Error 1: Variant Out of Stock

 

```

❌ Error: Selected variant is out of stock

 

Message: "The Yellow variant is currently out of stock.

         Please select another variant or check with

         warehouse for restock date."

 

Action: Return to variant selection, gray out unavailable variants

```

 

### Error 2: All Variants Out of Stock

 

```

❌ Error: Product is out of stock

 

Message: "All variants of 'Baby Bottle Set' are currently

         out of stock. Cannot add to cart."

 

Action: Show out-of-stock indicator, do not show variant selection

```

 

### Error 3: Inactive Product/Variant

 

```

❌ Error: Product is not available for sale

 

Message: "This product or variant has been discontinued

         and is no longer available for purchase."

 

Action: Do not add to cart, suggest alternatives

```

 

---

 

## Database Queries

 

### Query 1: Get Active Variants for POS

 

```sql

SELECT

  v.id,

  v.variant_name,

  v.variant_sku,

  v.variant_type,

  v.price,

  v.stock,

  v.image

FROM product_variants v

WHERE v.product_id = ?

  AND v.status = 'active'

  AND v.stock > 0

ORDER BY v.variant_name ASC;

```

 

### Query 2: Check Stock Before Sale

 

```sql

SELECT stock

FROM product_variants

WHERE id = ?

  AND status = 'active'

  AND stock >= ?; -- Requested quantity

```

 

### Query 3: Update Stock After Sale

 

```sql

-- Update variant stock

UPDATE product_variants

SET stock = stock - ?,

    updated_at = CURRENT_TIMESTAMP

WHERE id = ?;

 

-- Update parent product aggregate stock

UPDATE products

SET stock = stock - ?,

    updated_at = CURRENT_TIMESTAMP

WHERE id = ?;

```

 

---

 

## Testing Checklist

 

### Functional Tests

 

- [ ] Scan product without variants → Adds directly to cart

- [ ] Scan product with variants → Shows variant selection

- [ ] Select variant → Adds with correct variant price

- [ ] Try to add out-of-stock variant → Shows error

- [ ] Try to add inactive variant → Not shown in selection

- [ ] Add same variant twice → Increases quantity

- [ ] Add different variants of same product → Separate cart items

- [ ] Complete order → Deducts from variant stock and product stock

 

### Edge Cases

 

- [ ] Product with only 1 active variant → Auto-select?

- [ ] All variants out of stock → Show error

- [ ] Variant price = 0 → Validation error or allow?

- [ ] Very long variant name → UI truncation

- [ ] Many variants (>20) → Pagination or scrolling

 

### Performance Tests

 

- [ ] Variant selection loads in <500ms

- [ ] Stock check completes in <200ms

- [ ] Can handle rapid consecutive scans

 

---

 

## Future Enhancements

 

### Enhancement 1: Variant Barcodes

 

**Current**: Only parent product has barcode

**Future**: Each variant can have its own unique barcode

 

**Benefits:**

- Faster checkout (no variant selection needed)

- Warehouses can label individual variants

- Reduces cashier errors

 

**Migration:**

- Add `barcode` field to `product_variants` table

- Make it optional (fallback to parent barcode if null)

- Update POS to check variant barcode first

 

### Enhancement 2: Variant Recommendations

 

**Feature**: Suggest variants based on:

- Customer's previous purchases

- Most popular variant this month

- Currently on promotion

 

### Enhancement 3: Quick Reorder

 

**Feature**: One-click reorder of previous cart

**Benefit**: Repeat customers can checkout faster

 

### Enhancement 4: Multi-Variant Selection

 

**Feature**: Select multiple variants at once

**Example**: Customer buying t-shirts in multiple sizes

 

```

Select variants (multiple):

☑ Small (2x)

☑ Medium (3x)

☑ Large (1x)

☐ XL

 

[Add 6 items to cart]

```

 

---

 

## Related Documentation

 

- **MULTI_WAREHOUSE_UOM_API_GUIDE.md** - Multi-warehouse stock management

- **BUSINESS_RULES.md** - Product and variant business rules

- **RETAIL_WHOLESALE_ARCHITECTURE.md** - Retail vs wholesale pricing

 

---

 

## Summary

 

**Key Takeaways:**

 

1. **Barcode** identifies the **parent product**

2. **Variant selection** is required for products with variants

3. **Variant price** is used, not parent product price

4. **Stock** is deducted from both variant and parent product

5. **POS UI** should be fast and intuitive for variant selection

 

**Next Steps for POS Module Development:**

 

1. Implement variant selection modal UI

2. Add keyboard shortcuts for fast selection

3. Integrate stock validation

4. Create cart management with variant support

5. Test with real-world scenarios (clothing store, shoe store, etc.)

 

---

 

**Last Updated**: 2025-11-25

**Version**: 1.0

**Status**: 📋 Ready for Implementation
