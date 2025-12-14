# Weight-Based Barcode System - Implementation Guide for POS

## Overview

Weight-based barcodes are essential for retail businesses, especially grocery stores, that sell products by weight (e.g., meat, cheese, produce, deli items, bulk goods). This document provides comprehensive research and implementation guidelines for integrating weight-based barcode scanning into the KidKazz POS system.

---

## Table of Contents

1. [What are Weight-Based Barcodes?](#what-are-weight-based-barcodes)
2. [Barcode Formats](#barcode-formats)
3. [How Weight-Based Systems Work](#how-weight-based-systems-work)
4. [Implementation for KidKazz POS](#implementation-for-kidkazz-pos)
5. [Database Schema](#database-schema)
6. [API Requirements](#api-requirements)
7. [POS UI/UX Flow](#pos-uiux-flow)
8. [Testing & Validation](#testing--validation)
9. [References](#references)

---

## What are Weight-Based Barcodes?

Weight-based barcodes (also called **price-embedded barcodes** or **variable measure barcodes**) encode both:
- **Product identifier** (SKU or item code)
- **Variable data** (weight, price, or quantity)

This allows products sold by weight to be packaged with a barcode label that contains all necessary pricing information, streamlining the checkout process.

### Use Cases

- **Fresh Produce**: Apples, bananas, vegetables sold by weight (KG, LB)
- **Meat & Deli**: Chicken, beef, cheese, cold cuts
- **Bakery Items**: Bread, pastries sold by weight
- **Bulk Goods**: Nuts, grains, candy
- **Baby Products (KidKazz)**: Formula powder (by weight), baby food (by weight), diapers (variable pack sizes)

---

## Barcode Formats

There are two main barcode formats for weight-based products:

### 1. EAN-13 with Embedded Weight/Price

**Format Structure:** `YY-CCCCC-WWWWW-X`

- **YY** (2 digits): Prefix - Must be `20` to `29` for variable measure items
  - `02` or `20`: Vendor-packaged goods with varying weight
  - `21-29`: Proprietary/in-store packaged items
- **CCCCC** (5 digits): Item/Product code (unique product identifier)
- **WWWWW** (5 digits): Weight or price data (format defined by retailer)
- **X** (1 digit): Check digit (calculated using EAN-13 algorithm)

**Example:**
```
Barcode: 2012345012345
│││││││││││││
│││││││││││└── Check digit (calculated)
││││││└┴┴┴┴── Weight: 01234 (12.34 KG or 1.234 KG depending on decimal places)
│└┴┴┴┴────── Product code: 12345 (e.g., Baby Formula)
└──────────── Prefix: 20 (variable weight item)
```

**Common Encoding Patterns:**
- **Weight in grams**: `01234` = 1,234 grams = 1.234 KG
- **Weight in kilograms**: `01234` = 12.34 KG (2 decimal places)
- **Price in cents**: `01234` = $12.34 or Rp 12,340

**Prefix Usage Guidelines (GS1 Standard):**
- `020-029`: Reserved for retailer internal use
- Variable measure numbers with prefix `20` must **never** be used for fixed measure items
- Always represented in EAN-13 barcode format (13 digits)

**References:**
- [How to Scan Barcodes with Embedded Weight - Loyverse](https://help.loyverse.com/help/barcodes-with-embedded-weight)
- [Understanding random weight barcodes](https://docs.rmhpos.com/1377502/Content/Topics/SM_UG_Topics/understanding-random-weight-barcodes.html)
- [How to barcode variable measure items - GS1 UK](https://www.gs1uk.org/sites/default/files/How_to_calculate_variable_measure_items_0.pdf)

---

### 2. GS1-128 Barcode for Non-Retail/B2B

**Format:** Uses Application Identifiers (AI) to encode multiple data elements

**Structure:**
```
(01) GTIN-14
(310X) Net Weight in KG
(other AIs) Additional data (date, lot number, etc.)
```

**Application Identifiers for Weight:**
- `(3100)-(3105)`: Net weight in kilograms (variable decimal places)
  - `(3100)`: Weight with 0 decimal places (e.g., 12 KG)
  - `(3102)`: Weight with 2 decimal places (e.g., 12.34 KG)
  - `(3103)`: Weight with 3 decimal places (e.g., 1.234 KG)
- `(3200)-(3205)`: Net weight in pounds
- `(3400)-(3405)`: Net weight in liters
- `(3500)-(3505)`: Net volume in cubic meters

**Example:**
```
(01)19501234567890(3102)001234
│   │             │    │
│   │             │    └── Weight: 12.34 KG (2 decimal places)
│   │             └──────── AI: 3102 (net weight in KG with 2 decimals)
│   └────────────────────── GTIN-14: 9501234567890 (indicator digit 9 = variable measure)
└────────────────────────── AI: 01 (GTIN)
```

**GTIN-14 Indicator Digit:**
- **Indicator digit 9** is reserved for variable measure trade items
- Items with indicator digit 9 **cannot** be scanned at retail POS
- Used for B2B/wholesale tracking and invoicing

**Use Cases:**
- Secondary packaging (outer boxes)
- Wholesale distribution
- Supply chain tracking
- Accurate invoicing by weight

**References:**
- [Working with Variable Measure Trade Items - GS1 US](https://documents.gs1us.org/adobe/assets/deliver/urn:aaid:aem:cfa32d61-9c06-4b43-a66d-dd28e4b2a094/gs1-us-data-hub-working-with-variable-measure.pdf)
- [Barcode items of varying weight - GS1 Sweden](https://gs1.se/en/guides/how-to-guides/barcode-label-items-of-varying-weight/)
- [How to barcode variable measure items - GS1 UK](https://www.gs1uk.org/support-training/help-to-use-and-implement-gs1-standards/barcode-variable-measure-items)

---

## How Weight-Based Systems Work

### In-Store Process Flow

#### 1. Weighing & Labeling (Pre-Checkout)

**At the Department Level:**
- Product is weighed on a digital scale
- Scale calculates weight and generates barcode label
- Label includes:
  - Product name and description
  - Weight (e.g., "1.234 KG")
  - Unit price (e.g., "Rp 50,000/KG")
  - Total price (e.g., "Rp 61,700")
  - EAN-13 barcode with embedded weight

**Equipment Required:**
- Weight scale with built-in barcode printer
- Thermal printer for labels
- Label stock (adhesive labels)

**Example Label:**
```
┌──────────────────────────┐
│ BABY FORMULA POWDER      │
│ SKU: 12345               │
│                          │
│ Weight: 1.234 KG         │
│ Price: Rp 50,000/KG      │
│ Total: Rp 61,700         │
│                          │
│ |||||||||||||||||||||||  │
│  2012345012349           │
└──────────────────────────┘
```

#### 2. Checkout (POS Scanning)

**When cashier scans the barcode:**
1. POS system reads EAN-13 barcode
2. System detects prefix `20-29` → Identifies as weight-based barcode
3. Parses barcode:
   - Extract product code: `12345`
   - Extract weight data: `01234` → 1.234 KG
4. Lookup product in database by product code
5. Verify product is sold by weight (baseUnit = KG)
6. Calculate total price:
   - Unit price from database: Rp 50,000/KG
   - Weight from barcode: 1.234 KG
   - **Total = Rp 50,000 × 1.234 = Rp 61,700**
7. Add to cart with calculated price
8. Deduct inventory by weight (1.234 KG)

**Alternative: Scale at Checkout (No Pre-Packaging)**
1. Cashier places product on checkout scale
2. Scale sends weight to POS automatically
3. Cashier scans product barcode (standard barcode)
4. POS multiplies unit price × weight
5. Display and charge customer

**References:**
- [What are Price-Embedded Barcodes & How do they Work?](https://pointofsalepos.com/blogs/point-of-sale-pos-solutions/what-are-price-embedded-barcodes-and-how-do-they-work)
- [How to use barcodes with embedded weight/price - Lightspeed](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25533775868571-How-to-use-barcodes-with-embedded-weight-price)

---

## Implementation for KidKazz POS

### Phase 1: Backend Implementation

#### 1.1 Barcode Parsing Logic

Create a barcode parser that identifies and decodes weight-based barcodes:

```typescript
interface WeightBarcodeResult {
  isWeightBarcode: boolean;
  productCode?: string;
  weight?: number; // in KG
  price?: number; // optional, if price is embedded
  originalBarcode: string;
}

function parseBarcode(barcode: string): WeightBarcodeResult {
  // EAN-13 validation
  if (barcode.length !== 13) {
    return { isWeightBarcode: false, originalBarcode: barcode };
  }

  // Check prefix for weight-based barcode (20-29)
  const prefix = barcode.substring(0, 2);
  if (prefix < '20' || prefix > '29') {
    // Regular barcode
    return { isWeightBarcode: false, originalBarcode: barcode };
  }

  // Weight-based barcode detected
  // Format: YY-CCCCC-WWWWW-X
  const productCode = barcode.substring(2, 7); // 5 digits
  const weightData = barcode.substring(7, 12); // 5 digits

  // Convert weight data to KG
  // Assuming format: 01234 = 1.234 KG (3 decimal places)
  const weight = parseInt(weightData) / 1000;

  return {
    isWeightBarcode: true,
    productCode,
    weight,
    originalBarcode: barcode,
  };
}
```

**Configuration Options:**
- Decimal places for weight (2 or 3)
- Weight vs. Price encoding (configurable per store)
- Custom prefix ranges

#### 1.2 Product Lookup by Code

Add new API endpoint to lookup products by internal product code (not full barcode):

```typescript
// GET /api/products/by-code/:code
// Example: GET /api/products/by-code/12345

interface ProductLookupResponse {
  id: string;
  name: string;
  sku: string;
  baseUnit: string; // "KG", "LB", "PCS"
  unitPrice: number;
  isWeightBased: boolean; // true if sold by weight
  category: string;
}
```

#### 1.3 POS Sale Processing

Update POS sale logic to handle weight-based barcodes:

```typescript
async function processBarcodeScanned(barcode: string) {
  // 1. Parse barcode
  const result = parseBarcode(barcode);

  if (result.isWeightBarcode) {
    // Weight-based product

    // 2. Lookup product by code
    const product = await productApi.getByCode(result.productCode);

    // 3. Validate product is weight-based
    if (!product.isWeightBased) {
      throw new Error('Product is not configured for weight-based sales');
    }

    // 4. Validate base unit matches
    if (product.baseUnit !== 'KG' && product.baseUnit !== 'LB') {
      throw new Error(`Product base unit (${product.baseUnit}) is not compatible with weight barcode`);
    }

    // 5. Calculate total price
    const totalPrice = product.unitPrice * result.weight;

    // 6. Add to cart
    return {
      productId: product.id,
      productName: product.name,
      quantity: result.weight,
      unit: product.baseUnit,
      unitPrice: product.unitPrice,
      totalPrice: totalPrice,
      barcodeScanned: barcode,
    };
  } else {
    // Regular barcode - existing logic
    return processRegularBarcode(barcode);
  }
}
```

---

### Phase 2: Database Schema Updates

#### 2.1 Products Table

Add fields to support weight-based sales:

```sql
ALTER TABLE products ADD COLUMN is_weight_based BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN product_code VARCHAR(10) UNIQUE; -- For weight barcode lookup
ALTER TABLE products ADD COLUMN weight_barcode_prefix VARCHAR(2); -- Optional: custom prefix
```

**Example Product:**
```sql
INSERT INTO products (
  name, sku, baseUnit, is_weight_based, product_code, retail_price
) VALUES (
  'Baby Formula Powder', 'FORMULA-001', 'KG', true, '12345', 50000
);
```

#### 2.2 Weight Barcode Configuration Table (Optional)

Store system-wide weight barcode configuration:

```sql
CREATE TABLE weight_barcode_config (
  id TEXT PRIMARY KEY,
  prefix_start VARCHAR(2) NOT NULL, -- "20"
  prefix_end VARCHAR(2) NOT NULL,   -- "29"
  decimal_places INTEGER DEFAULT 3, -- 3 = 0.001 KG precision
  encoding_type VARCHAR(20) DEFAULT 'WEIGHT', -- "WEIGHT" or "PRICE"
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

### Phase 3: POS UI/UX Implementation

#### 3.1 Barcode Scanning Interface

**Visual Feedback:**
```
┌───────────────────────────────────────┐
│ 🔍 Scan Barcode                       │
│                                       │
│ Scanned: 2012345012349                │
│                                       │
│ ✓ Weight-based barcode detected      │
│                                       │
│ Product: Baby Formula Powder          │
│ Weight: 1.234 KG                      │
│ Unit Price: Rp 50,000/KG              │
│ ─────────────────────────────────     │
│ Total: Rp 61,700                      │
│                                       │
│ [Add to Cart]  [Cancel]               │
└───────────────────────────────────────┘
```

#### 3.2 Shopping Cart Display

Display weight-based items clearly:

```
┌───────────────────────────────────────┐
│ Shopping Cart                         │
├───────────────────────────────────────┤
│ Baby Bottle (PCS)                     │
│ 2 × Rp 29,990 = Rp 59,980            │
│                                       │
│ Baby Formula Powder (KG)              │
│ 1.234 KG × Rp 50,000/KG = Rp 61,700  │
│ ⚖️ Weighed item                       │
│                                       │
│ Total Items: 2                        │
│ Total: Rp 121,680                     │
└───────────────────────────────────────┘
```

#### 3.3 Weight Scale Integration (Optional)

For in-store weighing without pre-packaging:

**Hardware:**
- USB or Bluetooth-enabled weight scale
- Real-time weight reading capability

**UI Flow:**
```
1. Cashier places item on scale
2. POS displays live weight: "1.234 KG"
3. Cashier scans product barcode
4. POS auto-calculates: "1.234 KG × Rp 50,000 = Rp 61,700"
5. Cashier confirms and adds to cart
```

---

### Phase 4: Product Management UI

#### 4.1 Enable Weight-Based Sales

Add checkbox in product form:

```tsx
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="isWeightBased"
      checked={formData.isWeightBased}
      onCheckedChange={(checked) =>
        setFormData({ ...formData, isWeightBased: checked })
      }
    />
    <Label htmlFor="isWeightBased">
      Sell by weight (weight-based barcode)
    </Label>
  </div>
  <p className="text-xs text-muted-foreground ml-6">
    Enable this for products sold by weight (e.g., formula powder, baby food)
  </p>
</div>

{formData.isWeightBased && (
  <div className="space-y-2">
    <Label htmlFor="productCode">Product Code (for weight barcode)</Label>
    <Input
      id="productCode"
      placeholder="12345"
      maxLength={5}
      value={formData.productCode}
      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
      required
    />
    <p className="text-xs text-muted-foreground">
      5-digit code used in weight-based barcodes (e.g., 20<strong>12345</strong>01234X)
    </p>
  </div>
)}
```

#### 4.2 Validation Rules

- If `isWeightBased = true`:
  - `baseUnit` must be weight-based (KG, LB, GR, OZ)
  - `productCode` must be unique (5 digits)
  - `retailPrice` is price per unit (e.g., Rp 50,000/KG)
- Cannot enable weight-based sales for count-based products (PCS, UNIT)

---

## Testing & Validation

### Test Cases

#### 1. Weight Barcode Parsing
```typescript
test('parses weight-based barcode correctly', () => {
  const result = parseBarcode('2012345012349');
  expect(result.isWeightBarcode).toBe(true);
  expect(result.productCode).toBe('12345');
  expect(result.weight).toBe(1.234);
});

test('identifies regular barcode', () => {
  const result = parseBarcode('8901234567890');
  expect(result.isWeightBarcode).toBe(false);
});
```

#### 2. Product Lookup
```typescript
test('finds product by code', async () => {
  const product = await productApi.getByCode('12345');
  expect(product.name).toBe('Baby Formula Powder');
  expect(product.isWeightBased).toBe(true);
  expect(product.baseUnit).toBe('KG');
});
```

#### 3. Price Calculation
```typescript
test('calculates correct price for weight-based product', () => {
  const unitPrice = 50000; // Rp 50,000/KG
  const weight = 1.234; // KG
  const total = unitPrice * weight;
  expect(total).toBe(61700);
});
```

#### 4. Inventory Deduction
```typescript
test('deducts inventory by weight', async () => {
  const product = await productApi.getById('product-123');
  const initialStock = product.stock; // 100 KG

  await processSale({
    productId: 'product-123',
    quantity: 1.234, // KG
  });

  const updated = await productApi.getById('product-123');
  expect(updated.stock).toBe(initialStock - 1.234);
});
```

---

## Business Rules

### 1. Weight Precision
- Store weight with 3 decimal places (e.g., 1.234 KG)
- Display weight with 2-3 decimal places to customer
- Round final price to nearest currency unit (e.g., Rp 100)

### 2. Inventory Tracking
- Weight-based products tracked in base unit (KG, LB)
- Stock deducted by exact weight sold
- Allow negative stock for POS (first-pay-first-served model)
- Warehouse adjustments must validate sufficient stock

### 3. Barcode Validation
- Weight barcode prefix: `20-29` (configurable)
- Product code: Must exist in database
- Weight: Must be > 0 and < maximum allowed (e.g., 999.999 KG)
- Total price: Must be > 0

### 4. Pricing
- Unit price stored per base unit (e.g., Rp 50,000/KG)
- Total price = unit price × weight
- Support for promotional pricing (discount per KG)

---

## Implementation Roadmap

### Phase 1: Backend Foundation (Week 1-2)
- [ ] Implement barcode parsing function
- [ ] Add `is_weight_based` and `product_code` to products table
- [ ] Create API endpoint: `GET /api/products/by-code/:code`
- [ ] Update POS sale processing logic
- [ ] Write unit tests for barcode parsing

### Phase 2: Product Management (Week 2-3)
- [ ] Add weight-based checkbox to product form
- [ ] Add product code field (conditional display)
- [ ] Implement validation rules
- [ ] Update product creation/edit APIs

### Phase 3: POS UI/UX (Week 3-4)
- [ ] Implement barcode scanning with weight detection
- [ ] Display weight-based item details in cart
- [ ] Add visual indicators for weighed items
- [ ] Test barcode scanning flow end-to-end

### Phase 4: Testing & Documentation (Week 4-5)
- [ ] Manual testing with real weight scales (if available)
- [ ] Generate test barcodes for various weights
- [ ] Document user guide for staff training
- [ ] Performance testing (barcode parsing speed)

### Phase 5: Advanced Features (Future)
- [ ] Weight scale integration (USB/Bluetooth)
- [ ] Barcode label printer integration
- [ ] GS1-128 support for wholesale/B2B
- [ ] Multi-unit conversion (KG ↔ LB)
- [ ] Weight-based discounts and promotions

---

## Security Considerations

### 1. Barcode Validation
- Verify check digit to prevent barcode tampering
- Validate weight range to prevent unrealistic values
- Log all weight-based scans for audit trail

### 2. Price Integrity
- Cross-check calculated price with label price (if available)
- Alert if total price exceeds threshold (e.g., > Rp 1,000,000)
- Prevent manual price override without manager approval

### 3. Inventory Protection
- Prevent negative inventory for warehouse operations
- Track weight discrepancies (scanned weight vs. actual stock)
- Generate alerts for high-value weight-based products

---

## References & Resources

### Standards & Documentation
- [GS1 Variable Measure Items Guide](https://www.gs1uk.org/sites/default/files/How_to_calculate_variable_measure_items_0.pdf)
- [GS1 US Data Hub - Variable Measure Trade Items](https://documents.gs1us.org/adobe/assets/deliver/urn:aaid:aem:cfa32d61-9c06-4b43-a66d-dd28e4b2a094/gs1-us-data-hub-working-with-variable-measure.pdf)
- [EAN-13 Barcode Specifications](https://www.gs1ie.org/standards/data-carriers/barcodes/ean-13/)

### Implementation Guides
- [How to Scan Barcodes with Embedded Weight - Loyverse](https://help.loyverse.com/help/barcodes-with-embedded-weight)
- [Understanding random weight barcodes](https://docs.rmhpos.com/1377502/Content/Topics/SM_UG_Topics/understanding-random-weight-barcodes.html)
- [What are Price-Embedded Barcodes & How do they Work?](https://pointofsalepos.com/blogs/point-of-sale-pos-solutions/what-are-price-embedded-barcodes-and-how-do-they-work)
- [Understanding and Using Price Embedded Barcodes in Retail](https://www.onlinetoolcenter.com/blog/Understanding-and-Using-Price-Embedded-Barcodes-in-Retail.html)

### POS System Resources
- [How Does a Barcode Scanner Work?](https://www.posnation.com/blog/how-does-a-barcode-scanner-work)
- [Top 5 Grocery POS Systems for Your Supermarket in 2024](https://posify.io/top-5-grocery-pos-systems-for-your-supermarket-in-2024/)

---

## Appendix: Barcode Examples

### Example 1: Baby Formula (1.234 KG)
```
Barcode: 2012345012349
Breakdown:
- Prefix: 20 (variable weight)
- Product Code: 12345
- Weight Data: 01234 → 1.234 KG
- Check Digit: 9

Calculation:
- Product: Baby Formula Powder
- Unit Price: Rp 50,000/KG
- Weight: 1.234 KG
- Total: Rp 50,000 × 1.234 = Rp 61,700
```

### Example 2: Baby Food (0.450 KG)
```
Barcode: 2067890004503
Breakdown:
- Prefix: 20 (variable weight)
- Product Code: 67890
- Weight Data: 00450 → 0.450 KG
- Check Digit: 3

Calculation:
- Product: Organic Baby Food
- Unit Price: Rp 80,000/KG
- Weight: 0.450 KG
- Total: Rp 80,000 × 0.450 = Rp 36,000
```

### Example 3: Diaper Pack (2.500 KG - if sold by weight)
```
Barcode: 2055555025002
Breakdown:
- Prefix: 20 (variable weight)
- Product Code: 55555
- Weight Data: 02500 → 2.500 KG
- Check Digit: 2

Calculation:
- Product: Premium Diapers (bulk)
- Unit Price: Rp 40,000/KG
- Weight: 2.500 KG
- Total: Rp 40,000 × 2.500 = Rp 100,000
```

---

**Document Version:** 1.0
**Last Updated:** November 28, 2025
**Author:** Research & Development Team
**Status:** Research Complete - Ready for Implementation

---

## Next Steps

1. **Review & Approval**: Present this document to stakeholders for review
2. **Pilot Program**: Test with a small set of weight-based products (baby formula)
3. **Hardware Procurement**: Purchase weight scales with barcode printers (if needed)
4. **Staff Training**: Train warehouse and POS staff on weight-based barcode system
5. **Phased Rollout**: Start with one warehouse, then expand to all locations
6. **Feedback Collection**: Gather feedback from staff and customers
7. **Iteration**: Refine based on real-world usage data

---
