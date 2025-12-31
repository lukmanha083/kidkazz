# Frontend Refactoring Roadmap: TanStack Ecosystem Integration

## Executive Summary

This roadmap outlines the comprehensive refactoring plan for the **erp-dashboard** frontend application to:
1. Align with the DDD/Hexagonal architecture of backend services
2. Leverage the **TanStack Ecosystem** for modern React development
3. Implement real-time inventory updates via WebSocket

**Goal**: Modern, type-safe, performant frontend integrated with DDD-compliant backend APIs

**TanStack Ecosystem Stack**:
- **@tanstack/react-query** - Server state management & caching (✅ Partially Implemented)
- **@tanstack/react-router** - Type-safe file-based routing
- **@tanstack/react-table** - Headless table primitives
- **@tanstack/react-virtual** - Virtualized lists for large datasets
- **@tanstack/react-form** - Type-safe form management

**Dependencies**: Backend Phases 1-6 complete, Phases 7-8 pending

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND ARCHITECTURE (TanStack)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Router                                      │ │
│  │  - Type-safe file-based routing                                        │ │
│  │  - Automatic code splitting                                            │ │
│  │  - Search param validation (Zod)                                       │ │
│  │  - Loader/action patterns for data fetching                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Query                                       │ │
│  │  - Server state management                                             │ │
│  │  - Automatic caching & cache invalidation                              │ │
│  │  - Optimistic updates for mutations                                    │ │
│  │  - Real-time sync via WebSocket                                        │ │
│  │  - Status: ✅ Partially Implemented (warehouses, inventory)            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Table                                       │ │
│  │  - Headless table primitives                                           │ │
│  │  - Sorting, filtering, pagination                                      │ │
│  │  - Column resizing & ordering                                          │ │
│  │  - Row selection & expansion                                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Virtual                                     │ │
│  │  - Virtualized lists for 10,000+ rows                                  │ │
│  │  - Window/container virtualization                                     │ │
│  │  - Dynamic row heights                                                 │ │
│  │  - Smooth scrolling                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Form                                        │ │
│  │  - Type-safe form state management                                     │ │
│  │  - Zod schema validation                                               │ │
│  │  - Field-level & form-level validation                                 │ │
│  │  - Async validation support                                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    UI Layer (Shadcn/UI)                                 │ │
│  │  - Radix primitives                                                    │ │
│  │  - Tailwind CSS styling                                                │ │
│  │  - Consistent design system                                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
            ┌─────────────────────┴─────────────────────┐
            │                                           │
       REST API                                   WebSocket
            │                                           │
            ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND MICROSERVICES (DDD)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Product Service (8788)    │  Inventory Service (8792)                       │
│  - Catalog data only       │  - Stock data (single source of truth)          │
│  - NO stock fields         │  - Batches, movements, transfers                │
│                            │  - WebSocket real-time updates                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### Implemented (✅)

| Component | Status | Location |
|-----------|--------|----------|
| React Query Client | ✅ Done | `src/lib/query-client.ts` |
| Query Keys Factory | ✅ Done | `src/lib/query-client.ts` |
| useWarehouses Hook | ✅ Done | `src/hooks/queries/useWarehouses.ts` |
| useInventory Hook | ✅ Done | `src/hooks/queries/useInventory.ts` |
| WebSocket Hook | ✅ Done | `src/hooks/useWebSocket.ts` |
| API Client Layer | ✅ Partial | `src/lib/api.ts` |

### Pending (⏳)

| Component | Status | Description |
|-----------|--------|-------------|
| TanStack Router Migration | ⏳ Pending | Replace react-router with @tanstack/react-router |
| TanStack Table Integration | ⏳ Pending | Replace current tables with TanStack Table |
| TanStack Virtual Integration | ⏳ Pending | Virtualize large product/inventory lists |
| TanStack Form Integration | ⏳ Pending | Replace current form handling |
| API Types Cleanup | ⏳ Pending | Remove deprecated stock fields from Product types |
| Transfer UI (Phase 7) | ⏳ Pending | Inter-warehouse transfer management |
| Stock Opname UI (Phase 8) | ⏳ Pending | Physical inventory count interface |

### Current API Structure Issues

