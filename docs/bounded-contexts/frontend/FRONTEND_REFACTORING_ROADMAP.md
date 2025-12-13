# Frontend Refactoring Roadmap: Admin Dashboard DDD Integration

## Executive Summary

This roadmap outlines the refactoring plan for the **admin-dashboard** frontend application to align with the DDD/Hexagonal architecture refactoring of the backend services.

**Goal**: Integrate frontend with refactored backend APIs and implement real-time inventory updates via WebSocket

**Dependencies**: Backend Phases 1-6 must be completed before frontend Phase 3

**Key Changes**:
- Remove stock fields from Product Service API calls
- Fetch all stock data from Inventory Service (single source of truth)
- Implement WebSocket for real-time inventory updates
- Add new UI for Stock Transfers (Phase 7) and Stock Opname (Phase 8)

---

## Current State Analysis

### Current API Structure (`src/lib/api.ts`)

| API Module | Current Service | Stock Fields | DDD Status |
|------------|-----------------|--------------|------------|
| `productApi` | Product Service | `stock`, `minimumStock`, `expirationDate` | **VIOLATION** |
| `variantApi` | Product Service | `stock` | **VIOLATION** |
| `productLocationApi` | Product Service | `quantity` | **VIOLATION** |
| `productUOMLocationApi` | Product Service | `quantity` | **VIOLATION** |
| `variantLocationApi` | Product Service | `quantity` | **VIOLATION** |
| `inventoryApi` | Inventory Service | `quantityAvailable`, `quantityReserved` | **CORRECT** |
| `warehouseApi` | Inventory Service | N/A | **CORRECT** |

### Current Data Flow (Before Refactoring)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE (VIOLATIONS)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Admin Dashboard                                                         │
│       │                                                                  │
│       ├──→ Product Service                                               │
│       │    ├── GET /api/products (includes stock, minimumStock) ❌       │
│       │    ├── GET /api/variants (includes stock) ❌                     │
│       │    ├── GET /api/product-locations (includes quantity) ❌         │
│       │    └── PATCH /api/products/:id/stock (updates Product) ❌        │
│       │                                                                  │
│       └──→ Inventory Service                                             │
│            ├── GET /api/inventory/:productId ✅                          │
│            └── POST /api/inventory/adjust ✅                             │
│                                                                          │
│  Problem: Stock data in two places, potential inconsistency              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Target State Architecture

### Target Data Flow (After Refactoring)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TARGET STATE (DDD COMPLIANT)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Admin Dashboard                                                         │
│       │                                                                  │
│       ├──→ Product Service (Catalog Only)                                │
│       │    ├── GET /api/products (NO stock fields) ✅                    │
│       │    ├── GET /api/variants (NO stock field) ✅                     │
│       │    ├── GET /api/product-locations (NO quantity) ✅               │
│       │    └── POST /api/products (catalog data only) ✅                 │
│       │                                                                  │
│       ├──→ Inventory Service (All Stock Data)                            │
│       │    ├── GET /api/inventory/:productId ✅                          │
│       │    ├── GET /api/inventory/variant/:variantId ✅ (NEW)            │
│       │    ├── GET /api/inventory/uom/:uomId ✅ (NEW)                    │
│       │    ├── POST /api/inventory/adjust ✅                             │
│       │    └── GET /api/batches/:productId (expiration) ✅ (NEW)         │
│       │                                                                  │
│       └──→ WebSocket (Real-time Updates)                                 │
│            ├── inventory.updated ✅                                      │
│            ├── inventory.low_stock ✅                                    │
│            ├── inventory.out_of_stock ✅                                 │
│            ├── transfer.* events ✅                                      │
│            └── batch.expiring_soon ✅                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Description | Depends On Backend Phase |
|-------|-------------|-------------------------|
| **F1** | API Types & Interface Updates | Phase 4, 5 |
| **F2** | Service Layer Refactoring | Phase 4, 5 |
| **F3** | WebSocket Integration | Phase 3 |
| **F4** | Component Updates | Phase 4, 5 |
| **F5** | Reports & Dashboard Updates | Phase 6 |
| **F6** | Stock Transfer UI | Phase 7 |
| **F7** | Stock Opname UI | Phase 8 |

---

## Phase F1: API Types & Interface Updates

### F1.1 Update Product Types (Remove Stock Fields)

**File**: `src/lib/api.ts`

