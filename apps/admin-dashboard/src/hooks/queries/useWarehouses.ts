/**
 * Warehouse Queries (React Query + WebSocket)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching,
 * plus WebSocket for real-time updates.
 *
 * Features:
 * - Automatic cache invalidation via WebSocket
 * - Optimistic updates for mutations
 * - Proper error handling and retry logic
 * - Type-safe API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi, type Warehouse, type CreateWarehouseInput } from '../../lib/api';
import { queryKeys } from '../../lib/query-client';
import { useWebSocket } from '../useWebSocket';

/**
 * Hook to fetch all warehouses
 *
 * @param options.enabled - Enable/disable query (default: true)
 * @param options.realtime - Enable WebSocket real-time updates (default: true)
 */
export function useWarehouses(options?: {
  enabled?: boolean;
  realtime?: boolean;
}) {
  const { enabled = true, realtime = true } = options || {};
  const queryClient = useQueryClient();

  // Fetch warehouses
  const query = useQuery({
    queryKey: queryKeys.warehouses.lists(),
    queryFn: () => warehouseApi.getAll(),
    enabled,
  });

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    type: 'warehouses',
    enabled: realtime && enabled,
    // WebSocket automatically invalidates cache when updates are received
  });

  return {
    warehouses: query.data?.warehouses || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    wsConnected,
  };
}

/**
 * Hook to fetch active warehouses only
 */
export function useActiveWarehouses(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  const query = useQuery({
    queryKey: queryKeys.warehouses.list({ status: 'active' }),
    queryFn: () => warehouseApi.getActive(),
    enabled,
  });

  return {
    warehouses: query.data?.warehouses || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single warehouse by ID
 */
export function useWarehouse(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  const query = useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: () => warehouseApi.getById(id),
    enabled: enabled && !!id,
  });

  return {
    warehouse: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to create a new warehouse
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseInput) => warehouseApi.create(data),

    // Optimistic update
    onMutate: async (newWarehouse) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.warehouses.lists(),
      });

      // Snapshot previous value
      const previousWarehouses = queryClient.getQueryData(
        queryKeys.warehouses.lists()
      );

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.warehouses.lists(),
        (old: any) => {
          if (!old) return old;

          const optimisticWarehouse: Partial<Warehouse> = {
            id: `temp-${Date.now()}`,
            ...newWarehouse,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            warehouses: [...old.warehouses, optimisticWarehouse],
            total: old.total + 1,
          };
        }
      );

      return { previousWarehouses };
    },

    // Rollback on error
    onError: (err, newWarehouse, context) => {
      if (context?.previousWarehouses) {
        queryClient.setQueryData(
          queryKeys.warehouses.lists(),
          context.previousWarehouses
        );
      }
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
    },
  });
}

/**
 * Hook to update an existing warehouse
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateWarehouseInput>;
    }) => warehouseApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.warehouses.all,
      });

      const previousWarehouses = queryClient.getQueryData(
        queryKeys.warehouses.lists()
      );
      const previousWarehouse = queryClient.getQueryData(
        queryKeys.warehouses.detail(id)
      );

      // Update list cache
      queryClient.setQueryData(
        queryKeys.warehouses.lists(),
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            warehouses: old.warehouses.map((w: Warehouse) =>
              w.id === id ? { ...w, ...data, updatedAt: new Date().toISOString() } : w
            ),
          };
        }
      );

      // Update detail cache
      queryClient.setQueryData(
        queryKeys.warehouses.detail(id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...data, updatedAt: new Date().toISOString() };
        }
      );

      return { previousWarehouses, previousWarehouse };
    },

    onError: (err, { id }, context) => {
      if (context?.previousWarehouses) {
        queryClient.setQueryData(
          queryKeys.warehouses.lists(),
          context.previousWarehouses
        );
      }
      if (context?.previousWarehouse) {
        queryClient.setQueryData(
          queryKeys.warehouses.detail(id),
          context.previousWarehouse
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
    },
  });
}

/**
 * Hook to delete a warehouse
 *
 * Features:
 * - Optimistic removal from cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => warehouseApi.delete(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.warehouses.all,
      });

      const previousWarehouses = queryClient.getQueryData(
        queryKeys.warehouses.lists()
      );

      // Remove from list cache
      queryClient.setQueryData(
        queryKeys.warehouses.lists(),
        (old: any) => {
          if (!old) return old;

          return {
            warehouses: old.warehouses.filter((w: Warehouse) => w.id !== id),
            total: old.total - 1,
          };
        }
      );

      // Remove detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.warehouses.detail(id),
      });

      return { previousWarehouses };
    },

    onError: (err, id, context) => {
      if (context?.previousWarehouses) {
        queryClient.setQueryData(
          queryKeys.warehouses.lists(),
          context.previousWarehouses
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
    },
  });
}
