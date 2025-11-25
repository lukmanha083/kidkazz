# Multi-Warehouse UOM Sales API Guide

**Version**: 1.0
**Date**: 2025-11-25
**Status**: ✅ Implemented

---

## Overview

This guide documents the new API endpoints for handling multi-warehouse UOM (Unit of Measure) sales deductions. These endpoints answer the critical question:

> **"When a sales order occurs, which tables should be deducted - `product_location` or `product_location_uom`?"**

**Answer**: **BOTH** tables are updated atomically, along with their aggregate counterparts, to maintain data consistency across the system.

---

## Database Architecture

### Table Relationships

```
products (aggregate)
    stock: total stock in base units (PCS)
    ↑
    ├── product_locations (warehouse-specific base units)
    │       quantity: base units at specific warehouse
    │
    └── product_uoms (aggregate UOM)
            stock: total UOM stock across warehouses
            ↑
            └── product_uom_locations (warehouse-specific UOM)
                    quantity: UOM stock at specific warehouse
```

### Deduction Flow

When selling **2 BOX6** from **Jakarta warehouse** (where BOX6 = 6 PCS each):

```javascript
Transaction {
  // Step 1: Deduct from product_uom_locations (warehouse-specific UOM)
  Jakarta BOX6: 10 boxes → 8 boxes

  // Step 2: Update product_uoms (aggregate UOM stock)
  BOX6 total: 50 boxes → 48 boxes

  // Step 3: Deduct from product_locations (warehouse-specific base units)
  Jakarta PCS: 100 → 88 (2 boxes × 6 PCS)

  // Step 4: Update products (aggregate base units)
  Total stock: 500 → 488 PCS
}
```

**Key Principle**: All 4 tables are updated atomically to ensure data consistency.

---

## API Endpoints

### 1. **POST** `/api/products/:id/deduct-sale`

Deducts stock from all related tables when a sale occurs.

#### Request

```typescript
POST /api/products/{productId}/deduct-sale
Content-Type: application/json

{
  "uomCode": "BOX6",           // Required: UOM code (PCS, BOX6, CARTON18, etc.)
  "warehouseId": "wh-jakarta", // Required: Warehouse ID
  "quantity": 2,               // Required: Quantity in the specified UOM
  "orderId": "order-12345",    // Optional: Sales order reference
  "reason": "Sales order"      // Optional: Reason for deduction
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Stock deducted successfully",
  "deduction": {
    "productId": "prod-123",
    "productName": "Baby Bottle Set",
    "uomCode": "BOX6",
    "uomQuantityDeducted": 2,
    "baseUnitsDeducted": 12,
    "warehouseId": "wh-jakarta",
    "orderId": "order-12345",
    "reason": "Sales order"
  },
  "remainingStock": {
    "uomAtWarehouse": 8,          // BOX6 remaining at Jakarta
    "baseUnitsAtWarehouse": 88,   // PCS remaining at Jakarta
    "totalUOM": 48,               // BOX6 total across all warehouses
    "totalBaseUnits": 488         // PCS total across all warehouses
  }
}
```

#### Error Responses

**404 Not Found - Product Not Found**
```json
{
  "error": "Product not found"
}
```

**404 Not Found - UOM Not Configured**
```json
{
  "error": "Product UOM not found",
  "message": "UOM \"BOX6\" not configured for this product"
}
```

**404 Not Found - UOM Not at Warehouse**
```json
{
  "error": "UOM location not found",
  "message": "BOX6 not available at this warehouse"
}
```

**400 Bad Request - Insufficient UOM Stock**
```json
{
  "error": "Insufficient UOM stock",
  "message": "Requested 10 BOX6, but only 5 available at this warehouse",
  "available": 5,
  "requested": 10
}
```

**400 Bad Request - Insufficient Base Unit Stock**
```json
{
  "error": "Insufficient base unit stock",
  "message": "Need 60 base units, but only 30 available",
  "available": 30,
  "required": 60
}
```

**500 Internal Server Error - Transaction Failed**
```json
{
  "error": "SALES_DEDUCTION_FAILED",
  "message": "Failed to deduct stock. Transaction rolled back.",
  "details": "Error message here"
}
```

---

### 2. **GET** `/api/products/:id/uom-warehouse-stock`

Retrieves UOM stock breakdown by warehouse for a product.

#### Request

```http
GET /api/products/{productId}/uom-warehouse-stock
```

#### Response (200 OK)

