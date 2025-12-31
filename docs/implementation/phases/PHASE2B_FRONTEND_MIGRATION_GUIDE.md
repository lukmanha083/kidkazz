# Phase 2B: Frontend Migration Guide

## Overview

Phase 2B involves updating the ERP dashboard frontend to use the new DDD-compliant stock endpoints from Inventory Service instead of the deprecated `product.stock` field.

**Status**: 🟡 In Progress
**API Client**: ✅ Updated (commit 04c2303)
**Frontend**: ⏳ Pending migration

---

## API Client Updates (✅ Complete)

### New TypeScript Interfaces

```typescript
// Product stock response from Inventory Service
export interface ProductStockResponse {
  productId: string;
  totalStock: number;
  totalReserved: number;
  totalAvailable: number;
  warehouses: Array<{
    warehouseId: string;
    quantityAvailable: number;
    quantityReserved: number;
    minimumStock: number | null;
    isLowStock: boolean;
  }>;
}

// Low stock status response
export interface LowStockStatusResponse {
  productId: string;
  isLowStock: boolean;
  totalStock: number;
  lowStockWarehouses: Array<{
    warehouseId: string;
    currentStock: number;
    minimumStock: number;
    deficit: number;
  }>;
  message: string;
}

// Virtual bundle stock response
export interface BundleStockResponse {
  bundleId: string;
  bundleName: string;
  bundleSKU: string;
  warehouseId: string;
  availableStock: number;
  limitingComponent: {
    productId: string;
    productName: string;
    available: number;
    required: number;
  } | null;
  componentAvailability: Array<{
    productId: string;
    productName: string;
    productSKU: string;
    requiredPerBundle: number;
    availableStock: number;
    maxBundles: number;
    error?: string;
  }>;
  message: string;
}
```

### New API Methods

```typescript
// Product stock methods
productApi.getStock(id: string): Promise<ProductStockResponse>
productApi.getLowStockStatus(id: string): Promise<LowStockStatusResponse>

// Bundle stock method
bundleApi.getAvailableStock(id: string, warehouseId?: string): Promise<BundleStockResponse>
```

---

## Frontend Files Requiring Updates

### High Priority Files

1. **`apps/erp-dashboard/src/routes/dashboard/products/all.tsx`**
   - **Lines**: 587, 601, 673, 749, 755, 896, 900, 938, 982, 1092, 1097, 1109, 1511, 1513, 1519, 1692, 1766, 2037, 2288, 2504, 2535, 2536, 2568, 2663
   - **Changes**: Replace `product.stock` with async stock fetch
   - **Estimated effort**: 4-6 hours

2. **`apps/erp-dashboard/src/routes/dashboard/products/bundle.tsx`**
   - **Changes**: Replace `bundle.availableStock` with virtual calculation
   - **Estimated effort**: 2-3 hours

3. **`apps/erp-dashboard/src/routes/dashboard/products/index.tsx`**
   - **Changes**: Update product list display
   - **Estimated effort**: 1-2 hours

4. **`apps/erp-dashboard/src/routes/dashboard/products/variant.tsx`**
   - **Changes**: Update variant stock display
   - **Estimated effort**: 1-2 hours

### Medium Priority Files

5. **`apps/erp-dashboard/src/routes/dashboard/inventory/index.tsx`**
   - **Changes**: Update inventory reports
   - **Estimated effort**: 2-3 hours

6. **`apps/erp-dashboard/src/routes/dashboard/inventory/expired-stock.tsx`**
   - **Changes**: Update expired stock report
   - **Estimated effort**: 1 hour

7. **`apps/erp-dashboard/src/routes/dashboard/inventory/uom-conversion.tsx`**
   - **Changes**: Update UOM stock display
   - **Estimated effort**: 1 hour

---

## Migration Patterns

### Pattern 1: Simple Stock Display

**Before**:
```typescript
{product.stock}
```