| API Module | Issue | DDD Status |
|------------|-------|------------|
| `productApi` | Still has `stock`, `minimumStock` fields | **NEEDS CLEANUP** |
| `variantApi` | Still has `stock` field | **NEEDS CLEANUP** |
| `productLocationApi` | Still has `quantity` field | **NEEDS CLEANUP** |
| `inventoryApi` | Correct structure | ✅ **COMPLIANT** |
| `warehouseApi` | Correct structure | ✅ **COMPLIANT** |

---

## Phase Overview

| Phase | Description | Dependencies | Priority |
|-------|-------------|--------------|----------|
| **F1** | API Types & Interface Cleanup | Backend Phase 4-5 | 🔴 High |
| **F2** | TanStack Query Completion | F1 | 🔴 High |
| **F3** | TanStack Router Migration | None | 🟡 Medium |
| **F4** | TanStack Table Integration | F2 | 🟡 Medium |
| **F5** | TanStack Virtual Integration | F4 | 🟢 Low |
| **F6** | TanStack Form Integration | F1 | 🟡 Medium |
| **F7** | Transfer UI (Phase 7 Backend) | Backend Phase 7 | 🟡 Medium |
| **F8** | Stock Opname UI (Phase 8 Backend) | Backend Phase 8 | 🟢 Low |

---

## Phase F1: API Types & Interface Cleanup

### F1.1 Update Product Types (Remove Stock Fields)

**File**: `src/lib/api.ts`

```typescript
// ❌ BEFORE (with violations)
export interface Product {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  stock: number;                    // ❌ REMOVE
  minimumStock?: number | null;     // ❌ REMOVE
  expirationDate?: string | null;   // ❌ REMOVE
  alertDate?: string | null;        // ❌ REMOVE
  // ...
}

// ✅ AFTER (DDD compliant)
export interface Product {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  categoryId?: string;
  price: number;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  baseUnit: string;
  wholesaleThreshold: number;
  minimumOrderQuantity: number;     // ✅ KEEP (sales rule)
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  rating: number;
  reviews: number;
  availableForRetail: boolean;
  availableForWholesale: boolean;
  status: ProductStatus;
  isBundle: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### F1.2 Update Variant Types (Remove Stock Field)

```typescript
// ❌ BEFORE
export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  variantSKU: string;
  variantType: VariantType;
  price: number;
  stock: number;          // ❌ REMOVE
  status: 'active' | 'inactive';
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ AFTER
export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  productSKU: string;
  variantName: string;
  variantSKU: string;
  variantType: VariantType;
  price: number;
  // NO stock field - fetch from Inventory Service
  status: 'active' | 'inactive';
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### F1.3 Add Enhanced Inventory Types

