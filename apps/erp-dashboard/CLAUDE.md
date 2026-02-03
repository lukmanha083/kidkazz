# CLAUDE.md - ERP Dashboard AI Assistant Quick Reference

**App**: KidKazz Real-Time ERP Dashboard
**Path**: `apps/erp-dashboard`
**Stack**: React 18 + TanStack Router + TanStack Query + ShadCN UI + Tailwind CSS

---

## Important: Read First

**Before making changes, check `APP_GRAPH.yaml` in this directory:**
```bash
cat apps/erp-dashboard/APP_GRAPH.yaml
```

This file contains auto-generated mappings of routes, hooks, components, and service connections.

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.3.1 |
| Routing | TanStack Router | 1.157.18 |
| State Management | TanStack Query | 5.90.20 |
| Forms | TanStack Form + Zod | 1.27.4 / 3.25.76 |
| UI Components | ShadCN UI (Radix) | Latest |
| Styling | Tailwind CSS | 4.1.18 |
| Tables | TanStack Table | 8.21.3 |
| Virtualization | TanStack Virtual | 3.13.18 |
| Build | Vite | 5.4.21 |
| Testing | Vitest | 2.1.9 |

---

## Directory Structure

```
src/
├── main.tsx                 # App entry point
├── routes/                  # File-based routing (TanStack Router)
│   ├── __root.tsx          # Root layout
│   ├── index.tsx           # Login page
│   ├── dashboard.tsx       # Dashboard layout
│   └── dashboard/          # Dashboard routes
│       ├── products/       # Product management
│       ├── inventory/      # Inventory management
│       ├── accounting/     # Accounting & reports
│       └── business-partner/ # CRM
├── components/
│   ├── ui/                 # ShadCN UI components
│   │   └── data-table/     # Table components + columns
│   ├── ImageUpload.tsx     # Media upload components
│   └── ...
├── hooks/
│   ├── queries/            # React Query hooks
│   │   ├── useProducts.ts
│   │   ├── useInventory.ts
│   │   ├── useWarehouses.ts
│   │   └── ...
│   └── useWebSocket.ts     # Real-time updates
├── lib/
│   ├── api.ts              # API client (service connections)
│   ├── query-client.ts     # React Query configuration
│   ├── form-schemas.ts     # Zod validation schemas
│   └── utils.ts            # Utility functions
└── types.ts                # Global TypeScript types
```

---

## Backend Service Connections

This app connects to multiple backend microservices via environment variables:

| Service | Env Variable | Features |
|---------|--------------|----------|
| Product Service | `VITE_PRODUCT_SERVICE_URL` | Products, categories, variants, UOMs, bundles |
| Inventory Service | `VITE_INVENTORY_SERVICE_URL` | Stock, warehouses, batches, movements |
| Accounting Service | `VITE_ACCOUNTING_SERVICE_URL` | Journal entries, accounts, reports |
| Business Partner Service | `VITE_BUSINESS_PARTNER_SERVICE_URL` | Customers, suppliers, employees |

**API Client**: `src/lib/api.ts`

---

## Critical Architecture Rules

### 1. Inventory is Single Source of Truth
Stock data comes from **Inventory Service**, NOT Product Service:
```typescript
// CORRECT - Get stock from Inventory Service
const { data: stock } = useProductStock(productId);

// WRONG - Don't store/fetch stock from Product Service
```

### 2. Virtual Bundle Stock
Virtual bundles calculate available stock from components in real-time:
```typescript
const { data: bundleStock } = useBundleAvailableStock(bundleId);
// Returns: min(component1Stock, component2Stock, ...)
```

### 3. Batch-Level Expiration
Expiration is tracked per **batch**, not per product:
```typescript
const { data: expiringBatches } = useExpiringBatches({ daysAhead: 30 });
```

### 4. Optimistic Updates
All mutations use optimistic updates with rollback:
```typescript
useMutation({
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, optimisticData);
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(queryKey, context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  }
});
```

---

## Key Patterns

### Form Validation
Use `createFormValidator` with Zod schemas (NOT deprecated `zodValidator`):
```typescript
import { createFormValidator, productFormSchema } from '@/lib/form-schemas';

const form = useForm({
  validators: { onChange: createFormValidator(productFormSchema) }
});
```

### Data Table
Standard table with sorting, filtering, pagination:
```typescript
import { DataTable } from '@/components/ui/data-table';
import { productColumns } from '@/components/ui/data-table/columns/product-columns';

<DataTable columns={productColumns} data={products} />
```

For large datasets (1000+ rows), use virtualized version:
```typescript
import { VirtualizedDataTable } from '@/components/ui/data-table';
```