**After**:
```typescript
const [stockData, setStockData] = useState<ProductStockResponse | null>(null);

useEffect(() => {
  productApi.getStock(product.id).then(setStockData);
}, [product.id]);

{stockData?.totalAvailable ?? 0}
```

---

### Pattern 2: Stock Display with Loading State

**Before**:
```typescript
<span>{product.stock} units</span>
```

**After**:
```typescript
const [stockData, setStockData] = useState<ProductStockResponse | null>(null);
const [stockLoading, setStockLoading] = useState(true);

useEffect(() => {
  setStockLoading(true);
  productApi.getStock(product.id)
    .then(setStockData)
    .finally(() => setStockLoading(false));
}, [product.id]);

<span>
  {stockLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    `${stockData?.totalAvailable ?? 0} units`
  )}
</span>
```

---

### Pattern 3: Low Stock Indicator

**Before**:
```typescript
const isLowStock = product.stock < (product.minimumStock || 10);

{isLowStock && (
  <Badge variant="destructive">Low Stock</Badge>
)}
```

**After**:
```typescript
const [lowStockStatus, setLowStockStatus] = useState<LowStockStatusResponse | null>(null);

useEffect(() => {
  productApi.getLowStockStatus(product.id).then(setLowStockStatus);
}, [product.id]);

{lowStockStatus?.isLowStock && (
  <Badge variant="destructive">
    Low Stock ({lowStockStatus.lowStockWarehouses.length} warehouses)
  </Badge>
)}
```

---

### Pattern 4: Warehouse Breakdown

**Before**:
```typescript
// Stock was not warehouse-aware
<div>Total Stock: {product.stock}</div>
```

**After**:
```typescript
const [stockData, setStockData] = useState<ProductStockResponse | null>(null);

useEffect(() => {
  productApi.getStock(product.id).then(setStockData);
}, [product.id]);

<div>
  <div>Total Stock: {stockData?.totalAvailable ?? 0}</div>
  <div>Warehouses:</div>
  <ul>
    {stockData?.warehouses.map(wh => (
      <li key={wh.warehouseId}>
        {wh.warehouseId}: {wh.quantityAvailable} units
        {wh.isLowStock && <Badge variant="warning">Low</Badge>}
      </li>
    ))}
  </ul>
</div>
```

---

### Pattern 5: Bundle Stock Display

**Before**:
```typescript
<span>{bundle.availableStock} bundles available</span>
```

**After**:
```typescript
const [bundleStock, setBundleStock] = useState<BundleStockResponse | null>(null);

useEffect(() => {
  bundleApi.getAvailableStock(bundle.id).then(setBundleStock);
}, [bundle.id]);

<div>
  <span>{bundleStock?.availableStock ?? 0} bundles available</span>
  {bundleStock?.limitingComponent && (
    <p className="text-sm text-muted-foreground">
      Limited by: {bundleStock.limitingComponent.productName}
      ({bundleStock.limitingComponent.available} / {bundleStock.limitingComponent.required} needed)
    </p>
  )}
</div>
```

---

### Pattern 6: Product Table with Stock Column

**Before**:
```typescript
<Table>
  <TableRow>
    <TableCell>{product.name}</TableCell>
    <TableCell>{product.stock}</TableCell>
  </TableRow>
</Table>
```

**After (Option A - Fetch all at once)**:
```typescript
const [productsWithStock, setProductsWithStock] = useState<Array<Product & { stockData?: ProductStockResponse }>>([]);

useEffect(() => {
  const loadStockData = async () => {
    const productData = await Promise.all(
      products.map(async (product) => {
        const stockData = await productApi.getStock(product.id);
        return { ...product, stockData };
      })
    );
    setProductsWithStock(productData);
  };
  loadStockData();
}, [products]);

<Table>
  {productsWithStock.map(product => (
    <TableRow key={product.id}>
      <TableCell>{product.name}</TableCell>
      <TableCell>{product.stockData?.totalAvailable ?? 0}</TableCell>
    </TableRow>
  ))}
</Table>
```