```typescript
// Enhanced Inventory type (already implemented)
export interface Inventory {
  id: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;
  uomId?: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit?: number;
  minimumStock: number;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  version: number;
  lastModifiedAt?: string;
  lastRestockedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// NEW: Product with Inventory (combined view for UI)
export interface ProductWithInventory extends Product {
  inventory?: {
    totalAvailable: number;
    totalReserved: number;
    totalInTransit: number;
    minimumStock: number;
    isLowStock: boolean;
    warehouses: Inventory[];
  };
}

// NEW: Inventory Batch (for expiration tracking)
export interface InventoryBatch {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  lotNumber?: string;
  expirationDate?: string;
  alertDate?: string;
  quantityAvailable: number;
  quantityReserved: number;
  status: 'active' | 'expired' | 'depleted' | 'quarantined';
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### F1.4 Add Transfer & Stock Opname Types (For Phases 7 & 8)

```typescript
// Stock Transfer Order
export interface StockTransferOrder {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  requestedBy?: string;
  requestReason: 'low_stock' | 'replenishment' | 'rebalancing' | 'manual';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: TransferStatus;
  approvedBy?: string;
  approvedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  notes?: string;
  items: StockTransferItem[];
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type TransferStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'picking'
  | 'packed'
  | 'shipped'
  | 'in_transit'
  | 'received'
  | 'putaway'
  | 'completed'
  | 'cancelled';

export interface StockTransferItem {
  id: string;
  transferOrderId: string;
  productId: string;
  variantId?: string;
  uomId?: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityPicked?: number;
  quantityShipped?: number;
  quantityReceived?: number;
  quantityDamaged?: number;
  quantityMissing?: number;
  itemStatus: 'pending' | 'picked' | 'packed' | 'shipped' | 'received' | 'putaway' | 'completed';
}

// Stock Opname Session
export interface StockOpnameSession {
  id: string;
  opnameNumber: string;
  warehouseId: string;
  scopeType: 'full' | 'zone' | 'category' | 'product';
  scopeZone?: string;
  scopeCategoryId?: string;
  status: OpnameStatus;
  startedAt?: string;
  completedAt?: string;
  totalItemsCounted: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  notes?: string;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type OpnameStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface StockOpnameItem {
  id: string;
  opnameSessionId: string;
  productId: string;
  variantId?: string;
  systemQuantity: number;
  countedQuantity?: number;
  varianceQuantity?: number;
  varianceValue?: number;
  countedBy?: string;
  countedAt?: string;
  adjustmentStatus: 'pending' | 'approved' | 'rejected' | 'applied';
}
```

### F1.5 Deliverables

- [ ] Update Product interface (remove stock fields)
- [ ] Update ProductVariant interface (remove stock field)
- [ ] Update ProductLocation interface (remove quantity)
- [ ] Add ProductWithInventory combined type
- [ ] Add InventoryBatch interface
- [ ] Add StockTransferOrder interfaces
- [ ] Add StockOpnameSession interfaces
- [ ] Update CreateProductInput (remove stock fields)

---

## Phase F2: TanStack Query Completion

### F2.1 Extend Query Keys Factory

**File**: `src/lib/query-client.ts`

```typescript
export const queryKeys = {
  // Warehouses (✅ Already implemented)
  warehouses: {
    all: ['warehouses'] as const,
    lists: () => [...queryKeys.warehouses.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.warehouses.lists(), filters] as const,
    details: () => [...queryKeys.warehouses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
  },

  // Inventory (✅ Already implemented)
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.inventory.lists(), filters] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (productId: string, warehouseId?: string) =>
      [...queryKeys.inventory.details(), productId, warehouseId] as const,
    movements: (productId: string) =>
      [...queryKeys.inventory.all, 'movements', productId] as const,
    lowStock: (warehouseId?: string) =>
      [...queryKeys.inventory.all, 'low-stock', warehouseId] as const,
  },

  // Products (⏳ Needs implementation)
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: { status?: string; category?: string; search?: string }) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    stock: (id: string) => [...queryKeys.products.all, 'stock', id] as const,
    lowStock: (id: string) => [...queryKeys.products.all, 'low-stock', id] as const,
  },

  // Variants (⏳ Needs implementation)
  variants: {
    all: ['variants'] as const,
    lists: () => [...queryKeys.variants.all, 'list'] as const,
    list: (productId?: string) =>
      [...queryKeys.variants.lists(), { productId }] as const,
    detail: (id: string) => [...queryKeys.variants.all, 'detail', id] as const,
  },

  // Bundles (⏳ Needs implementation)
  bundles: {
    all: ['bundles'] as const,
    lists: () => [...queryKeys.bundles.all, 'list'] as const,
    list: (filters?: { status?: string }) =>
      [...queryKeys.bundles.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.bundles.all, 'detail', id] as const,
    availableStock: (id: string, warehouseId?: string) =>
      [...queryKeys.bundles.all, 'available-stock', id, warehouseId] as const,
  },

  // Batches (⏳ Needs implementation)
  batches: {
    all: ['batches'] as const,
    lists: () => [...queryKeys.batches.all, 'list'] as const,
    list: (filters?: { productId?: string; warehouseId?: string; status?: string }) =>
      [...queryKeys.batches.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.batches.all, 'detail', id] as const,
    expiring: (days: number) =>
      [...queryKeys.batches.all, 'expiring', days] as const,
    expired: () => [...queryKeys.batches.all, 'expired'] as const,
  },

  // Transfers (⏳ Phase 7)
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (filters?: { warehouseId?: string; direction?: 'inbound' | 'outbound'; status?: TransferStatus }) =>
      [...queryKeys.transfers.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.transfers.all, 'detail', id] as const,
    logs: (transferId: string) =>
      [...queryKeys.transfers.all, 'logs', transferId] as const,
  },

  // Stock Opname (⏳ Phase 8)
  stockOpname: {
    all: ['stock-opname'] as const,
    lists: () => [...queryKeys.stockOpname.all, 'list'] as const,
    list: (filters?: { warehouseId?: string; status?: OpnameStatus }) =>
      [...queryKeys.stockOpname.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.stockOpname.all, 'detail', id] as const,
    items: (sessionId: string) =>
      [...queryKeys.stockOpname.all, 'items', sessionId] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },
} as const;
```

### F2.2 Create Product Query Hooks

**File**: `src/hooks/queries/useProducts.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, inventoryApi, type Product, type ProductWithInventory } from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch products with optional inventory data
 */