```json
{
  "productId": "prod-123",
  "productName": "Baby Bottle Set",
  "productSKU": "BB-001",
  "baseUnit": "PCS",
  "totalStock": 500,
  "uomStocks": [
    {
      "uomCode": "PCS",
      "uomName": "Pieces",
      "conversionFactor": 1,
      "totalStock": 500,
      "warehouseStocks": [
        {
          "warehouseId": "wh-jakarta",
          "quantity": 200,
          "rack": "A1",
          "bin": "TOP",
          "zone": "Zone A",
          "aisle": "1"
        },
        {
          "warehouseId": "wh-cilangkap",
          "quantity": 300,
          "rack": "B2",
          "bin": "MID",
          "zone": null,
          "aisle": null
        }
      ]
    },
    {
      "uomCode": "BOX6",
      "uomName": "Box of 6",
      "conversionFactor": 6,
      "totalStock": 50,
      "warehouseStocks": [
        {
          "warehouseId": "wh-jakarta",
          "quantity": 30,
          "rack": "A1",
          "bin": "TOP",
          "zone": "Zone A",
          "aisle": "1"
        },
        {
          "warehouseId": "wh-cilangkap",
          "quantity": 20,
          "rack": "B2",
          "bin": "MID",
          "zone": null,
          "aisle": null
        }
      ]
    },
    {
      "uomCode": "CARTON18",
      "uomName": "Carton (18 PCS)",
      "conversionFactor": 18,
      "totalStock": 10,
      "warehouseStocks": [
        {
          "warehouseId": "wh-jakarta",
          "quantity": 6,
          "rack": "A1",
          "bin": "BOTTOM",
          "zone": "Zone A",
          "aisle": "1"
        },
        {
          "warehouseId": "wh-cilangkap",
          "quantity": 4,
          "rack": "B2",
          "bin": "BOTTOM",
          "zone": null,
          "aisle": null
        }
      ]
    }
  ],
  "baseUnitLocations": [
    {
      "warehouseId": "wh-jakarta",
      "quantity": 200,
      "rack": "A1",
      "bin": "TOP",
      "zone": "Zone A",
      "aisle": "1"
    },
    {
      "warehouseId": "wh-cilangkap",
      "quantity": 300,
      "rack": "B2",
      "bin": "MID",
      "zone": null,
      "aisle": null
    }
  ]
}
```

#### Error Response

**404 Not Found**
```json
{
  "error": "Product not found"
}
```

---

## Usage Examples

### Example 1: POS Sale - Selling Individual Items

**Scenario**: Customer buys 5 individual bottles (PCS) from Jakarta warehouse.

```bash
curl -X POST http://localhost:8787/api/products/prod-123/deduct-sale \
  -H "Content-Type: application/json" \
  -d '{
    "uomCode": "PCS",
    "warehouseId": "wh-jakarta",
    "quantity": 5,
    "orderId": "order-pos-001",
    "reason": "POS Sale"
  }'
```

**Result**:
- `product_uom_locations` (Jakarta PCS): 200 → 195
- `product_uoms` (PCS total): 500 → 495
- `product_locations` (Jakarta base): 200 → 195
- `products` (total stock): 500 → 495

---

### Example 2: Wholesale Sale - Selling Boxes

**Scenario**: Wholesale customer buys 10 boxes (BOX6) from Cilangkap warehouse.

```bash
curl -X POST http://localhost:8787/api/products/prod-123/deduct-sale \
  -H "Content-Type: application/json" \
  -d '{
    "uomCode": "BOX6",
    "warehouseId": "wh-cilangkap",
    "quantity": 10,
    "orderId": "order-wholesale-002",
    "reason": "Wholesale order"
  }'
```

**Result**:
- `product_uom_locations` (Cilangkap BOX6): 20 → 10 boxes
- `product_uoms` (BOX6 total): 50 → 40 boxes
- `product_locations` (Cilangkap base): 300 → 240 PCS (10 boxes × 6)
- `products` (total stock): 500 → 440 PCS

---

### Example 3: Large Order - Selling Cartons

**Scenario**: Bulk order of 3 cartons (CARTON18) from Jakarta warehouse.

```bash
curl -X POST http://localhost:8787/api/products/prod-123/deduct-sale \
  -H "Content-Type: application/json" \
  -d '{
    "uomCode": "CARTON18",
    "warehouseId": "wh-jakarta",
    "quantity": 3,
    "orderId": "order-bulk-003",
    "reason": "Bulk corporate order"
  }'
```

**Result**:
- `product_uom_locations` (Jakarta CARTON18): 6 → 3 cartons
- `product_uoms` (CARTON18 total): 10 → 7 cartons
- `product_locations` (Jakarta base): 200 → 146 PCS (3 cartons × 18)
- `products` (total stock): 500 → 446 PCS

---

### Example 4: Get Stock Breakdown

**Scenario**: Check current UOM stock distribution across warehouses.

```bash
curl http://localhost:8787/api/products/prod-123/uom-warehouse-stock
```

**Use Case**: Display stock availability in product detail view or warehouse management dashboard.

---

## Integration with Order Service

When the Order Service processes a sales order, it should:

1. **Call the deduct-sale endpoint** for each product in the order
2. **Handle the response** to check for success or errors
3. **Implement compensation logic** if deduction fails (e.g., via Saga pattern)