**After (Option B - Lazy load per row)**:
```typescript
function ProductStockCell({ productId }: { productId: string }) {
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    productApi.getStock(productId)
      .then(data => setStock(data.totalAvailable));
  }, [productId]);

  return <TableCell>{stock ?? '...'}</TableCell>;
}

<Table>
  {products.map(product => (
    <TableRow key={product.id}>
      <TableCell>{product.name}</TableCell>
      <ProductStockCell productId={product.id} />
    </TableRow>
  ))}
</Table>
```

---

## Specific File Changes

### File: `apps/erp-dashboard/src/routes/dashboard/products/all.tsx`

#### Change 1: Product List Display (Line ~1519)

**Before**:
```typescript
{product.stock}
```

**After**:
```typescript
<ProductStockDisplay productId={product.id} />

// Create new component
function ProductStockDisplay({ productId }: { productId: string }) {
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.getStock(productId)
      .then(data => {
        setStock(data.totalAvailable);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
  return <span>{stock ?? 0}</span>;
}
```

#### Change 2: Product Detail Modal (Line ~1692)

**Before**:
```typescript
<p className="text-lg font-bold mt-1">{selectedProduct.stock}</p>
```

**After**:
```typescript
const [productStock, setProductStock] = useState<ProductStockResponse | null>(null);

useEffect(() => {
  if (selectedProduct) {
    productApi.getStock(selectedProduct.id).then(setProductStock);
  }
}, [selectedProduct]);

<div>
  <p className="text-lg font-bold mt-1">{productStock?.totalAvailable ?? 0}</p>
  <p className="text-sm text-muted-foreground mt-1">
    Reserved: {productStock?.totalReserved ?? 0} |
    Available: {productStock?.totalAvailable ?? 0}
  </p>
  {productStock?.warehouses.length && (
    <div className="mt-2">
      <p className="text-sm font-medium">Warehouse Breakdown:</p>
      <ul className="text-sm">
        {productStock.warehouses.map(wh => (
          <li key={wh.warehouseId}>
            {wh.warehouseId}: {wh.quantityAvailable} units
            {wh.isLowStock && <Badge variant="destructive" className="ml-2">Low</Badge>}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>
```

#### Change 3: Form Data Initialization (Line ~673)

**Before**:
```typescript
stock: fullProduct.stock.toString(),
```

**After**:
```typescript
// Keep for backward compatibility during transition
// The form still needs initial value for display
stock: fullProduct.stock?.toString() || '0',

// Add useEffect to fetch and display real stock
useEffect(() => {
  if (formMode === 'edit' && selectedProduct) {
    productApi.getStock(selectedProduct.id).then(stockData => {
      setFormData(prev => ({
        ...prev,
        stock: stockData.totalAvailable.toString()
      }));
    });
  }
}, [formMode, selectedProduct]);
```

#### Change 4: Stock Validation (Lines ~755, 900)

**Before**:
```typescript
const totalStock = parseInt(formData.stock) || 0;
```

**After**:
```typescript
// For new products, use form data
// For existing products, fetch from Inventory Service
const totalStock = formMode === 'create'
  ? parseInt(formData.stock) || 0
  : productStock?.totalAvailable || 0;
```

---

### File: `apps/erp-dashboard/src/routes/dashboard/products/bundle.tsx`

#### Change 1: Bundle List Display

**Before**:
```typescript
<span>{bundle.availableStock} available</span>
```

**After**:
```typescript
function BundleStockDisplay({ bundleId }: { bundleId: string }) {
  const [bundleStock, setBundleStock] = useState<BundleStockResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bundleApi.getAvailableStock(bundleId)
      .then(setBundleStock)
      .finally(() => setLoading(false));
  }, [bundleId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div>
      <span className="font-medium">{bundleStock?.availableStock ?? 0} available</span>
      {bundleStock?.limitingComponent && (
        <Popover>
          <PopoverTrigger asChild>
            <Info className="h-4 w-4 inline ml-1 cursor-pointer" />
          </PopoverTrigger>
          <PopoverContent>
            <p className="text-sm">
              Limited by: <strong>{bundleStock.limitingComponent.productName}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Need {bundleStock.limitingComponent.required},
              have {bundleStock.limitingComponent.available}
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

<BundleStockDisplay bundleId={bundle.id} />
```