export function useProducts(
  filters?: { status?: string; category?: string; search?: string },
  options?: { enabled?: boolean; includeInventory?: boolean }
) {
  const { enabled = true, includeInventory = false } = options || {};

  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const { products, total } = await productApi.getAll(filters);

      if (!includeInventory) {
        return { products, total };
      }

      // Fetch inventory for each product in parallel
      const productsWithInventory: ProductWithInventory[] = await Promise.all(
        products.map(async (product) => {
          try {
            const inventory = await inventoryApi.getByProduct(product.id);
            return {
              ...product,
              inventory: {
                totalAvailable: inventory.totalAvailable,
                totalReserved: inventory.totalReserved,
                totalInTransit: inventory.totalInTransit || 0,
                minimumStock: inventory.minimumStock || 0,
                isLowStock: inventory.totalAvailable < (inventory.minimumStock || 0),
                warehouses: inventory.warehouses,
              },
            };
          } catch {
            return product;
          }
        })
      );

      return { products: productsWithInventory, total };
    },
    enabled,
  });
}

/**
 * Hook to fetch a single product with inventory
 */
export function useProduct(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productApi.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch product stock (from Inventory Service)
 */
export function useProductStock(productId: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.products.stock(productId),
    queryFn: () => inventoryApi.getByProduct(productId),
    enabled: enabled && !!productId,
  });
}

/**
 * Hook to create a product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
```

### F2.3 Create Bundle Query Hooks

**File**: `src/hooks/queries/useBundles.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bundleApi, type Bundle } from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all bundles
 */
export function useBundles(
  filters?: { status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.bundles.list(filters),
    queryFn: () => bundleApi.getAll(filters),
    enabled,
  });
}

/**
 * Hook to fetch bundle available stock (virtual calculation)
 */
export function useBundleAvailableStock(
  bundleId: string,
  warehouseId?: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.bundles.availableStock(bundleId, warehouseId),
    queryFn: () => bundleApi.getAvailableStock(bundleId, warehouseId),
    enabled: enabled && !!bundleId,
  });
}
```

### F2.4 Create Batch Query Hooks

**File**: `src/hooks/queries/useBatches.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchApi, type InventoryBatch } from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch batches
 */
export function useBatches(
  filters?: { productId?: string; warehouseId?: string; status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchApi.getAll(filters),
    enabled,
  });
}

/**
 * Hook to fetch expiring batches
 */
export function useExpiringBatches(days: number = 30, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.expiring(days),
    queryFn: () => batchApi.getExpiring(days),
    enabled,
  });
}

/**
 * Hook to fetch expired batches
 */
export function useExpiredBatches(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.expired(),
    queryFn: () => batchApi.getExpired(),
    enabled,
  });
}

/**
 * Hook to create a batch
 */
export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to adjust batch quantity
 */
export function useAdjustBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: { quantity: number; reason: string } }) =>
      batchApi.adjust(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}
```

### F2.5 Deliverables

- [ ] Extend queryKeys factory with all domains
- [ ] Create useProducts hook with inventory integration
- [ ] Create useVariants hook
- [ ] Create useBundles hook with virtual stock calculation
- [ ] Create useBatches hook for expiration tracking
- [ ] Create useCategories hook
- [ ] Update existing hooks to match new patterns

---

## Phase F3: TanStack Router Migration

### F3.1 Install & Configure TanStack Router

```bash
npm install @tanstack/react-router @tanstack/router-devtools
```

### F3.2 Route Configuration

**File**: `src/routes/__root.tsx`

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { RootLayout } from '../components/layout/RootLayout';

export const Route = createRootRoute({
  component: () => (
    <RootLayout>
      <Outlet />
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </RootLayout>
  ),
});
```

