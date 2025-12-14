# Product Expiration Date Feature Guide

**Version**: 1.0
**Date**: 2025-11-25
**Status**: ✅ Fully Implemented

---

## Overview

This guide documents the **Product Expiration Date** feature, which allows tracking product expiration dates and sending alerts before products expire. The feature is fully integrated into:

1. **Database schema** (products table)
2. **Backend API** (product service validation schemas)
3. **Product Report** (aggregate expiration tracking)
4. **Inventory Report** (warehouse-specific expiration tracking)

---

## Database Schema

### Products Table

```sql
CREATE TABLE products (
  -- ... other fields ...

  -- Product Expiration and Alert
  expiration_date TEXT,  -- ISO date string - product expiration date
  alert_date TEXT,       -- ISO date string - alert date (must be before expiration_date)

  -- ... other fields ...
);
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expirationDate` | `string` (ISO date) | No | The date when the product expires (e.g., "2025-12-31") |
| `alertDate` | `string` (ISO date) | No | Alert date for notifications before expiration (e.g., "2025-12-01") |

**Business Rule**: `alertDate` should be before `expirationDate` (validated in application layer).

---

## API Integration

### Creating Products with Expiration Dates

**POST** `/api/products`

```json
{
  "barcode": "123456789",
  "name": "Fresh Milk",
  "sku": "MILK-001",
  "price": 15000,
  "stock": 100,
  "expirationDate": "2025-12-31",  // ← NEW FIELD
  "alertDate": "2025-12-01",       // ← NEW FIELD
  "status": "active"
  // ... other fields ...
}
```

### Updating Product Expiration Dates

**PUT** `/api/products/:id`

```json
{
  "expirationDate": "2026-01-31",
  "alertDate": "2026-01-01"
}
```

### Retrieving Products with Expiration Dates

**GET** `/api/products/:id`

**Response:**
```json
{
  "id": "prod-123",
  "name": "Fresh Milk",
  "sku": "MILK-001",
  "expirationDate": "2025-12-31",
  "alertDate": "2025-12-01",
  "stock": 100,
  // ... other fields ...
}
```

---

## Report Integration

### 1. Product Report (Aggregate View)

**Location**: `/dashboard/products`

The Product Report shows:

#### Expiring Products Widget
- **Filters products expiring in the next 30 days**
- **Sorts by expiration date** (earliest first)
- **Shows top 5 expiring products**

**Display Information**:
- Product name & SKU
- Expiration date (formatted)
- Days until expiration
- Alert status

**Example Output**:
```
┌─────────────────────────────────────────────┐
│ Products Approaching Expiration             │
├─────────────────────────────────────────────┤
│ Fresh Milk (MILK-001)                       │
│ Expires: Dec 31, 2025 (15 days)            │
│ Alert: Dec 1, 2025                          │
├─────────────────────────────────────────────┤
│ Yogurt Drink (YOG-002)                      │
│ Expires: Jan 5, 2026 (20 days)             │
│ Alert: Dec 20, 2025                         │
└─────────────────────────────────────────────┘
```

#### Expired Products Count
- Shows total number of expired products
- Highlights products past their expiration date

**Code Location**:
```
apps/admin-dashboard/src/routes/dashboard/products/index.tsx
Lines 111-147
```

---

### 2. Inventory Report (Warehouse-Specific View)

**Location**: `/dashboard/inventory`

The Inventory Report shows:

#### Expiring Products by Warehouse Widget
- **Groups expiring products by warehouse**
- **Filters products expiring in the next 30 days**
- **Shows warehouse-specific stock levels**

**Display Information**:
- Product name & SKU
- Warehouse location
- Stock quantity at that warehouse
- Expiration date
- Days until expiration

**Example Output**:
```
┌─────────────────────────────────────────────┐
│ Expiring Products by Warehouse              │
├─────────────────────────────────────────────┤
│ Jakarta Warehouse                           │
│ ├─ Fresh Milk (MILK-001)                   │
│ │  Stock: 50 units                         │
│ │  Expires: Dec 31, 2025 (15 days)        │
│ │  Alert: Dec 1, 2025                      │
│ └─ Yogurt (YOG-002)                        │
│    Stock: 30 units                         │
│    Expires: Jan 5, 2026 (20 days)         │
├─────────────────────────────────────────────┤
│ Cilangkap Warehouse                         │
│ └─ Fresh Milk (MILK-001)                   │
│    Stock: 50 units                         │
│    Expires: Jan 10, 2026 (25 days)        │
└─────────────────────────────────────────────┘
```