```typescript
// BEFORE (with violations)
export interface Product {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  // ... catalog fields
  stock: number;                    // ❌ REMOVE
  minimumStock?: number | null;     // ❌ REMOVE
  expirationDate?: string | null;   // ❌ REMOVE
  alertDate?: string | null;        // ❌ REMOVE
  // ...
}

// AFTER (DDD compliant)
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
  // Stock data fetched separately from Inventory Service
}
```

### F1.2 Update Variant Types (Remove Stock Field)

```typescript
// BEFORE
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

// AFTER
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

### F1.3 Update Location Types (Remove Quantity Field)

```typescript
// BEFORE
export interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  quantity: number;        // ❌ REMOVE
  createdAt: Date;
  updatedAt: Date;
}

// AFTER
export interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  // NO quantity - fetch from Inventory Service
  createdAt: Date;
  updatedAt: Date;
}
```

### F1.4 Add New Inventory Types

```typescript
// Enhanced Inventory type with new fields
export interface Inventory {
  id: string;
  warehouseId: string;
  productId: string;
  variantId?: string | null;    // NEW: variant support
  uomId?: string | null;        // NEW: UOM support
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit?: number;   // NEW: for transfers
  minimumStock: number;
  rack?: string | null;         // NEW: moved from Product Service
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
  version: number;              // NEW: optimistic locking
  lastModifiedAt?: string;
  lastRestockedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Inventory Batch (for expiration tracking)
export interface InventoryBatch {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  lotNumber?: string;
  expirationDate?: string;      // Moved from Product
  alertDate?: string;           // Moved from Product
  quantityAvailable: number;
  quantityReserved: number;
  status: 'active' | 'expired' | 'depleted';
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Product with stock (combined view)
export interface ProductWithStock extends Product {
  inventory?: {
    totalAvailable: number;
    totalReserved: number;
    totalInTransit: number;
    minimumStock: number;
    isLowStock: boolean;
    warehouses: Inventory[];
  };
}
```

### F1.5 Deliverables
- [ ] Update Product interface (remove stock fields)
- [ ] Update ProductVariant interface (remove stock field)
- [ ] Update ProductLocation interface (remove quantity)
- [ ] Update ProductUOMLocation interface (remove quantity)
- [ ] Update VariantLocation interface (remove quantity)
- [ ] Add InventoryBatch interface
- [ ] Add ProductWithStock combined type
- [ ] Add WebSocket event types

---

## Phase F2: Service Layer Refactoring

### F2.1 Create Inventory Service API Module

**File**: `src/lib/api.ts` - Enhanced inventoryApi

```typescript
export const inventoryApi = {
  // ============================================
  // PRODUCT INVENTORY
  // ============================================

  // Get inventory for a product across all warehouses
  getByProduct: async (productId: string): Promise<{
    productId: string;
    warehouses: Inventory[];
    totalAvailable: number;
    totalReserved: number;
    totalInTransit: number;
    isLowStock: boolean;
  }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/${productId}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Get specific product-warehouse inventory
  getByProductAndWarehouse: async (productId: string, warehouseId: string): Promise<Inventory> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/${productId}/${warehouseId}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // ============================================
  // VARIANT INVENTORY (NEW)
  // ============================================

  // Get inventory for a variant across all warehouses
  getByVariant: async (variantId: string): Promise<{
    variantId: string;
    warehouses: Inventory[];
    totalAvailable: number;
  }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/variant/${variantId}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // ============================================
  // UOM INVENTORY (NEW)
  // ============================================

  // Get inventory for a UOM across all warehouses
  getByUOM: async (uomId: string): Promise<{
    uomId: string;
    warehouses: Inventory[];
    totalAvailable: number;
  }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/uom/${uomId}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // ============================================
  // INVENTORY ADJUSTMENTS
  // ============================================

  // Adjust inventory (with optimistic locking support)
  adjust: async (data: {
    productId: string;
    warehouseId: string;
    variantId?: string;
    uomId?: string;
    quantity: number;
    movementType: 'in' | 'out' | 'adjustment';
    reason?: string;
    notes?: string;
    performedBy?: string;
    rack?: string;
    bin?: string;
    zone?: string;
    aisle?: string;
  }): Promise<{
    inventory: Inventory;
    previousQuantity: number;
    newQuantity: number;
    message: string;
  }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/adjust`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      // Handle optimistic locking conflict
      if (response.status === 409) {
        throw new Error('Concurrent update conflict. Please refresh and try again.');
      }
      throw new Error(error.error || 'Failed to adjust inventory');
    }
    return response.json();
  },

  // Set minimum stock level
  setMinimumStock: async (
    productId: string,
    warehouseId: string,
    minimumStock: number
  ): Promise<{ message: string }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/${productId}/${warehouseId}/minimum-stock`;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimumStock }),
    }).then(r => r.json());
  },

  // ============================================
  // INVENTORY BATCHES (EXPIRATION)
  // ============================================

  // Get batches for a product (for expiration tracking)
  getBatches: async (productId: string, warehouseId?: string): Promise<{
    batches: InventoryBatch[];
    total: number;
  }> => {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    const url = `${INVENTORY_SERVICE_URL}/api/batches/product/${productId}${params}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Get expiring batches
  getExpiringBatches: async (daysAhead: number = 30): Promise<{
    batches: InventoryBatch[];
    total: number;
  }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/expiring?days=${daysAhead}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // Create batch for a product
  createBatch: async (data: {
    productId: string;
    warehouseId: string;
    batchNumber: string;
    lotNumber?: string;
    expirationDate?: string;
    alertDate?: string;
    quantity: number;
  }): Promise<InventoryBatch> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },

  // ============================================
  // LOW STOCK REPORTS
  // ============================================

  // Get all low stock items
  getLowStock: async (warehouseId?: string): Promise<{
    items: Array<{
      productId: string;
      warehouseId: string;
      quantityAvailable: number;
      minimumStock: number;
      deficit: number;
    }>;
    total: number;
  }> => {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/low-stock${params}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },

  // ============================================
  // MOVEMENT HISTORY
  // ============================================

  // Get movement history for a product
  getMovements: async (
    productId: string,
    options?: { limit?: number; warehouseId?: string }
  ): Promise<{ movements: InventoryMovement[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.warehouseId) params.append('warehouseId', options.warehouseId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const url = `${INVENTORY_SERVICE_URL}/api/inventory/movements/${productId}${query}`;
    return fetch(url, { headers: { 'Content-Type': 'application/json' } }).then(r => r.json());
  },
};
```

### F2.2 Remove Stock Operations from Product API

```typescript
export const productApi = {
  // ... existing methods ...

  // ❌ REMOVE: updateStock method (use inventoryApi.adjust instead)
  // updateStock: async (id: string, stock: number): Promise<{ message: string }> => { ... }

  // ✅ KEEP: All catalog operations
  getAll: async (params?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<{ products: Product[]; total: number }> => { ... },

  getById: async (id: string): Promise<Product> => { ... },

  create: async (data: CreateProductInput): Promise<Product> => { ... },

  update: async (id: string, data: Partial<CreateProductInput>): Promise<Product> => { ... },

  delete: async (id: string): Promise<{ message: string }> => { ... },
};
```

### F2.3 Update CreateProductInput (Remove Stock Fields)

```typescript
// BEFORE
export interface CreateProductInput {
  barcode: string;
  name: string;
  sku: string;
  // ... catalog fields
  stock?: number;               // ❌ REMOVE
  minimumStock?: number;        // ❌ REMOVE
  expirationDate?: string;      // ❌ REMOVE
  alertDate?: string;           // ❌ REMOVE
}

// AFTER
export interface CreateProductInput {
  barcode: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  categoryId?: string;
  price: number;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  baseUnit?: string;
  wholesaleThreshold?: number;
  minimumOrderQuantity?: number;  // ✅ KEEP (sales rule)
  rating?: number;
  reviews?: number;
  availableForRetail?: boolean;
  availableForWholesale?: boolean;
  status?: ProductStatus;
  isBundle?: boolean;
  // NO stock fields - set via Inventory Service after product creation
}
```

### F2.4 Deliverables
- [ ] Update inventoryApi with variant/UOM endpoints
- [ ] Add batch management endpoints
- [ ] Add low stock report endpoint
- [ ] Remove stock operations from productApi
- [ ] Remove stock operations from variantApi
- [ ] Update CreateProductInput
- [ ] Update CreateVariantInput

---

## Phase F3: WebSocket Integration

### F3.1 Create WebSocket Hook

**File**: `src/hooks/useInventoryWebSocket.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

export interface InventoryEvent {
  type: 'inventory.updated' | 'inventory.low_stock' | 'inventory.out_of_stock' | 'batch.expiring_soon';
  data: {
    productId?: string;
    warehouseId?: string;
    variantId?: string;
    uomId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    minimumStock?: number;
    version?: number;
    previousQuantity?: number;
    changeAmount?: number;
    movementType?: string;
    timestamp: string;
    [key: string]: any;
  };
}

export interface TransferEvent {
  type:
    | 'transfer.requested'
    | 'transfer.approved'
    | 'transfer.rejected'
    | 'transfer.picking_started'
    | 'transfer.packed'
    | 'transfer.shipped'
    | 'transfer.received'
    | 'transfer.completed'
    | 'transfer.cancelled';
  data: {
    transferId: string;
    transferNumber: string;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    timestamp: string;
    [key: string]: any;
  };
}

type WebSocketEvent = InventoryEvent | TransferEvent;

interface UseInventoryWebSocketOptions {
  channels?: string[];
  onInventoryUpdate?: (event: InventoryEvent) => void;
  onTransferUpdate?: (event: TransferEvent) => void;
  onLowStock?: (event: InventoryEvent) => void;
  onOutOfStock?: (event: InventoryEvent) => void;
  autoReconnect?: boolean;
}

const INVENTORY_WS_URL = import.meta.env.VITE_INVENTORY_WS_URL || 'ws://localhost:8792/ws';

export function useInventoryWebSocket(options: UseInventoryWebSocketOptions = {}) {
  const {
    channels = ['global'],
    onInventoryUpdate,
    onTransferUpdate,
    onLowStock,
    onOutOfStock,
    autoReconnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(INVENTORY_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected to Inventory Service');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Subscribe to channels
      channels.forEach(channel => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent;
        setLastEvent(data);

        // Route to appropriate handler
        if (data.type.startsWith('inventory.')) {
          const inventoryEvent = data as InventoryEvent;
          if (data.type === 'inventory.updated' && onInventoryUpdate) {
            onInventoryUpdate(inventoryEvent);
          }
          if (data.type === 'inventory.low_stock' && onLowStock) {
            onLowStock(inventoryEvent);
          }
          if (data.type === 'inventory.out_of_stock' && onOutOfStock) {
            onOutOfStock(inventoryEvent);
          }
        } else if (data.type.startsWith('transfer.') && onTransferUpdate) {
          onTransferUpdate(data as TransferEvent);
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Auto reconnect with exponential backoff
      if (autoReconnect && reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };
  }, [channels, onInventoryUpdate, onTransferUpdate, onLowStock, onOutOfStock, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    subscribe,
    unsubscribe,
    reconnect: connect,
    disconnect,
  };
}
```

### F3.2 Create Inventory Query Hook with Real-Time Updates

**File**: `src/hooks/useInventory.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, Inventory, InventoryBatch } from '../lib/api';
import { useInventoryWebSocket, InventoryEvent } from './useInventoryWebSocket';
import { useCallback } from 'react';

interface UseInventoryOptions {
  productId: string;
  warehouseId?: string;
  enableRealTime?: boolean;
}

export function useInventory({ productId, warehouseId, enableRealTime = true }: UseInventoryOptions) {
  const queryClient = useQueryClient();

  // Real-time inventory update handler
  const handleInventoryUpdate = useCallback((event: InventoryEvent) => {
    if (event.data.productId === productId) {
      // Invalidate and refetch inventory queries
      queryClient.invalidateQueries({ queryKey: ['inventory', productId] });

      if (warehouseId && event.data.warehouseId === warehouseId) {
        queryClient.invalidateQueries({
          queryKey: ['inventory', productId, warehouseId]
        });
      }
    }
  }, [productId, warehouseId, queryClient]);

  // Connect to WebSocket
  const { isConnected } = useInventoryWebSocket({
    channels: warehouseId
      ? [`product:${productId}:warehouse:${warehouseId}`]
      : [`product:${productId}`],
    onInventoryUpdate: enableRealTime ? handleInventoryUpdate : undefined,
  });

  // Fetch inventory data
  const inventoryQuery = useQuery({
    queryKey: ['inventory', productId, warehouseId],
    queryFn: async () => {
      if (warehouseId) {
        return inventoryApi.getByProductAndWarehouse(productId, warehouseId);
      }
      return inventoryApi.getByProduct(productId);
    },
  });

  // Fetch batches (for expiration)
  const batchesQuery = useQuery({
    queryKey: ['inventory-batches', productId, warehouseId],
    queryFn: () => inventoryApi.getBatches(productId, warehouseId),
  });

  return {
    inventory: inventoryQuery.data,
    batches: batchesQuery.data?.batches || [],
    isLoading: inventoryQuery.isLoading || batchesQuery.isLoading,
    isError: inventoryQuery.isError || batchesQuery.isError,
    error: inventoryQuery.error || batchesQuery.error,
    isConnected,
    refetch: () => {
      inventoryQuery.refetch();
      batchesQuery.refetch();
    },
  };
}
```

### F3.3 Create Real-Time Notifications Component

**File**: `src/components/InventoryNotifications.tsx`

```typescript
import React, { useState } from 'react';
import { useInventoryWebSocket, InventoryEvent, TransferEvent } from '../hooks/useInventoryWebSocket';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Bell, Package, AlertTriangle, Truck } from 'lucide-react';

export function InventoryNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    timestamp: Date;
  }>>([]);

  const addNotification = (message: string, type: 'info' | 'warning' | 'error') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 50));

    // Show toast
    if (type === 'warning') {
      toast.warning(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  const handleInventoryUpdate = (event: InventoryEvent) => {
    addNotification(
      `Stock updated: Product ${event.data.productId?.slice(-8)} → ${event.data.quantityAvailable} units`,
      'info'
    );
  };

  const handleLowStock = (event: InventoryEvent) => {
    addNotification(
      `Low stock alert: Product ${event.data.productId?.slice(-8)} at ${event.data.quantityAvailable} units`,
      'warning'
    );
  };

  const handleOutOfStock = (event: InventoryEvent) => {
    addNotification(
      `OUT OF STOCK: Product ${event.data.productId?.slice(-8)}`,
      'error'
    );
  };

  const handleTransferUpdate = (event: TransferEvent) => {
    addNotification(
      `Transfer ${event.data.transferNumber}: ${event.type.replace('transfer.', '')}`,
      'info'
    );
  };

  const { isConnected } = useInventoryWebSocket({
    channels: ['global'],
    onInventoryUpdate: handleInventoryUpdate,
    onLowStock: handleLowStock,
    onOutOfStock: handleOutOfStock,
    onTransferUpdate: handleTransferUpdate,
  });

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? 'default' : 'destructive'}>
        {isConnected ? 'Live' : 'Offline'}
      </Badge>
      <div className="relative">
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </div>
    </div>
  );
}
```

### F3.4 Deliverables
- [ ] Create useInventoryWebSocket hook
- [ ] Create useInventory hook with real-time updates
- [ ] Create InventoryNotifications component
- [ ] Add WebSocket connection status indicator
- [ ] Implement automatic reconnection logic
- [ ] Add toast notifications for stock events

---

## Phase F4: Component Updates

### F4.1 Update Product List Component

Remove stock column from Product Service data, add separate inventory fetch:

```typescript
// Before: Stock from Product response
<TableCell>{product.stock}</TableCell>

// After: Stock from Inventory Service
const { data: inventoryData } = useQuery({
  queryKey: ['inventory', product.id],
  queryFn: () => inventoryApi.getByProduct(product.id),
});

<TableCell>
  {inventoryData?.totalAvailable ?? <Spinner size="sm" />}
</TableCell>
```

### F4.2 Update Product Form (Remove Stock Fields)

```typescript
// REMOVE from form:
// - stock input
// - minimumStock input
// - expirationDate input
// - alertDate input

// ADD: Link to inventory management after product creation
<div className="mt-4 p-4 bg-blue-50 rounded-md">
  <p className="text-sm text-blue-800">
    After creating the product, manage stock in the Inventory section.
  </p>
  <Button variant="outline" size="sm" asChild>
    <Link to={`/dashboard/inventory?productId=${productId}`}>
      Manage Inventory
    </Link>
  </Button>
</div>
```

### F4.3 Update Low Stock Report

**File**: `src/routes/dashboard/inventory/low-stock.tsx`

```typescript
// Before: Fetch from Product Service with minimumStock
// After: Fetch from Inventory Service

export function LowStockReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  // Use WebSocket for real-time updates
  const { isConnected } = useInventoryWebSocket({
    channels: ['global'],
    onLowStock: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Low Stock Report</h1>
        <Badge variant={isConnected ? 'default' : 'secondary'}>
          {isConnected ? 'Real-time updates' : 'Static'}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Minimum Stock</TableHead>
            <TableHead>Deficit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.map((item) => (
            <TableRow key={`${item.productId}-${item.warehouseId}`}>
              <TableCell>{item.productId}</TableCell>
              <TableCell>{item.warehouseId}</TableCell>
              <TableCell className="text-red-600 font-bold">
                {item.quantityAvailable}
              </TableCell>
              <TableCell>{item.minimumStock}</TableCell>
              <TableCell className="text-red-600">
                -{item.deficit}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline">
                  Create Transfer
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### F4.4 Update Expired Stock Report

```typescript
// Before: Fetch products with expirationDate field
// After: Fetch from Inventory Service batches

export function ExpiredStockReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['expiring-batches'],
    queryFn: () => inventoryApi.getExpiringBatches(30), // 30 days ahead
  });

  return (
    <div>
      <h1>Expiring Stock Report</h1>
      <p className="text-muted-foreground mb-4">
        Batches expiring within the next 30 days
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Batch Number</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Expiration Date</TableHead>
            <TableHead>Days Until Expiry</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.batches.map((batch) => {
            const daysUntil = Math.ceil(
              (new Date(batch.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <TableRow key={batch.id}>
                <TableCell>{batch.productId}</TableCell>
                <TableCell>{batch.batchNumber}</TableCell>
                <TableCell>{batch.warehouseId}</TableCell>
                <TableCell>{batch.expirationDate}</TableCell>
                <TableCell className={daysUntil < 7 ? 'text-red-600 font-bold' : ''}>
                  {daysUntil} days
                </TableCell>
                <TableCell>{batch.quantityAvailable}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

### F4.5 Components to Update

| Component | Changes Required |
|-----------|------------------|
| `ProductList` | Fetch stock from Inventory Service, add real-time updates |
| `ProductForm` | Remove stock, minimumStock, expirationDate, alertDate fields |
| `ProductDetail` | Separate inventory section with real-time updates |
| `VariantList` | Fetch stock from Inventory Service |
| `VariantForm` | Remove stock field |
| `ProductWarehouseAllocation` | Use Inventory Service for quantities |
| `LowStockReport` | Use Inventory Service endpoint |
| `ExpiredStockReport` | Use Inventory Service batches endpoint |

### F4.6 Deliverables
- [ ] Update ProductList component
- [ ] Update ProductForm component
- [ ] Update ProductDetail component
- [ ] Update VariantList component
- [ ] Update VariantForm component
- [ ] Update ProductWarehouseAllocation component
- [ ] Update LowStockReport page
- [ ] Update ExpiredStockReport page
- [ ] Add real-time stock indicators

---

## Phase F5: Reports & Dashboard Updates

### F5.1 Update Dashboard Metrics

```typescript
// Dashboard should show:
// - Total products (from Product Service)
// - Total stock value (from Inventory Service)
// - Low stock alerts (from Inventory Service)
// - Expiring products (from Inventory Service batches)
// - Recent movements (from Inventory Service)

export function DashboardMetrics() {
  // Product count from Product Service
  const { data: productsData } = useQuery({
    queryKey: ['products-count'],
    queryFn: () => productApi.getAll({ limit: 0 }),
  });

  // Inventory metrics from Inventory Service
  const { data: inventoryMetrics } = useQuery({
    queryKey: ['inventory-metrics'],
    queryFn: async () => {
      const [lowStock, expiring] = await Promise.all([
        inventoryApi.getLowStock(),
        inventoryApi.getExpiringBatches(7),
      ]);
      return { lowStock, expiring };
    },
  });

  // Real-time updates
  const { isConnected } = useInventoryWebSocket({
    channels: ['global'],
    onLowStock: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
    },
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Products</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{productsData?.total || 0}</p>
        </CardContent>
      </Card>

      <Card className={inventoryMetrics?.lowStock.total > 0 ? 'border-yellow-500' : ''}>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-yellow-600">
            {inventoryMetrics?.lowStock.total || 0}
          </p>
        </CardContent>
      </Card>

      <Card className={inventoryMetrics?.expiring.total > 0 ? 'border-red-500' : ''}>
        <CardHeader>
          <CardTitle>Expiring Soon (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">
            {inventoryMetrics?.expiring.total || 0}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Real-time Active' : 'Disconnected'}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
```

### F5.2 Deliverables
- [ ] Update main dashboard with inventory metrics
- [ ] Add real-time connection status
- [ ] Create inventory summary cards
- [ ] Add quick actions for low stock items

---

## Phase F6: Stock Transfer UI

### F6.1 Transfer List Page

**File**: `src/routes/dashboard/inventory/transfers.tsx`

```typescript
export function TransfersPage() {
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['transfers', selectedWarehouse, direction],
    queryFn: () => transferApi.getByWarehouse(selectedWarehouse, direction),
    enabled: !!selectedWarehouse,
  });

  // Real-time updates for transfers
  const { isConnected } = useInventoryWebSocket({
    channels: [`warehouse:${selectedWarehouse}`],
    onTransferUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Stock Transfers</h1>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Live' : 'Static'}
          </Badge>
          <Button asChild>
            <Link to="/dashboard/inventory/transfers/new">
              Create Transfer Request
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map(wh => (
              <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={direction} onValueChange={setDirection as any}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transfer #</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers?.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell className="font-mono">{transfer.transferNumber}</TableCell>
              <TableCell>{transfer.sourceWarehouseId}</TableCell>
              <TableCell>{transfer.destinationWarehouseId}</TableCell>
              <TableCell>
                <TransferStatusBadge status={transfer.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={transfer.priority} />
              </TableCell>
              <TableCell>{formatDate(transfer.createdAt)}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/dashboard/inventory/transfers/${transfer.id}`}>
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### F6.2 Transfer Detail Page with Workflow Actions

```typescript
export function TransferDetailPage() {
  const { transferId } = useParams();
  const { data: transfer, isLoading } = useQuery({
    queryKey: ['transfer', transferId],
    queryFn: () => transferApi.getById(transferId!),
  });

  const approveTransfer = useMutation({
    mutationFn: (data: ApproveTransferInput) =>
      transferApi.approve(transferId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', transferId] });
      toast.success('Transfer approved');
    },
  });

  // ... other mutations for reject, startPicking, confirmPicked, ship, receive, putaway

  return (
    <div className="space-y-6">
      {/* Transfer Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{transfer?.transferNumber}</h1>
          <p className="text-muted-foreground">
            {transfer?.sourceWarehouseId} → {transfer?.destinationWarehouseId}
          </p>
        </div>
        <TransferStatusBadge status={transfer?.status} />
      </div>

      {/* Workflow Progress */}
      <TransferWorkflowProgress status={transfer?.status} />

      {/* Action Buttons based on status */}
      <TransferActions
        transfer={transfer}
        onApprove={approveTransfer.mutate}
        onReject={rejectTransfer.mutate}
        onStartPicking={startPicking.mutate}
        onConfirmPicked={confirmPicked.mutate}
        onShip={ship.mutate}
        onReceive={receive.mutate}
        onPutaway={putaway.mutate}
        onCancel={cancel.mutate}
      />

      {/* Transfer Items */}
      <TransferItemsTable items={transfer?.items} status={transfer?.status} />

      {/* Audit Log */}
      <TransferAuditLog logs={transfer?.logs} />
    </div>
  );
}
```

### F6.3 Deliverables
- [ ] Create transferApi module
- [ ] Create TransfersPage (list view)
- [ ] Create TransferDetailPage (detail view with actions)
- [ ] Create CreateTransferPage (request form)
- [ ] Create TransferWorkflowProgress component
- [ ] Create TransferActions component
- [ ] Create TransferItemsTable component
- [ ] Create TransferAuditLog component
- [ ] Add transfer notifications via WebSocket

---

## Phase F7: Stock Opname UI

### F7.1 Stock Opname List Page

**File**: `src/routes/dashboard/inventory/stock-opname.tsx`

```typescript
export function StockOpnamePage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['stock-opname-sessions'],
    queryFn: () => stockOpnameApi.getSessions(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Stock Opname</h1>
        <Button asChild>
          <Link to="/dashboard/inventory/stock-opname/new">
            Start New Count
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opname #</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items Counted</TableHead>
            <TableHead>Variance</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions?.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="font-mono">{session.opnameNumber}</TableCell>
              <TableCell>{session.warehouseId}</TableCell>
              <TableCell>{session.scopeType}</TableCell>
              <TableCell>
                <OpnameStatusBadge status={session.status} />
              </TableCell>
              <TableCell>{session.totalItemsCounted}</TableCell>
              <TableCell className={session.totalVarianceQty !== 0 ? 'text-red-600' : ''}>
                {session.totalVarianceQty}
              </TableCell>
              <TableCell>{formatDate(session.createdAt)}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/dashboard/inventory/stock-opname/${session.id}`}>
                    {session.status === 'in_progress' ? 'Continue' : 'View'}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### F7.2 Stock Opname Counting Interface

```typescript
export function StockOpnameCountingPage() {
  const { sessionId } = useParams();
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useQuery({
    queryKey: ['stock-opname', sessionId],
    queryFn: () => stockOpnameApi.getSession(sessionId!),
  });

  const countMutation = useMutation({
    mutationFn: (data: { barcode: string; quantity: number }) =>
      stockOpnameApi.count(sessionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname', sessionId] });
      setBarcode('');
      barcodeInputRef.current?.focus();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>{session?.opnameNumber}</h1>
          <p className="text-muted-foreground">
            {session?.totalItemsCounted} of {session?.items?.length} items counted
          </p>
        </div>
        <OpnameStatusBadge status={session?.status} />
      </div>

      {/* Progress Bar */}
      <Progress
        value={(session?.totalItemsCounted / session?.items?.length) * 100}
      />

      {/* Barcode Scanner Input */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Barcode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              ref={barcodeInputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Show quantity input dialog
                }
              }}
            />
            <Button onClick={() => {/* Show quantity dialog */}}>
              Enter Count
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>System Qty</TableHead>
            <TableHead>Counted Qty</TableHead>
            <TableHead>Variance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session?.items?.map((item) => (
            <TableRow
              key={item.id}
              className={
                item.countedQuantity === null
                  ? 'bg-yellow-50'
                  : item.varianceQuantity !== 0
                    ? 'bg-red-50'
                    : ''
              }
            >
              <TableCell>{item.productId}</TableCell>
              <TableCell>
                {item.rack && `${item.rack}-`}
                {item.bin && `${item.bin}`}
              </TableCell>
              <TableCell>{item.systemQuantity}</TableCell>
              <TableCell>
                {item.countedQuantity ?? '-'}
              </TableCell>
              <TableCell className={item.varianceQuantity !== 0 ? 'text-red-600 font-bold' : ''}>
                {item.varianceQuantity ?? '-'}
              </TableCell>
              <TableCell>
                <Badge variant={item.countedQuantity !== null ? 'default' : 'secondary'}>
                  {item.countedQuantity !== null ? 'Counted' : 'Pending'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {/* Cancel */}}>
          Cancel Session
        </Button>
        <Button
          onClick={() => stockOpnameApi.finalize(sessionId!)}
          disabled={session?.items?.some(i => i.countedQuantity === null)}
        >
          Finalize Counting
        </Button>
      </div>
    </div>
  );
}
```

### F7.3 Deliverables
- [ ] Create stockOpnameApi module
- [ ] Create StockOpnamePage (list view)
- [ ] Create CreateStockOpnamePage (create session)
- [ ] Create StockOpnameCountingPage (barcode scanning interface)
- [ ] Create StockOpnameReviewPage (variance review)
- [ ] Create VarianceReport component
- [ ] Add keyboard shortcuts for barcode scanning

---

## Migration Checklist

### Pre-Migration
- [ ] Ensure backend Phases 1-5 are complete
- [ ] Create feature branch for frontend refactoring
- [ ] Document current API usage in all components
- [ ] Set up WebSocket testing environment

### Phase F1-F2 (API Changes)
- [ ] Update TypeScript interfaces
- [ ] Update API modules
- [ ] Add new inventory endpoints
- [ ] Remove deprecated stock endpoints

### Phase F3 (WebSocket)
- [ ] Implement WebSocket hook
- [ ] Add connection management
- [ ] Implement real-time notifications

### Phase F4 (Components)
- [ ] Update all product components
- [ ] Update all variant components
- [ ] Update all location components
- [ ] Update reports

### Phase F5-F7 (New Features)
- [ ] Build dashboard updates
- [ ] Build transfer UI
- [ ] Build stock opname UI

### Post-Migration
- [ ] Full regression testing
- [ ] Performance testing with WebSocket
- [ ] Update user documentation
- [ ] Train users on new features

---

## Environment Variables

Add to `.env`:

```bash
# Service URLs
VITE_PRODUCT_SERVICE_URL=http://localhost:8788
VITE_INVENTORY_SERVICE_URL=http://localhost:8792
VITE_ACCOUNTING_SERVICE_URL=http://localhost:8794

# WebSocket
VITE_INVENTORY_WS_URL=ws://localhost:8792/ws
```

---

**Document Status**: Complete
**Created**: 2025-12-08
**Related Documents**:
- `docs/DDD_HEXAGONAL_BOUNDARY_REVIEW.md`
- `docs/DDD_REFACTORING_ROADMAP.md`
- `docs/ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md`