### Event-Driven Integration

```typescript
// Order Service - When order is created
async function processOrderItems(orderId: string, items: OrderItem[]) {
  for (const item of items) {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/products/${item.productId}/deduct-sale`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uomCode: item.uomCode,
            warehouseId: item.warehouseId,
            quantity: item.quantity,
            orderId: orderId,
            reason: 'Sales order',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to deduct stock');
      }

      const result = await response.json();
      console.log('Stock deducted:', result.deduction);
    } catch (error) {
      console.error('Deduction failed:', error);
      // Trigger compensation (rollback previous deductions)
      await compensatePreviousDeductions(orderId);
      throw error;
    }
  }
}
```

---

## Data Consistency Rules

### Rule 1: Atomic Updates
All 4 tables MUST be updated together in a single transaction:
- ✅ `product_uom_locations` (warehouse-specific UOM)
- ✅ `product_uoms` (aggregate UOM)
- ✅ `product_locations` (warehouse-specific base units)
- ✅ `products` (aggregate base units)

### Rule 2: Stock Validation
Before deduction, the system validates:
1. Product exists
2. UOM is configured for the product
3. UOM is available at the warehouse
4. Sufficient UOM stock at warehouse
5. Sufficient base unit stock at warehouse

### Rule 3: Conversion Factor
Base units deducted = UOM quantity × conversion factor
- Example: 2 BOX6 = 2 × 6 = 12 PCS

### Rule 4: Error Handling
If any validation fails or update fails:
- Return appropriate error
- Transaction is rolled back (all-or-nothing)
- No partial deductions occur

---

## Testing Checklist

### Manual Testing

- [ ] Test PCS deduction (base unit)
- [ ] Test BOX6 deduction (6× conversion)
- [ ] Test CARTON18 deduction (18× conversion)
- [ ] Test insufficient stock error
- [ ] Test UOM not configured error
- [ ] Test UOM not at warehouse error
- [ ] Test multiple consecutive deductions
- [ ] Verify all 4 tables update correctly
- [ ] Verify remaining stock calculations

### Automated Testing

```typescript
describe('POST /api/products/:id/deduct-sale', () => {
  it('should deduct UOM stock from all tables', async () => {
    // Arrange: Product with BOX6 UOM at Jakarta warehouse
    // Act: Deduct 2 BOX6
    // Assert: All 4 tables updated correctly
  });

  it('should return error when insufficient stock', async () => {
    // Arrange: Product with only 1 BOX6 available
    // Act: Try to deduct 2 BOX6
    // Assert: Returns 400 error with "Insufficient UOM stock"
  });

  it('should rollback on failure', async () => {
    // Arrange: Mock database failure
    // Act: Attempt deduction
    // Assert: No tables are updated (transaction rolled back)
  });
});
```

---

## Performance Considerations

### Optimization Tips

1. **Database Indexes**: Ensure indexes on:
   - `product_uom_locations (product_uom_id, warehouse_id)`
   - `product_locations (product_id, warehouse_id)`

2. **Transaction Batching**: For orders with multiple items, consider batching updates

3. **Caching**: Cache product UOM configurations to reduce database queries

4. **Connection Pooling**: Use connection pooling for high-traffic scenarios

---

## Migration Notes

### Existing Systems

If you have existing code that only updates `product_locations`:

**Before:**
```typescript
// ❌ Old approach - only updates base units
await db.update(product_locations)
  .set({ quantity: oldQuantity - baseUnits })
  .where(eq(product_locations.id, locationId));
```

**After:**
```typescript
// ✅ New approach - use the deduct-sale endpoint
await fetch(`/api/products/${productId}/deduct-sale`, {
  method: 'POST',
  body: JSON.stringify({
    uomCode: 'PCS',
    warehouseId: warehouseId,
    quantity: quantity,
  }),
});
```

---

## Related Documentation

- **MULTI_WAREHOUSE_REFACTOR_PLAN.md** - Multi-warehouse architecture
- **MULTI_UOM_BARCODE_IMPLEMENTATION.md** - UOM system guide
- **BUSINESS_RULES.md** - Business rules (#9: Multi-warehouse)
- **docs/UOM_CONVERSION_PROCEDURE.md** - UOM conversion logic

---

## Support & Questions

**Question**: Should I deduct from `product_location` or `product_location_uom`?
**Answer**: **BOTH!** Use the `/deduct-sale` endpoint which handles all updates atomically.

**Question**: What if the UOM is not configured for a product?
**Answer**: The endpoint returns a 404 error: "Product UOM not found"

**Question**: What happens if there's not enough stock?
**Answer**: The endpoint returns a 400 error with available vs requested quantities

**Question**: How do I handle rollbacks if a later step fails?
**Answer**: Implement compensation logic using the Saga pattern (see SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)

---

**Last Updated**: 2025-11-25
**Version**: 1.0
**Status**: ✅ Production Ready