#### Change 2: Bundle Detail Modal

**Before**:
```typescript
<div>Available Stock: {selectedBundle.availableStock}</div>
```

**After**:
```typescript
const [bundleStock, setBundleStock] = useState<BundleStockResponse | null>(null);

useEffect(() => {
  if (selectedBundle) {
    bundleApi.getAvailableStock(selectedBundle.id).then(setBundleStock);
  }
}, [selectedBundle]);

<div>
  <div>Available Stock: {bundleStock?.availableStock ?? 0}</div>
  {bundleStock?.limitingComponent && (
    <Alert variant="warning" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Limited by Component</AlertTitle>
      <AlertDescription>
        {bundleStock.limitingComponent.productName}:
        need {bundleStock.limitingComponent.required},
        have {bundleStock.limitingComponent.available}
      </AlertDescription>
    </Alert>
  )}
  {bundleStock?.componentAvailability && (
    <div className="mt-4">
      <p className="font-medium mb-2">Component Availability:</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Component</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Max Bundles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bundleStock.componentAvailability.map(comp => (
            <TableRow key={comp.productId}>
              <TableCell>{comp.productName}</TableCell>
              <TableCell>{comp.requiredPerBundle}</TableCell>
              <TableCell>{comp.availableStock}</TableCell>
              <TableCell>{comp.maxBundles}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )}
</div>
```

---

## Performance Optimization

### Caching Strategy

```typescript
// Create a stock cache hook
import { create } from 'zustand';

interface StockCache {
  stocks: Record<string, { data: ProductStockResponse; timestamp: number }>;
  setStock: (productId: string, data: ProductStockResponse) => void;
  getStock: (productId: string) => ProductStockResponse | null;
  isStale: (productId: string, maxAge: number) => boolean;
}

export const useStockCache = create<StockCache>((set, get) => ({
  stocks: {},

  setStock: (productId, data) => set(state => ({
    stocks: {
      ...state.stocks,
      [productId]: { data, timestamp: Date.now() }
    }
  })),

  getStock: (productId) => {
    const cached = get().stocks[productId];
    if (!cached) return null;
    if (get().isStale(productId, 30000)) return null; // 30 second TTL
    return cached.data;
  },

  isStale: (productId, maxAge) => {
    const cached = get().stocks[productId];
    if (!cached) return true;
    return Date.now() - cached.timestamp > maxAge;
  }
}));

// Use in components
function ProductStockDisplay({ productId }: { productId: string }) {
  const stockCache = useStockCache();
  const [stock, setStock] = useState<ProductStockResponse | null>(null);

  useEffect(() => {
    const cached = stockCache.getStock(productId);
    if (cached) {
      setStock(cached);
      return;
    }

    productApi.getStock(productId).then(data => {
      stockCache.setStock(productId, data);
      setStock(data);
    });
  }, [productId]);

  return <span>{stock?.totalAvailable ?? 0}</span>;
}
```

### Batch Loading

