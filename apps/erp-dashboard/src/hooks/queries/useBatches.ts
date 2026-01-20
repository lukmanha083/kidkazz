/**
 * Batch Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for inventory batch management.
 * Batches are used for expiration tracking (FEFO - First Expired First Out).
 *
 * Features:
 * - Proper filter serialization (no 'undefined' strings in query params)
 * - Optimistic locking via version field for mutations
 * - Automatic cache invalidation
 * - Type-safe API calls
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type BatchAdjustInput,
  type BatchFilters,
  type BatchStatusInput,
  type CreateBatchInput,
  type InventoryBatch,
  batchApi,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch batches with optional filters
 *
 * @param filters.productId - Filter by product ID
 * @param filters.warehouseId - Filter by warehouse ID
 * @param filters.status - Filter by batch status
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useBatches(filters?: BatchFilters, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchApi.getAll(filters),
    enabled,
  });
}

/**
 * Hook to fetch a single batch by ID
 */
export function useBatch(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.detail(id),
    queryFn: () => batchApi.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch batches expiring within N days
 */
export function useExpiringBatches(days = 30, options?: { enabled?: boolean }) {
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
    mutationFn: (data: CreateBatchInput) => batchApi.create(data),
    onSuccess: () => {
      // Invalidate all batch queries
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      // Also invalidate inventory queries since batch affects inventory
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to adjust batch quantity
 *
 * Features:
 * - Requires version property for optimistic locking
 * - Handles version conflict errors (409)
 * - Invalidates cache on success
 *
 * @example
 * const adjustBatch = useAdjustBatch();
 * adjustBatch.mutate({
 *   batchId: 'batch-123',
 *   data: {
 *     quantity: 10,
 *     reason: 'Damaged goods',
 *     version: currentBatch.version // Required for optimistic locking
 *   }
 * });
 */
export function useAdjustBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: BatchAdjustInput }) =>
      batchApi.adjust(batchId, data),

    // Optimistic update
    onMutate: async ({ batchId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.batches.all });

      // Snapshot the previous value
      const previousBatches = queryClient.getQueryData(queryKeys.batches.lists());
      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId));

      // Optimistically update batch detail
      queryClient.setQueryData(
        queryKeys.batches.detail(batchId),
        (old: InventoryBatch | undefined) => {
          if (!old) return old;
          return {
            ...old,
            quantityAvailable: old.quantityAvailable + data.quantity,
            version: old.version + 1,
            updatedAt: new Date().toISOString(),
          };
        }
      );

      // Optimistically update batches list
      queryClient.setQueriesData(
        { queryKey: queryKeys.batches.lists() },
        (old: { batches: InventoryBatch[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            batches: old.batches.map((batch) =>
              batch.id === batchId
                ? {
                    ...batch,
                    quantityAvailable: batch.quantityAvailable + data.quantity,
                    version: batch.version + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : batch
            ),
          };
        }
      );

      return { previousBatches, previousBatch };
    },

    // Rollback on error
    onError: (err, { batchId }, context) => {
      if (context?.previousBatches) {
        queryClient.setQueryData(queryKeys.batches.lists(), context.previousBatches);
      }
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(batchId), context.previousBatch);
      }
    },

    // Always refetch after success to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to update batch status
 *
 * Features:
 * - Requires version property for optimistic locking
 * - Handles version conflict errors (409)
 * - Invalidates cache on success
 *
 * @example
 * const updateStatus = useUpdateBatchStatus();
 * updateStatus.mutate({
 *   batchId: 'batch-123',
 *   status: 'quarantined',
 *   version: currentBatch.version // Required for optimistic locking
 * });
 */
export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      status,
      version,
    }: { batchId: string; status: BatchStatusInput['status']; version: number }) =>
      batchApi.updateStatus(batchId, { status, version }),

    // Optimistic update
    onMutate: async ({ batchId, status, version }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.batches.all });

      // Snapshot the previous value
      const previousBatches = queryClient.getQueryData(queryKeys.batches.lists());
      const previousBatch = queryClient.getQueryData(queryKeys.batches.detail(batchId));

      // Optimistically update batch detail
      queryClient.setQueryData(
        queryKeys.batches.detail(batchId),
        (old: InventoryBatch | undefined) => {
          if (!old) return old;
          return {
            ...old,
            status,
            version: old.version + 1,
            updatedAt: new Date().toISOString(),
          };
        }
      );

      // Optimistically update batches list
      queryClient.setQueriesData(
        { queryKey: queryKeys.batches.lists() },
        (old: { batches: InventoryBatch[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            batches: old.batches.map((batch) =>
              batch.id === batchId
                ? {
                    ...batch,
                    status,
                    version: batch.version + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : batch
            ),
          };
        }
      );

      return { previousBatches, previousBatch };
    },

    // Rollback on error
    onError: (err, { batchId }, context) => {
      if (context?.previousBatches) {
        queryClient.setQueryData(queryKeys.batches.lists(), context.previousBatches);
      }
      if (context?.previousBatch) {
        queryClient.setQueryData(queryKeys.batches.detail(batchId), context.previousBatch);
      }
    },

    // Always refetch after success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      // Invalidate expiring/expired queries as status change may affect them
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to delete a batch
 */
export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => batchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}