### Real-Time Updates (WebSocket)
Inventory data updates in real-time via WebSocket:
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { isConnected } = useWebSocket({
  type: 'inventory',
  subscription: { productId, warehouseId },
  enabled: true,
});
```

WebSocket events automatically invalidate React Query cache:
- `inventory_adjusted` → Invalidates `['inventory']`, `['products', 'stock']`
- `warehouse_updated` → Invalidates `['warehouses']`

### Query Hooks
Located in `src/hooks/queries/`:
```typescript
// Products
const { data } = useProducts();
const { data } = useProductsWithInventory(); // Includes stock
const { mutate } = useCreateProduct();

// Inventory
const { data } = useInventory();
const { mutate } = useAdjustInventory();

// Warehouses
const { data } = useWarehouses();
const { data } = useActiveWarehouses();
```

---

## Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test
pnpm test:ui          # With UI
pnpm test:coverage    # With coverage

# Code quality
pnpm check:fix        # Lint + format (Biome)
pnpm lint:fix         # Lint only

# Build
pnpm build
pnpm preview          # Preview production build
```

---

## Environment Variables

Create `.env.local` for development:
```bash
# All services deployed to Cloudflare Workers
VITE_API_GATEWAY_URL=https://api-gateway.tesla-hakim.workers.dev
VITE_ACCOUNTING_SERVICE_URL=https://accounting-service.tesla-hakim.workers.dev
VITE_PRODUCT_SERVICE_URL=https://product-service.tesla-hakim.workers.dev
VITE_INVENTORY_SERVICE_URL=https://inventory-service.tesla-hakim.workers.dev
VITE_BUSINESS_PARTNER_SERVICE_URL=https://business-partner-service.tesla-hakim.workers.dev
VITE_ORDER_SERVICE_URL=https://order-service.tesla-hakim.workers.dev
VITE_PAYMENT_SERVICE_URL=https://payment-service.tesla-hakim.workers.dev
VITE_SHIPPING_SERVICE_URL=https://shipping-service.tesla-hakim.workers.dev

# WebSocket for real-time inventory updates
VITE_WEBSOCKET_URL=wss://inventory-service.tesla-hakim.workers.dev/ws
```

**Note**: All services use real D1 databases on Cloudflare Workers with production endpoints.

---

## Adding New Features

### New Route
1. Create file in `src/routes/dashboard/{module}/{feature}.tsx`
2. Route is auto-registered by TanStack Router
3. Run `pnpm dev` to regenerate `routeTree.gen.ts`

### New Query Hook
1. Add to appropriate file in `src/hooks/queries/`
2. Use existing patterns:
   - Query: `useQuery({ queryKey: [...], queryFn: () => api.fetch() })`
   - Mutation: `useMutation({ mutationFn, onMutate, onError, onSettled })`

### New Column Definition
1. Create in `src/components/ui/data-table/columns/{entity}-columns.tsx`
2. Export from `src/components/ui/data-table/columns/index.ts`

### New Form Schema
1. Add Zod schema to `src/lib/form-schemas.ts`
2. Use with `createFormValidator(schema)`

---

## Testing

Test files use `.test.tsx` suffix and are co-located:
```
src/components/ui/data-table/data-table.test.tsx
src/lib/__tests__/form-schemas.test.ts
```

Run specific tests:
```bash
pnpm test -- --grep "DataTable"
```

---

## Responsive Design

Breakpoints:
- **Mobile** (default): < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: >= 1024px

Use Tailwind classes:
```typescript
className="hidden tablet:flex desktop:block"
className="p-4 tablet:p-5 desktop:p-6"
```

---

## Related Documentation

| Topic | Path |
|-------|------|
| App Graph | `APP_GRAPH.yaml` (this directory) |
| Frontend Graph | `FRONTEND_GRAPH.yaml` (root) |
| Dashboard Structure | `docs/bounded-contexts/erp-dashboard/DASHBOARD_STRUCTURE.md` |
| UI Guidelines | `docs/guides/UI_DESIGN_GUIDELINE.md` |
| Virtual Scrolling | `docs/bounded-contexts/erp-dashboard/VIRTUAL_SCROLLING_GUIDE.md` |
| Testing Workflow | `docs/bounded-contexts/erp-dashboard/TESTING_WORKFLOW.md` |
| Business Rules | `docs/ddd/BUSINESS_RULES.md` |

---

## Common Pitfalls

- Don't fetch stock from Product Service (use Inventory Service)
- Don't use `zodValidator` (deprecated) - use `createFormValidator`
- Don't skip optimistic updates for mutations
- Don't forget to invalidate related queries after mutations
- Don't use product-level expiration dates (use batch-level)
- Don't hardcode service URLs (use environment variables)

---

**Last Updated**: 2026-02-03
