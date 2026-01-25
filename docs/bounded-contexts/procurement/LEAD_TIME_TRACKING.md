# Lead Time Tracking

## Overview

Lead time tracking is managed at the **purchase order level** rather than as a static field on the supplier record. This approach provides more accurate data for purchase order planning since lead times vary based on multiple factors.

## Why Not Static Lead Time on Supplier?

A static `leadTimeDays` field on the supplier record is insufficient because lead time varies based on:

- **Product type** - Different products have different production/shipping times
- **Order quantity** - Larger orders may require more processing time
- **Season/demand** - Busy periods affect supplier capacity
- **Shipping method** - Express vs standard delivery
- **Current supplier capacity** - Changes over time

## Implementation

### 1. Track Actual Lead Time Per Purchase Order

Each purchase order records:

```typescript
interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: Date;           // When order was placed
  expectedDeliveryDate: Date; // Initial estimate
  actualDeliveryDate?: Date;  // When goods actually received
  // ... other fields
}
```

**Calculated lead time:**
```typescript
const actualLeadTimeDays = differenceInDays(actualDeliveryDate, orderDate);
```

### 2. Calculate Historical Average Lead Time

For purchase order planning, calculate the average lead time from historical data:

```typescript
interface SupplierLeadTimeStats {
  supplierId: string;
  averageLeadTimeDays: number;
  minLeadTimeDays: number;
  maxLeadTimeDays: number;
  standardDeviation: number;
  sampleSize: number;          // Number of orders used in calculation
  lastCalculatedAt: Date;
}
```

**Query example:**
```sql
SELECT
  supplier_id,
  AVG(actual_delivery_date - order_date) as avg_lead_time_days,
  MIN(actual_delivery_date - order_date) as min_lead_time_days,
  MAX(actual_delivery_date - order_date) as max_lead_time_days,
  STDDEV(actual_delivery_date - order_date) as std_dev,
  COUNT(*) as sample_size
FROM purchase_orders
WHERE
  actual_delivery_date IS NOT NULL
  AND order_date >= NOW() - INTERVAL '12 months'  -- Use recent data
GROUP BY supplier_id;
```

### 3. Product-Supplier Lead Time (Optional Enhancement)

For more granular tracking, calculate lead time per product-supplier combination:

```typescript
interface ProductSupplierLeadTime {
  productId: string;
  supplierId: string;
  averageLeadTimeDays: number;
  lastUpdatedAt: Date;
}
```

### 4. Use in Purchase Order Planning

When creating a new purchase order:

1. Fetch historical average lead time for the supplier
2. Suggest expected delivery date based on average + buffer
3. Allow manual override if needed

```typescript
function suggestExpectedDeliveryDate(
  supplierId: string,
  orderDate: Date
): Date {
  const stats = getSupplierLeadTimeStats(supplierId);

  // Use average + 1 standard deviation for safety buffer
  const estimatedDays = Math.ceil(
    stats.averageLeadTimeDays + stats.standardDeviation
  );

  return addDays(orderDate, estimatedDays);
}
```

## Benefits

1. **Accurate data** - Based on actual historical performance
2. **Self-improving** - Gets more accurate as more orders are processed
3. **Granular insights** - Can track per product, season, order size
4. **Better planning** - Realistic delivery expectations
5. **Supplier evaluation** - Compare suppliers by delivery reliability

## Future Enhancements

- **Seasonal adjustments** - Weight recent data more heavily
- **Order size correlation** - Factor in order quantity impact
- **Predictive modeling** - ML-based lead time prediction
- **Alerts** - Notify when supplier lead time deviates significantly
