# Frontend Architecture with DDD + tRPC Backend

## Overview

This document describes how the frontend (Admin Dashboard) integrates with the DDD-based microservices architecture using tRPC and REST APIs.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Dashboard (Frontend)                    │
│                     React + TanStack Router                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           API Client Layer (src/lib/api.ts)               │  │
│  │  - Type-safe interfaces matching DDD domain models       │  │
│  │  - Service URL configuration                              │  │
│  │  - Error handling and validation                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           React Hooks (src/hooks/)                        │  │
│  │  - useProducts: Product operations + polling             │  │
│  │  - useWarehouses: Warehouse operations + polling         │  │
│  │  - useInventory: Inventory operations + polling          │  │
│  │  - usePolling: Generic polling utility                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Validation Layer (src/lib/validation.ts)          │  │
│  │  - Business rule validation                               │  │
│  │  - User-friendly error messages                           │  │
│  │  - Frontend validation matching domain rules             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API / tRPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservices Backend                         │
│                                                                  │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │  Product Service   │         │ Inventory Service  │         │
│  │                    │         │                    │         │
│  │  REST: /api/*      │         │  REST: /api/*      │         │
│  │  tRPC: /trpc/*     │◄────────┤  tRPC: /trpc/*     │         │
│  │                    │  tRPC   │                    │         │
│  │  DDD Architecture  │         │  DDD Architecture  │         │
│  │  - Domain Layer    │         │  - Domain Layer    │         │
│  │  - Application     │         │  - Application     │         │
│  │  - Infrastructure  │         │  - Infrastructure  │         │
│  └────────────────────┘         └────────────────────┘         │
│          │                              │                       │
│          ▼                              ▼                       │
│  ┌────────────────┐           ┌────────────────┐              │
│  │   Product DB   │           │  Inventory DB  │              │
│  │  (D1 SQLite)   │           │  (D1 SQLite)   │              │
│  └────────────────┘           └────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. API Client Layer

**Location**: `apps/admin-dashboard/src/lib/api.ts`

**Responsibilities**:
- Define TypeScript interfaces matching backend domain models
- Provide type-safe API methods for all operations
- Handle HTTP communication with microservices
- Configure service URLs via environment variables

**Example**:
```typescript
export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  weight?: number;    // Physical attributes
  length?: number;
  width?: number;
  height?: number;
  // ... other fields
}

export const productApi = {
  getAll: async (filters?) => { /* ... */ },
  getById: async (id: string) => { /* ... */ },
  create: async (data: CreateProductInput) => { /* ... */ },
  update: async (id: string, data: Partial<Product>) => { /* ... */ },
  // ... other methods
};
```

### 2. React Hooks Layer

**Location**: `apps/admin-dashboard/src/hooks/`

**Purpose**: Encapsulate data fetching and state management with business logic.

**Available Hooks**:

#### `useProducts(params?, options?)`
```typescript
const {
  products,
  loading,
  error,
  refetch,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = useProducts({ status: 'active' }, { polling: true, interval: 30000 });
```

#### `useWarehouses(options?)`
```typescript
const {
  warehouses,
  loading,
  error,
  refetch,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = useWarehouses({ polling: true });
```

#### `useInventory(filters?, options?)`
```typescript
const {
  inventory,
  loading,
  error,
  refetch,
  adjustInventory,
  setMinimumStock,
} = useInventory(
  { productId: '123', warehouseId: '456' },
  { polling: true, interval: 30000 }
);
```

#### `usePolling(callback, options?)`
```typescript
// Generic polling utility
usePolling(refetch, { interval: 30000, enabled: true });
```

**Features**:
- ✅ Automatic polling for real-time updates
- ✅ Loading and error states
- ✅ CRUD operations built-in
- ✅ Type-safe with TypeScript
- ✅ Optimistic updates support

### 3. Validation Layer

**Location**: `apps/admin-dashboard/src/lib/validation.ts`

**Purpose**: Validate user input against business rules before sending to backend.

**Features**:
```typescript
// Parse backend errors into user-friendly messages
const errors = parseApiError(error);

// Validate specific business rules
const skuError = businessRules.product.validateSKU('TEST-001');
const priceError = businessRules.product.validatePrice(50000);
const stockError = businessRules.inventory.validateAdjustment(
  100,        // quantity
  'out',      // movement type
  50,         // current stock
  'warehouse' // source
);
```

**Business Rules Implemented**:
- ✅ Product SKU uniqueness
- ✅ Price validation (cannot be negative)
- ✅ Physical attributes validation (weight, dimensions)
- ✅ Warehouse code format validation
- ✅ Inventory adjustment validation (prevents negative for warehouse)
- ✅ Minimum stock validation

## Data Flow

### Example: Creating a Product with Physical Attributes

```
User fills form → Validation layer checks → API client sends request
                    (frontend)                      ↓
                                          Product Service receives
                                                    ↓
                                          Domain validates (Product aggregate)
                                                    ↓
                                          PhysicalAttributes value object created
                                                    ↓
                                          Product entity persisted
                                                    ↓
                                          ProductCreated event published
                                                    ↓
                                          Response sent to frontend
                                                    ↓
                       Hook updates state ← API client receives response
                                ↓
                         UI re-renders with new data
```

### Example: Inventory Adjustment (Warehouse vs POS)

```
User adjusts inventory
        ↓
Validation layer checks stock availability
        ↓
API client sends with source: 'warehouse' or 'pos'
        ↓
Inventory Service receives
        ↓
AdjustInventory use case routes to correct domain method:
  - warehouseAdjustOut() → strict validation
  - posSale() → allows negative
        ↓
Inventory aggregate adjusts stock
        ↓
InventoryAdjusted event published with source tracking
        ↓
Response sent (success or error)
        ↓
Frontend hook updates inventory state
        ↓
UI shows updated stock level
```

## Service Communication

### Frontend ↔ Backend: REST API

**Primary communication method for frontend**:
- All CRUD operations use REST endpoints
- Format: `http://service-url/api/{resource}`
- Content-Type: `application/json`

**Example**:
```typescript
// Product Service
POST /api/products
GET /api/products/:id
PATCH /api/products/:id/price

// Inventory Service
POST /api/inventory/adjust
GET /api/inventory/:productId
```

### Backend ↔ Backend: tRPC

**Service-to-service communication**:
- Type-safe RPC calls between microservices
- No HTTP overhead for internal calls
- End-to-end TypeScript type safety

**Example**:
```typescript
// Inventory Service calls Product Service
const productClient = createTRPCClient<ProductRouter>(ProductServiceBinding);
const product = await productClient.product.getById.query({ id: '123' });

// Now Inventory Service has product details without REST call
```

## Environment Configuration

### Development

**`.env` for Admin Dashboard**:
```bash
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
```

### Production

Configure via Cloudflare Workers environment variables:
```bash
# For services
wrangler secret put PRODUCT_SERVICE_URL
wrangler secret put INVENTORY_SERVICE_URL
```

## Real-Time Updates

### Polling Strategy

Since Cloudflare Workers don't support persistent connections (WebSocket/SSE):

**Approach**: Configurable polling with React hooks

```typescript
// Enable polling with 30-second interval
const { products } = useProducts({}, { polling: true, interval: 30000 });
```

**Benefits**:
- ✅ Simple to implement
- ✅ Works with stateless Workers
- ✅ Configurable interval
- ✅ Can be disabled when not needed

**Future Consideration**: When moving to Cloudflare Durable Objects, can implement true WebSocket support.

## Error Handling

### Backend Error Format

```json
{
  "error": "Insufficient stock for warehouse adjustment",
  "available": 50,
  "requested": 70
}
```

### Frontend Handling

```typescript
try {
  await adjustInventory(data);
} catch (error) {
  const validationErrors = parseApiError(error);

  validationErrors.forEach(err => {
    if (err.type === 'error') {
      toast.error(err.message);
    } else if (err.type === 'info') {
      toast.info(err.message);
    }
  });
}
```

### User-Friendly Messages

| Backend Error | Frontend Message |
|---------------|------------------|
| "Insufficient stock" | "Insufficient stock for warehouse adjustment. Warehouse operations cannot create negative stock." + "Note: Only POS sales can create negative stock." |
| "SKU already exists" | "This SKU is already in use. Product SKUs must be unique." |
| "Cannot change price of discontinued product" | "Cannot change price of discontinued product. Please reactivate the product first." |
| "Weight cannot be negative" | Field validation shown inline in form |

## Best Practices

### 1. Type Safety

**Always use TypeScript interfaces**:
```typescript
// ✅ Good
const product: Product = await productApi.getById(id);

// ❌ Bad
const product: any = await productApi.getById(id);
```

### 2. Error Handling

**Always handle errors gracefully**:
```typescript
// ✅ Good
try {
  await createProduct(data);
  toast.success('Product created');
} catch (error) {
  const errors = parseApiError(error);
  errors.forEach(err => toast.error(err.message));
}

// ❌ Bad
await createProduct(data); // No error handling
```

### 3. Loading States

**Always show loading indicators**:
```typescript
const { products, loading } = useProducts();

if (loading) return <Spinner />;

return <ProductList products={products} />;
```

### 4. Validation

**Validate on frontend before API call**:
```typescript
// ✅ Good
const errors = businessRules.product.validatePhysicalAttributes(formData);
if (errors.length > 0) {
  // Show errors, don't send to backend
  return;
}
await productApi.create(formData);

// ❌ Bad
await productApi.create(formData); // Let backend validate only
```

## Performance Considerations

### 1. Polling Intervals

- **Active editing**: 10-15 seconds
- **List views**: 30-60 seconds
- **Dashboard overview**: 60-120 seconds
- **Background tabs**: Disable polling

### 2. Data Caching

Consider implementing:
- React Query or SWR for automatic caching
- LocalStorage for offline support
- Optimistic updates for better UX

### 3. Bundle Size

Current approach:
- Custom hooks: ~2-3KB
- API client: ~5-10KB
- Validation: ~3-5KB
- **Total overhead**: ~10-18KB (acceptable)

## Testing

### Unit Tests (Hooks)

```typescript
test('useProducts fetches products', async () => {
  const { result } = renderHook(() => useProducts());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.products.length).toBeGreaterThan(0);
});
```

### Integration Tests

See `test-e2e-complete-workflow.js` for complete workflow testing.

### E2E Tests (Future)

```typescript
// Playwright/Cypress
test('user can create product with dimensions', async ({ page }) => {
  await page.goto('/dashboard/products');
  await page.click('text=Add Product');
  await page.fill('[name=sku]', 'TEST-001');
  await page.fill('[name=weight]', '2.5');
  await page.click('text=Save');

  await expect(page.locator('text=TEST-001')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

**1. CORS errors**

Make sure `wrangler.jsonc` has CORS configured:
```jsonc
{
  "cors": {
    "origins": ["http://localhost:5173"],
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
    "headers": ["Content-Type"]
  }
}
```

**2. Type mismatches**

Always regenerate types after backend changes:
```bash
# Update interfaces in apps/admin-dashboard/src/lib/api.ts
```

**3. Polling not working**

Check browser console for errors and verify:
- Service URLs are correct
- Services are running
- Network tab shows periodic requests

## Future Enhancements

### Planned Improvements

1. **Real-time with Durable Objects**: When scaling, move to WebSocket
2. **Offline Support**: Service Workers + IndexedDB
3. **Optimistic UI**: Update UI before backend confirms
4. **GraphQL**: Consider if tRPC doesn't meet needs
5. **React Query**: Replace custom hooks with React Query

### Migration Path

Current polling approach is intentionally simple to allow easy migration to more sophisticated solutions later without breaking changes.

---

**Last Updated**: November 20, 2025
**Author**: Development Team