### F3.3 File-Based Route Structure

```
src/routes/
├── __root.tsx                         # Root layout
├── index.tsx                          # Dashboard home
├── dashboard/
│   ├── products/
│   │   ├── index.tsx                  # Product list
│   │   ├── $productId.tsx             # Product detail
│   │   ├── create.tsx                 # Create product
│   │   └── bundles/
│   │       ├── index.tsx              # Bundle list
│   │       └── $bundleId.tsx          # Bundle detail
│   ├── inventory/
│   │   ├── index.tsx                  # Inventory overview
│   │   ├── warehouses/
│   │   │   ├── index.tsx              # Warehouse list
│   │   │   └── $warehouseId.tsx       # Warehouse detail
│   │   ├── batches/
│   │   │   ├── index.tsx              # Batch list
│   │   │   └── expiring.tsx           # Expiring batches
│   │   ├── transfers/                 # Phase 7
│   │   │   ├── index.tsx              # Transfer list
│   │   │   ├── create.tsx             # Create transfer
│   │   │   └── $transferId.tsx        # Transfer detail
│   │   └── stock-opname/              # Phase 8
│   │       ├── index.tsx              # Opname sessions
│   │       ├── create.tsx             # Start new count
│   │       └── $sessionId/
│   │           ├── index.tsx          # Session detail
│   │           └── count.tsx          # Counting interface
│   └── reports/
│       ├── low-stock.tsx              # Low stock report
│       └── expiring-stock.tsx         # Expiring stock report
```

### F3.4 Route with Search Params & Loader

**File**: `src/routes/dashboard/products/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { queryClient, queryKeys } from '../../../lib/query-client';
import { productApi } from '../../../lib/api';
import { ProductListPage } from '../../../pages/products/ProductListPage';

const productSearchSchema = z.object({
  status: z.enum(['active', 'inactive', 'omnichannel sales']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

export const Route = createFileRoute('/dashboard/products/')({
  validateSearch: productSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    // Prefetch products
    await queryClient.ensureQueryData({
      queryKey: queryKeys.products.list(search),
      queryFn: () => productApi.getAll(search),
    });
  },
  component: ProductListPage,
});
```

### F3.5 Deliverables

- [ ] Install @tanstack/react-router
- [ ] Create route tree configuration
- [ ] Migrate all existing routes
- [ ] Add search param validation with Zod
- [ ] Implement loaders for data prefetching
- [ ] Add route-level code splitting
- [ ] Configure router devtools

---

## Phase F4: TanStack Table Integration

### F4.1 Install TanStack Table

```bash
npm install @tanstack/react-table
```

### F4.2 Create Reusable DataTable Component

**File**: `src/components/ui/data-table.tsx`

```typescript
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  isLoading,
  enableRowSelection = false,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} searchKey={searchKey} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

### F4.3 Product Table Columns with Stock from Inventory Service

**File**: `src/pages/products/columns.tsx`

```typescript
import { ColumnDef } from '@tanstack/react-table';
import { ProductWithInventory } from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { DataTableColumnHeader } from '../../components/ui/data-table-column-header';
import { DataTableRowActions } from '../../components/ui/data-table-row-actions';