```typescript
// For product tables, batch load all stock data
async function loadProductsWithStock(products: Product[]): Promise<Array<Product & { stockData: ProductStockResponse }>> {
  const stockPromises = products.map(p => productApi.getStock(p.id));
  const stockResults = await Promise.allSettled(stockPromises);

  return products.map((product, i) => ({
    ...product,
    stockData: stockResults[i].status === 'fulfilled'
      ? stockResults[i].value
      : { productId: product.id, totalStock: 0, totalAvailable: 0, totalReserved: 0, warehouses: [] }
  }));
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Test productApi.getStock() returns correct data
- [ ] Test productApi.getLowStockStatus() identifies low stock correctly
- [ ] Test bundleApi.getAvailableStock() calculates correctly
- [ ] Test stock cache hook TTL expiration
- [ ] Test batch loading handles errors gracefully

### Integration Tests

- [ ] Test product list page loads stock correctly
- [ ] Test product detail modal shows warehouse breakdown
- [ ] Test bundle page shows limiting component
- [ ] Test low stock indicators appear correctly
- [ ] Test stock updates reflect in real-time

### E2E Tests

- [ ] User can view product stock across warehouses
- [ ] User can see bundle availability with component details
- [ ] User sees low stock warnings
- [ ] Stock data refreshes when navigating between pages
- [ ] Performance is acceptable with 100+ products

---

## Rollout Strategy

### Phase 1: Read-Only Migration (Week 1-2)
- ✅ Update API client with new endpoints
- ⏳ Update product list pages (read-only display)
- ⏳ Update product detail pages (read-only display)
- ⏳ Update bundle pages (read-only display)
- ⏳ Add low stock indicators

**Goal**: All stock display comes from Inventory Service, but write operations still use old field

### Phase 2: Write Operation Migration (Week 3)
- Remove stock field from product creation forms
- Update stock adjustments to use Inventory Service adjust endpoint
- Remove bundle.availableStock updates
- Add validation to prevent direct stock updates

### Phase 3: Deprecation & Cleanup (Week 4)
- Create database migration to remove stock columns
- Remove deprecated API methods
- Update all documentation
- Final testing and deployment

---

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Revert frontend changes, keep using `product.stock`
2. **Partial Rollback**: Keep new API endpoints but add fallback logic:
```typescript
const stock = stockData?.totalAvailable ?? product.stock ?? 0;
```
3. **Data Sync**: Run reconciliation script to sync Inventory Service with Product Service stock values

---

## Success Metrics

- [ ] 100% of stock displays use Inventory Service endpoints
- [ ] Page load time < 2 seconds for product lists
- [ ] No console errors related to stock fetching
- [ ] Low stock indicators appear correctly
- [ ] Bundle stock calculation shows limiting components
- [ ] Warehouse breakdown displays correctly
- [ ] Stock data accuracy verified in production

---

## Estimated Timeline

| Task | Effort | Status |
|------|--------|--------|
| API Client Updates | 2 hours | ✅ Complete |
| Product List Page | 4-6 hours | ⏳ Pending |
| Product Detail Page | 3-4 hours | ⏳ Pending |
| Bundle Pages | 2-3 hours | ⏳ Pending |
| Variant Pages | 1-2 hours | ⏳ Pending |
| Inventory Reports | 2-3 hours | ⏳ Pending |
| Testing & QA | 4-6 hours | ⏳ Pending |
| Documentation | 2 hours | 🟡 In Progress |
| **Total** | **20-27 hours** | **5% Complete** |

---

## Next Steps

1. **Start with Product List Page** (`apps/erp-dashboard/src/routes/dashboard/products/all.tsx`)
   - Create `ProductStockDisplay` component
   - Replace `product.stock` references
   - Add loading states
   - Test with real data

2. **Implement Caching** (Optional but recommended)
   - Create stock cache hook with Zustand
   - Add 30-second TTL
   - Test cache invalidation

3. **Update Bundle Pages**
   - Create `BundleStockDisplay` component
   - Show limiting component indicator
   - Display component availability table

4. **Add Low Stock Indicators**
   - Create `LowStockBadge` component
   - Query low stock status endpoint
   - Show affected warehouses

5. **Testing & Validation**
   - E2E tests for critical paths
   - Performance testing with large datasets
   - User acceptance testing

---

**Status**: Phase 2B In Progress
**Last Updated**: 2025-12-02
**Author**: Claude (AI Assistant)
**Related**:
- `docs/PHASE2_IMPLEMENTATION_SUMMARY.md`
- `docs/DDD_ANALYSIS_AND_FIX.md`
