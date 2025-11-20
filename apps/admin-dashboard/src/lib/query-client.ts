/**
 * React Query Configuration
 *
 * Centralized configuration for @tanstack/react-query
 * Includes default query and mutation options, error handling, and caching strategy.
 */

import { QueryClient } from '@tanstack/react-query';

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
 */
export const queryKeys = {
  // Warehouses
  warehouses: {
    all: ['warehouses'] as const,
    lists: () => [...queryKeys.warehouses.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.warehouses.lists(), filters] as const,
    details: () => [...queryKeys.warehouses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.warehouses.details(), id] as const,
  },

  // Inventory
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
  },

  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
} as const;