export const productColumns: ColumnDef<ProductWithInventory>[] = [
  {
    accessorKey: 'sku',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.image && (
          <img
            src={row.original.image}
            alt={row.original.name}
            className="h-8 w-8 rounded object-cover"
          />
        )}
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <span>Rp {row.original.price.toLocaleString('id-ID')}</span>
    ),
  },
  {
    // Stock from Inventory Service (NOT from Product)
    id: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const inventory = row.original.inventory;
      if (!inventory) {
        return <span className="text-muted-foreground">-</span>;
      }

      const isLowStock = inventory.isLowStock;
      const isCritical = inventory.totalAvailable < (inventory.minimumStock * 0.4);

      return (
        <div className="flex items-center gap-2">
          <span className={
            isCritical ? 'text-red-600 font-bold' :
            isLowStock ? 'text-yellow-600 font-medium' :
            ''
          }>
            {inventory.totalAvailable}
          </span>
          {inventory.totalReserved > 0 && (
            <Badge variant="outline" className="text-xs">
              {inventory.totalReserved} reserved
            </Badge>
          )}
          {isLowStock && (
            <Badge variant={isCritical ? 'destructive' : 'secondary'} className="text-xs">
              {isCritical ? 'Critical' : 'Low'}
            </Badge>
          )}
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.inventory?.totalAvailable || 0;
      const b = rowB.original.inventory?.totalAvailable || 0;
      return a - b;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === 'omnichannel sales' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
```

### F4.4 Deliverables

- [ ] Install @tanstack/react-table
- [ ] Create reusable DataTable component
- [ ] Create DataTablePagination component
- [ ] Create DataTableToolbar component
- [ ] Create DataTableColumnHeader component
- [ ] Migrate Product table
- [ ] Migrate Inventory table
- [ ] Migrate Warehouse table
- [ ] Migrate Transfer table (Phase 7)
- [ ] Migrate Stock Opname table (Phase 8)

---

## Phase F5: TanStack Virtual Integration

### F5.1 Install TanStack Virtual

```bash
npm install @tanstack/react-virtual
```

### F5.2 Create Virtualized Table Component

**File**: `src/components/ui/virtual-table.tsx`

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

interface VirtualTableProps<TData> {
  columns: { header: string; accessor: keyof TData | ((row: TData) => React.ReactNode) }[];
  data: TData[];
  rowHeight?: number;
  overscan?: number;
}

export function VirtualTable<TData>({
  columns,
  data,
  rowHeight = 52,
  overscan = 5,
}: VirtualTableProps<TData>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: `${items[0]?.start ?? 0}px` }} />
          {items.map((virtualRow) => {
            const row = data[virtualRow.index];
            return (
              <TableRow
                key={virtualRow.key}
                style={{ height: `${rowHeight}px` }}
              >
                {columns.map((col, idx) => (
                  <TableCell key={idx}>
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : String(row[col.accessor] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          <tr
            style={{
              height: `${virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0)}px`,
            }}
          />
        </TableBody>
      </Table>
    </div>
  );
}
```

### F5.3 Use Cases for Virtualization

| Component | Row Count | Virtualization |
|-----------|-----------|----------------|
| Product List | 100-1,000 | Optional |
| Inventory List | 1,000-10,000 | **Recommended** |
| Movement History | 10,000+ | **Required** |
| Stock Opname Count | 1,000-5,000 | **Recommended** |
| Transfer Items | 100-500 | Optional |

### F5.4 Deliverables

- [ ] Install @tanstack/react-virtual
- [ ] Create VirtualTable component
- [ ] Integrate with DataTable for large datasets
- [ ] Create VirtualList component for non-table lists
- [ ] Optimize inventory movement history
- [ ] Optimize stock opname counting interface

---

## Phase F6: TanStack Form Integration

### F6.1 Install TanStack Form

```bash
npm install @tanstack/react-form @tanstack/zod-form-adapter
```

### F6.2 Create Product Form with TanStack Form

**File**: `src/pages/products/ProductForm.tsx`

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useCreateProduct, useUpdateProduct } from '../../hooks/queries/useProducts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

// Zod schema for validation (NO stock fields - DDD compliant)
const productSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  retailPrice: z.number().positive().optional(),
  wholesalePrice: z.number().positive().optional(),
  baseUnit: z.string().default('PCS'),
  minimumOrderQuantity: z.number().int().positive().default(1),
  wholesaleThreshold: z.number().int().positive().default(10),
  weight: z.number().optional(),
  categoryId: z.string().optional(),
  availableForRetail: z.boolean().default(true),
  availableForWholesale: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'omnichannel sales']).default('active'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: ProductFormData;
  productId?: string;
  onSuccess?: () => void;
}