**Key Features**:
- Different warehouses may have products with different expiration dates
- Useful for managing batch-specific stock rotation (FIFO/FEFO)
- Helps identify which warehouse to fulfill orders from

**Code Location**:
```
apps/admin-dashboard/src/routes/dashboard/inventory/index.tsx
Lines 114-147
```

---

## Business Use Cases

### Use Case 1: FIFO/FEFO Stock Rotation

**Scenario**: Multiple warehouses have the same product with different expiration dates.

**Solution**:
1. View Inventory Report
2. Identify warehouse with earliest expiration date
3. Fulfill orders from that warehouse first
4. Prevent waste by using older stock first

**Example**:
```
Product: Fresh Milk (MILK-001)
├─ Jakarta: Expires Dec 31, 2025 (50 units)  ← Ship from here first
└─ Cilangkap: Expires Jan 31, 2026 (50 units)
```

---

### Use Case 2: Expiration Alerts

**Scenario**: Get notified before products expire so you can:
- Run promotional sales
- Transfer stock to busier locations
- Donate to charity
- Properly dispose of expired items

**Alert Workflow**:
1. Set `alertDate` to 30 days before `expirationDate`
2. System shows products in "Expiring Soon" widget when `alertDate` is reached
3. Take action: discount, transfer, or remove

---

### Use Case 3: Batch Management

**Scenario**: Same product, different batches with different expiration dates.

**Current Implementation**:
- Each product instance can have its own expiration date
- Inventory Report groups by warehouse

**Future Enhancement** (not yet implemented):
- Track batch numbers
- Multiple expiration dates per product per warehouse
- Lot tracking with expiration dates

---

## Frontend Integration

### TypeScript Types

**Product Type**:
```typescript
interface Product {
  id: string;
  name: string;
  sku: string;
  // ... other fields ...
  expirationDate?: string | null; // ISO date string
  alertDate?: string | null;      // ISO date string
  // ... other fields ...
}
```

**CreateProductPayload Type**:
```typescript
interface CreateProductPayload {
  barcode: string;
  name: string;
  sku: string;
  // ... other fields ...
  expirationDate?: string; // Optional ISO date string
  alertDate?: string;      // Optional ISO date string
  // ... other fields ...
}
```

### Date Formatting

**Display Format**: "Dec 31, 2025"

```typescript
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
```

### Days Until Expiration

```typescript
const calculateDaysUntilExpiration = (expirationDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
```

---

## Validation Rules

### Backend Validation (Product Service)

```typescript
const createProductSchema = z.object({
  // ... other fields ...
  expirationDate: z.string().optional().nullable(), // ISO date string
  alertDate: z.string().optional().nullable(),      // ISO date string (should be before expiration)
  // ... other fields ...
});
```

### Application-Level Validation

**Rule**: `alertDate` must be before `expirationDate`

```typescript
// Validation logic (future enhancement)
if (alertDate && expirationDate) {
  const alert = new Date(alertDate);
  const expiry = new Date(expirationDate);

  if (alert >= expiry) {
    throw new ValidationError('Alert date must be before expiration date');
  }
}
```

---

## Date Normalization

To avoid timezone issues, dates are normalized to start-of-day:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const expirationDate = new Date(product.expirationDate);
expirationDate.setHours(0, 0, 0, 0);

// Now safe to compare
if (expirationDate < today) {
  console.log('Product is expired');
}
```

---

## Query Examples

### Get All Products Expiring in Next 30 Days

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

const expiringProducts = products
  .filter(p => {
    if (!p.expirationDate) return false;
    const expirationDate = new Date(p.expirationDate);
    return expirationDate >= today && expirationDate <= thirtyDaysFromNow;
  })
  .sort((a, b) => {
    const dateA = new Date(a.expirationDate!).getTime();
    const dateB = new Date(b.expirationDate!).getTime();
    return dateA - dateB; // Sort by earliest expiration first
  });
```

