/**
 * React Query Configuration
 *
 * Centralized configuration for @tanstack/react-query
 * Includes default query and mutation options, error handling, and caching strategy.
 */

import { QueryClient } from '@tanstack/react-query';
import type { OpnameStatus, TransferStatus } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds (data considered fresh for this duration)
      staleTime: 30 * 1000,

      // Cache time: 5 minutes (unused data kept in cache)
      gcTime: 5 * 60 * 1000,

      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (disabled - we use WebSocket for real-time updates)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount if data is stale
      refetchOnMount: 'always' as const,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Query Keys
 *
 * Centralized query key factory for consistent cache management
 * All domains defined for DDD-compliant architecture
 */

export const queryKeys = {
  // Warehouses
  warehouses: {
    all: ['warehouses'] as const,
    lists: () => [...queryKeys.warehouses.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.warehouses.lists(), filters] as const,
    details: () => [...queryKeys.warehouses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (filters?: { productId?: string; warehouseId?: string }) =>
      [...queryKeys.inventory.lists(), filters] as const,
    details: () => [...queryKeys.inventory.all, 'detail'] as const,
    detail: (productId: string, warehouseId?: string) =>
      [...queryKeys.inventory.details(), productId, warehouseId] as const,
    movements: (productId: string) => [...queryKeys.inventory.all, 'movements', productId] as const,
    lowStock: (warehouseId?: string) =>
      [...queryKeys.inventory.all, 'low-stock', warehouseId] as const,
  },

  // Products
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

  // Variants
  variants: {
    all: ['variants'] as const,
    lists: () => [...queryKeys.variants.all, 'list'] as const,
    list: (productId?: string) => [...queryKeys.variants.lists(), { productId }] as const,
    details: () => [...queryKeys.variants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.variants.all, 'detail', id] as const,
  },

  // Bundles
  bundles: {
    all: ['bundles'] as const,
    lists: () => [...queryKeys.bundles.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...queryKeys.bundles.lists(), filters] as const,
    details: () => [...queryKeys.bundles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bundles.all, 'detail', id] as const,
    availableStock: (id: string, warehouseId?: string) =>
      [...queryKeys.bundles.all, 'available-stock', id, warehouseId] as const,
  },

  // Batches (Inventory Batches for expiration tracking)
  batches: {
    all: ['batches'] as const,
    lists: () => [...queryKeys.batches.all, 'list'] as const,
    list: (filters?: { productId?: string; warehouseId?: string; status?: string }) =>
      [...queryKeys.batches.lists(), filters] as const,
    details: () => [...queryKeys.batches.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.batches.all, 'detail', id] as const,
    expiring: (days: number) => [...queryKeys.batches.all, 'expiring', days] as const,
    expired: () => [...queryKeys.batches.all, 'expired'] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...queryKeys.categories.lists(), filters] as const,
    active: () => [...queryKeys.categories.all, 'active'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },

  // Stock Transfers (Phase 7)
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (filters?: {
      warehouseId?: string;
      direction?: 'inbound' | 'outbound';
      status?: TransferStatus;
    }) => [...queryKeys.transfers.lists(), filters] as const,
    details: () => [...queryKeys.transfers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transfers.all, 'detail', id] as const,
    logs: (transferId: string) => [...queryKeys.transfers.all, 'logs', transferId] as const,
  },

  // Stock Opname (Phase 8)
  stockOpname: {
    all: ['stock-opname'] as const,
    lists: () => [...queryKeys.stockOpname.all, 'list'] as const,
    list: (filters?: { warehouseId?: string; status?: OpnameStatus }) =>
      [...queryKeys.stockOpname.lists(), filters] as const,
    details: () => [...queryKeys.stockOpname.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.stockOpname.all, 'detail', id] as const,
    items: (sessionId: string) => [...queryKeys.stockOpname.all, 'items', sessionId] as const,
  },

  // UOMs
  uoms: {
    all: ['uoms'] as const,
    lists: () => [...queryKeys.uoms.all, 'list'] as const,
    productUOMs: (productId: string) => [...queryKeys.uoms.all, 'product', productId] as const,
    detail: (code: string) => [...queryKeys.uoms.all, 'detail', code] as const,
  },

  // Business Partner - Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: { status?: string; type?: string; search?: string }) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Business Partner - Suppliers
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters?: { status?: string; search?: string }) =>
      [...queryKeys.suppliers.lists(), filters] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
  },

  // Business Partner - Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters?: {
      status?: string;
      department?: string;
      managerId?: string;
      search?: string;
    }) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },
} as const;