export function ProductForm({ product, productId, onSuccess }: ProductFormProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm({
    defaultValues: product || {
      barcode: '',
      name: '',
      sku: '',
      description: '',
      price: 0,
      baseUnit: 'PCS',
      minimumOrderQuantity: 1,
      wholesaleThreshold: 10,
      availableForRetail: true,
      availableForWholesale: false,
      status: 'active' as const,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: productSchema,
    },
    onSubmit: async ({ value }) => {
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, data: value });
      } else {
        await createProduct.mutateAsync(value);
      }
      onSuccess?.();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="barcode">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Barcode</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="sku">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>SKU</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="name">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Product Name</Label>
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.join(', ')}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {/* Pricing */}
      <div className="grid gap-4 md:grid-cols-3">
        <form.Field name="price">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Base Price</Label>
              <Input
                id={field.name}
                type="number"
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="retailPrice">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Retail Price</Label>
              <Input
                id={field.name}
                type="number"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(Number(e.target.value) || undefined)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="wholesalePrice">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Wholesale Price</Label>
              <Input
                id={field.name}
                type="number"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(Number(e.target.value) || undefined)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>

      {/* NOTE: NO stock fields - stock is managed via Inventory Service */}
      <div className="p-4 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          Stock and inventory data are managed separately in the Inventory section.
          After creating this product, assign it to warehouses in the Inventory management.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={form.state.isSubmitting || !form.state.canSubmit}
        >
          {form.state.isSubmitting ? 'Saving...' : productId ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
```

### F6.3 Forms to Migrate

| Form | Current | TanStack Form | Priority |
|------|---------|---------------|----------|
| Product Form | Manual state | ⏳ Migrate | High |
| Variant Form | Manual state | ⏳ Migrate | High |
| Warehouse Form | Manual state | ⏳ Migrate | Medium |
| Inventory Adjust | Manual state | ⏳ Migrate | High |
| Batch Form | Manual state | ⏳ Migrate | Medium |
| Transfer Request | New | ⏳ Create | Phase 7 |
| Stock Opname Count | New | ⏳ Create | Phase 8 |

### F6.4 Deliverables

- [ ] Install @tanstack/react-form
- [ ] Create form validation schemas (Zod)
- [ ] Migrate Product form
- [ ] Migrate Variant form
- [ ] Migrate Warehouse form
- [ ] Migrate Inventory adjustment form
- [ ] Create Batch form
- [ ] Create Transfer request form (Phase 7)
- [ ] Create Stock opname counting form (Phase 8)

---

## Phase F7: Transfer UI (Backend Phase 7 Dependency)

### F7.1 Transfer List Page

**Route**: `/dashboard/inventory/transfers`

**Features**:
- Filter by warehouse (inbound/outbound)
- Filter by status
- Real-time status updates via WebSocket
- Priority indicators

### F7.2 Transfer Detail Page

**Route**: `/dashboard/inventory/transfers/$transferId`

**Features**:
- Workflow progress visualization
- Action buttons based on current status
- Item-level tracking
- Audit log display

### F7.3 Create Transfer Request

**Route**: `/dashboard/inventory/transfers/create`

**Features**:
- Source/destination warehouse selection
- Product selection with current stock display
- Quantity validation against available stock
- Priority selection
- Notes

### F7.4 Transfer Query Hooks

**File**: `src/hooks/queries/useTransfers.ts`

```typescript
// Hook to fetch transfers
export function useTransfers(
  filters?: { warehouseId?: string; direction?: 'inbound' | 'outbound'; status?: TransferStatus },
  options?: { enabled?: boolean; realtime?: boolean }
) { ... }

// Hook to fetch single transfer
export function useTransfer(id: string, options?: { enabled?: boolean }) { ... }

// Hook to create transfer request
export function useCreateTransfer() { ... }

// Hook to approve transfer
export function useApproveTransfer() { ... }

// Hook to reject transfer
export function useRejectTransfer() { ... }

// Hook to update transfer status
export function useUpdateTransferStatus() { ... }
```

### F7.5 Deliverables

- [ ] Create transferApi in api.ts
- [ ] Create useTransfers query hooks
- [ ] Create TransfersListPage
- [ ] Create TransferDetailPage
- [ ] Create CreateTransferPage
- [ ] Create TransferWorkflowProgress component
- [ ] Create TransferStatusBadge component
- [ ] Add WebSocket subscription for transfer updates

---

## Phase F8: Stock Opname UI (Backend Phase 8 Dependency)

### F8.1 Stock Opname Sessions List

**Route**: `/dashboard/inventory/stock-opname`

**Features**:
- List of opname sessions
- Filter by warehouse, status
- Summary statistics
- Quick actions

### F8.2 Create Opname Session

**Route**: `/dashboard/inventory/stock-opname/create`

**Features**:
- Warehouse selection
- Scope selection (full/zone/category/product)
- Notes

### F8.3 Counting Interface

**Route**: `/dashboard/inventory/stock-opname/$sessionId/count`

**Features**:
- Barcode scanner integration
- Quantity input (touch-friendly)
- Progress indicator
- Variance highlighting
- Keyboard shortcuts

### F8.4 Stock Opname Query Hooks

**File**: `src/hooks/queries/useStockOpname.ts`

```typescript
// Hook to fetch opname sessions
export function useStockOpnameSessions(
  filters?: { warehouseId?: string; status?: OpnameStatus },
  options?: { enabled?: boolean }
) { ... }

// Hook to fetch single session
export function useStockOpnameSession(id: string, options?: { enabled?: boolean }) { ... }

// Hook to fetch session items
export function useStockOpnameItems(sessionId: string, options?: { enabled?: boolean }) { ... }

// Hook to create session
export function useCreateStockOpnameSession() { ... }

// Hook to start counting
export function useStartStockOpname() { ... }

// Hook to record count
export function useRecordCount() { ... }

// Hook to finalize session
export function useFinalizeStockOpname() { ... }
```

### F8.5 Deliverables

- [ ] Create stockOpnameApi in api.ts
- [ ] Create useStockOpname query hooks
- [ ] Create StockOpnameListPage
- [ ] Create CreateStockOpnamePage
- [ ] Create StockOpnameCountingPage
- [ ] Create StockOpnameReviewPage
- [ ] Create VarianceReport component
- [ ] Add barcode scanner integration
- [ ] Add keyboard shortcuts for counting

---

## Migration Checklist

### Pre-Migration
- [ ] Ensure backend Phases 1-6 complete
- [ ] Create feature branch for frontend refactoring
- [ ] Document current component usage
- [ ] Set up testing environment

### Phase F1-F2 (API & Query)
- [ ] Update TypeScript interfaces (remove stock fields)
- [ ] Extend query keys factory
- [ ] Create all query hooks
- [ ] Test API integration

### Phase F3 (Router)
- [ ] Install TanStack Router
- [ ] Create route tree
- [ ] Migrate all routes
- [ ] Add search param validation
- [ ] Test navigation

### Phase F4-F5 (Table & Virtual)
- [ ] Install TanStack Table
- [ ] Create DataTable component
- [ ] Migrate all tables
- [ ] Add virtualization for large lists

### Phase F6 (Form)
- [ ] Install TanStack Form
- [ ] Create form schemas
- [ ] Migrate all forms

### Phase F7-F8 (New Features)
- [ ] Wait for backend Phases 7-8
- [ ] Create Transfer UI
- [ ] Create Stock Opname UI

### Post-Migration
- [ ] Full regression testing
- [ ] Performance testing
- [ ] Update documentation
- [ ] User training

---

## Environment Variables

```bash
# Service URLs
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
VITE_ACCOUNTING_SERVICE_URL=http://localhost:8794

# WebSocket
VITE_INVENTORY_WS_URL=ws://localhost:8792/ws
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-router": "^1.x",
    "@tanstack/react-table": "^8.x",
    "@tanstack/react-virtual": "^3.x",
    "@tanstack/react-form": "^0.x",
    "@tanstack/zod-form-adapter": "^0.x",
    "@tanstack/react-query-devtools": "^5.x",
    "@tanstack/router-devtools": "^1.x",
    "zod": "^3.x"
  }
}
```

---

**Document Status**: Updated for TanStack Ecosystem
**Last Updated**: 2025-12-14
**Related Documents**:
- `docs/CLAUDE.md` - Main context document
- `docs/ddd/DDD_REFACTORING_ROADMAP.md` - Backend roadmap
- `docs/bounded-contexts/frontend/FRONTEND_ARCHITECTURE.md` - Architecture overview
- `docs/testing/DDD_REFACTORING_TESTING_GUIDE.md` - Testing guide