### Get All Expired Products

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const expiredProducts = products.filter(p => {
  if (!p.expirationDate) return false;
  const expirationDate = new Date(p.expirationDate);
  expirationDate.setHours(0, 0, 0, 0);
  return expirationDate < today;
});
```

### Get Products Expiring by Warehouse

```typescript
const expiringByWarehouse = inventory
  .map(inv => {
    const product = getProduct(inv.productId);
    const warehouse = getWarehouse(inv.warehouseId);

    if (!product?.expirationDate) return null;

    const expirationDate = new Date(product.expirationDate);
    const isExpiringSoon = expirationDate >= today && expirationDate <= thirtyDaysFromNow;

    if (!isExpiringSoon) return null;

    return {
      productName: product.name,
      warehouseName: warehouse.name,
      stock: inv.quantityAvailable,
      expirationDate: product.expirationDate,
      daysUntilExpiration: calculateDaysUntilExpiration(product.expirationDate),
    };
  })
  .filter(Boolean);
```

---

## Future Enhancements

### Phase 1 (Current) ✅ DONE
- [x] Database schema with expiration fields
- [x] API support for expiration dates
- [x] Product Report integration (aggregate)
- [x] Inventory Report integration (warehouse-specific)

### Phase 2 (Future)
- [ ] Email/SMS alerts when alert date is reached
- [ ] Automated notifications to warehouse managers
- [ ] Dashboard widget for urgent expiring items

### Phase 3 (Future)
- [ ] Batch/lot number tracking
- [ ] Multiple expiration dates per product per warehouse
- [ ] FEFO (First Expired, First Out) picking strategy

### Phase 4 (Future)
- [ ] Automatic price discounts for expiring products
- [ ] Integration with promotion system
- [ ] Expired product write-off automation

---

## Testing Checklist

### Manual Testing

- [x] Create product with expiration date
- [x] Update product expiration date
- [x] View expiring products in Product Report
- [x] View expiring products in Inventory Report (by warehouse)
- [ ] Verify date formatting
- [ ] Verify days-until-expiration calculation
- [ ] Test with products having no expiration date
- [ ] Test with expired products
- [ ] Test with future expiration dates

### Automated Testing

```typescript
describe('Expiration Date Feature', () => {
  it('should create product with expiration date', async () => {
    const product = await createProduct({
      name: 'Test Product',
      expirationDate: '2025-12-31',
      alertDate: '2025-12-01',
    });

    expect(product.expirationDate).toBe('2025-12-31');
    expect(product.alertDate).toBe('2025-12-01');
  });

  it('should filter expiring products correctly', () => {
    const products = [
      { expirationDate: '2025-11-30' }, // Expires in 5 days
      { expirationDate: '2026-01-30' }, // Expires in 66 days (not in next 30)
      { expirationDate: '2025-11-20' }, // Already expired
      { expirationDate: null },         // No expiration
    ];

    const expiring = getExpiringProducts(products, 30);
    expect(expiring).toHaveLength(1);
  });
});
```

---

## Related Documentation

- **BUSINESS_RULES.md** - Business rules for expiration tracking
- **MULTI_WAREHOUSE_REFACTOR_PLAN.md** - Multi-warehouse architecture
- **MULTI_WAREHOUSE_UOM_API_GUIDE.md** - UOM and warehouse management APIs

---

## FAQ

**Q: Can I have different expiration dates for the same product in different warehouses?**
A: Currently, the expiration date is set at the product level. For batch-specific expiration dates, you would need to create separate product records or use a batch tracking system (future enhancement).

**Q: What happens to expired products?**
A: The system flags them in reports but doesn't automatically remove them. Warehouse staff should manually handle expired products per company policy.

**Q: Can I get automated alerts?**
A: Not yet. Currently, the system shows expiring products in reports. Email/SMS alerts are planned for Phase 2.

**Q: How do I implement FIFO based on expiration dates?**
A: Use the Inventory Report to see which warehouse has the earliest expiration date, then fulfill orders from that warehouse first.

**Q: Is alert_date required?**
A: No, both `expirationDate` and `alertDate` are optional. If you set an expiration date, it's recommended to also set an alert date (e.g., 30 days before expiration).

---

**Last Updated**: 2025-11-25
**Version**: 1.0
**Status**: ✅ Fully Implemented
