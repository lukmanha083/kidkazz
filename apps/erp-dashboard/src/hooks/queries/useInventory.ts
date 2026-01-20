/**
 * Inventory Queries (React Query + WebSocket)
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Inventory,
  type InventoryAdjustmentInput,
  type InventoryMovement,
  inventoryApi,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';
import { useWebSocket } from '../useWebSocket';

/**
 * Hook to fetch all inventory records
 *
 * @param filters.productId - Filter by product ID
 * @param filters.warehouseId - Filter by warehouse ID
 * @param options.enabled - Enable/disable query (default: true)
 * @param options.realtime - Enable WebSocket real-time updates (default: true)
 */
export function useInventory(
  filters?: { productId?: string; warehouseId?: string },
  options?: { enabled?: boolean; realtime?: boolean }
) {
  const { enabled = true, realtime = true } = options || {};
  const queryClient = useQueryClient();

  // Fetch inventory
  const query = useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: () => inventoryApi.getAll(filters),
    enabled,
  });

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    type: 'inventory',
    subscription: filters,
    enabled: realtime && enabled,
    // WebSocket automatically invalidates cache when updates are received
  });

  return {
    inventory: query.data?.inventory || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    wsConnected,
  };
}

/**
 * Hook to fetch inventory for a specific product across all warehouses
 */
export function useProductInventory(productId: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  const query = useQuery({
    queryKey: queryKeys.inventory.detail(productId),
    queryFn: () => inventoryApi.getByProduct(productId),
    enabled: enabled && !!productId,
  });

  return {
    productId: query.data?.productId,
    warehouses: query.data?.warehouses || [],
    totalAvailable: query.data?.totalAvailable || 0,
    totalReserved: query.data?.totalReserved || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch inventory for a specific product-warehouse combination
 */
export function useProductWarehouseInventory(
  productId: string,
  warehouseId: string,
  options?: { enabled?: boolean; realtime?: boolean }
) {
  const { enabled = true, realtime = true } = options || {};

  const query = useQuery({
    queryKey: queryKeys.inventory.detail(productId, warehouseId),
    queryFn: () => inventoryApi.getByProductAndWarehouse(productId, warehouseId),
    enabled: enabled && !!productId && !!warehouseId,
  });

  // WebSocket connection for real-time updates on this specific inventory item
  const { isConnected: wsConnected } = useWebSocket({
    type: 'inventory',
    subscription: { productId, warehouseId },
    enabled: realtime && enabled && !!productId && !!warehouseId,
  });

  return {
    inventory: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    wsConnected,
  };
}

/**
 * Hook to fetch inventory movement history for a product
 */
export function useInventoryMovements(
  productId: string,
  options?: { limit?: number; enabled?: boolean }
) {
  const { limit, enabled = true } = options || {};

  const query = useQuery({
    queryKey: queryKeys.inventory.movements(productId),
    queryFn: () => inventoryApi.getMovements(productId, limit),
    enabled: enabled && !!productId,
  });

  return {
    movements: query.data?.movements || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to adjust inventory (add/remove/adjust stock)
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 * - Handles both warehouse and POS sources
 */
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InventoryAdjustmentInput) => inventoryApi.adjust(data),

    // Optimistic update
    onMutate: async (adjustment) => {
      const { productId, warehouseId, quantity, movementType, source = 'warehouse' } = adjustment;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.inventory.all,
      });

      // Snapshot previous values
      const previousInventoryList = queryClient.getQueryData(queryKeys.inventory.lists());
      const previousProductInventory = queryClient.getQueryData(
        queryKeys.inventory.detail(productId, warehouseId)
      );

      // Calculate new quantity
      queryClient.setQueryData(queryKeys.inventory.detail(productId, warehouseId), (old: any) => {
        if (!old) return old;

        let newQuantity = old.quantityAvailable;
        if (movementType === 'in') {
          newQuantity += quantity;
        } else if (movementType === 'out') {
          // BUSINESS RULE: Check warehouse operations
          if (source === 'warehouse' && old.quantityAvailable < quantity) {
            // Don't update optimistically if it would violate business rule
            return old;
          }
          newQuantity -= quantity;
        } else {
          // adjustment - set to exact quantity
          newQuantity = quantity;
        }

        return {
          ...old,
          quantityAvailable: newQuantity,
          updatedAt: new Date().toISOString(),
        };
      });

      // Update list cache
      queryClient.setQueryData(queryKeys.inventory.lists(), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          inventory: old.inventory.map((inv: Inventory) => {
            if (inv.productId === productId && inv.warehouseId === warehouseId) {
              let newQuantity = inv.quantityAvailable;
              if (movementType === 'in') {
                newQuantity += quantity;
              } else if (movementType === 'out') {
                if (source === 'warehouse' && inv.quantityAvailable < quantity) {
                  return inv; // Don't update if would violate business rule
                }
                newQuantity -= quantity;
              } else {
                newQuantity = quantity;
              }

              return {
                ...inv,
                quantityAvailable: newQuantity,
                updatedAt: new Date().toISOString(),
              };
            }
            return inv;
          }),
        };
      });

      return { previousInventoryList, previousProductInventory };
    },

    // Rollback on error
    onError: (err, adjustment, context) => {
      const { productId, warehouseId } = adjustment;

      if (context?.previousInventoryList) {
        queryClient.setQueryData(queryKeys.inventory.lists(), context.previousInventoryList);
      }
      if (context?.previousProductInventory) {
        queryClient.setQueryData(
          queryKeys.inventory.detail(productId, warehouseId),
          context.previousProductInventory
        );
      }
    },

    // Refetch on success
    onSuccess: (data, adjustment) => {
      const { productId, warehouseId } = adjustment;

      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.all,
      });

      // Invalidate movement history
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements(productId),
      });
    },
  });
}

/**
 * Hook to set minimum stock level for an inventory item
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Rollback on error
 */
export function useSetMinimumStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inventoryId,
      minimumStock,
    }: {
      inventoryId: string;
      minimumStock: number;
    }) => inventoryApi.setMinimumStock(inventoryId, minimumStock),

    // Optimistic update
    onMutate: async ({ inventoryId, minimumStock }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.inventory.all,
      });

      const previousInventory = queryClient.getQueryData(queryKeys.inventory.lists());

      // Update cache
      queryClient.setQueryData(queryKeys.inventory.lists(), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          inventory: old.inventory.map((inv: Inventory) =>
            inv.id === inventoryId
              ? { ...inv, minimumStock, updatedAt: new Date().toISOString() }
              : inv
          ),
        };
      });

      return { previousInventory };
    },

    onError: (err, variables, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(queryKeys.inventory.lists(), context.previousInventory);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.all,
      });
    },
  });
}
