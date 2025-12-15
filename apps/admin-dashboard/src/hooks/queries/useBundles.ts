/**
 * Bundle Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for product bundle management.
 * Bundles are composed of multiple products sold together.
 *
 * Features:
 * - Filters are passed to bundleApi.getAll (matching cache key with API call)
 * - Optimistic updates for mutations (both list and detail caches)
 * - Virtual stock calculation from Inventory Service
 * - Automatic cache invalidation
 * - Type-safe API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bundleApi,
  type ProductBundle,
  type BundleItem,
  type CreateBundleInput,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all bundles with optional filters
 *
 * @param filters.status - Filter by bundle status ('active' | 'inactive')
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useBundles(
  filters?: { status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.bundles.list(filters),
    queryFn: () => bundleApi.getAll(filters), // Filters passed to API to match cache key
    enabled,
  });
}

/**
 * Hook to fetch a single bundle by ID with its items
 */
export function useBundle(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.bundles.detail(id),
    queryFn: () => bundleApi.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch bundle available stock (virtual calculation)
 *
 * Returns the maximum number of bundles that can be assembled
 * based on component product availability in the Inventory Service.
 *
 * @param bundleId - Bundle ID
 * @param warehouseId - Optional warehouse ID for warehouse-specific calculation
 * @param options.enabled - Enable/disable query (default: true)
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

/**
 * Hook to create a bundle
 */
export function useCreateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBundleInput) => bundleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
    },
  });
}

/**
 * Hook to update a bundle
 *
 * Features:
 * - Optimistic updates for both bundles list and bundle detail caches
 * - Merges incoming partial data into matching bundle objects
 * - Rollback on error
 * - Cache invalidation on success
 *
 * @example
 * const updateBundle = useUpdateBundle();
 * updateBundle.mutate({
 *   id: 'bundle-123',
 *   data: {
 *     bundleName: 'Updated Bundle Name',
 *     bundlePrice: 99.99,
 *   }
 * });
 */
export function useUpdateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<CreateBundleInput, 'items'>> }) =>
      bundleApi.update(id, data),

    // Optimistic update - update cache before API call completes
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.all });

      // Snapshot the previous values for potential rollback
      const previousBundles = queryClient.getQueryData(queryKeys.bundles.lists());
      const previousBundle = queryClient.getQueryData<{ bundle: ProductBundle; items: BundleItem[] }>(
        queryKeys.bundles.detail(id)
      );

      // Optimistically update the bundles list cache
      // Find and update the matching bundle in all list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.bundles.lists() },
        (old: { bundles: ProductBundle[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            bundles: old.bundles.map((bundle) =>
              bundle.id === id
                ? {
                    ...bundle,
                    ...data,
                    updatedAt: new Date(),
                  }
                : bundle
            ),
          };
        }
      );

      // Optimistically update the bundle detail cache
      queryClient.setQueryData(
        queryKeys.bundles.detail(id),
        (old: { bundle: ProductBundle; items: BundleItem[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            bundle: {
              ...old.bundle,
              ...data,
              updatedAt: new Date(),
            },
          };
        }
      );

      // Return the previous state for rollback on error
      return { previousBundles, previousBundle };
    },

    // Rollback on error using the previous state
    onError: (err, { id }, context) => {
      // Restore bundles list cache
      if (context?.previousBundles) {
        queryClient.setQueryData(queryKeys.bundles.lists(), context.previousBundles);
      }
      // Restore bundle detail cache
      if (context?.previousBundle) {
        queryClient.setQueryData(queryKeys.bundles.detail(id), context.previousBundle);
      }
    },

    // Invalidate and refetch on success to ensure consistency with server
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.detail(id) });
    },
  });
}

/**
 * Hook to update bundle items
 */
export function useUpdateBundleItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: BundleItem[] }) =>
      bundleApi.updateItems(id, items),

    // Optimistic update for bundle items
    onMutate: async ({ id, items }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.detail(id) });

      const previousBundle = queryClient.getQueryData<{ bundle: ProductBundle; items: BundleItem[] }>(
        queryKeys.bundles.detail(id)
      );

      // Optimistically update bundle detail with new items
      queryClient.setQueryData(
        queryKeys.bundles.detail(id),
        (old: { bundle: ProductBundle; items: BundleItem[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: items.map((item, index) => ({
              ...item,
              id: item.id || `temp-${index}`,
              bundleId: id,
            })),
          };
        }
      );

      return { previousBundle };
    },

    onError: (err, { id }, context) => {
      if (context?.previousBundle) {
        queryClient.setQueryData(queryKeys.bundles.detail(id), context.previousBundle);
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.detail(id) });
      // Also invalidate available stock as items change affects stock calculation
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.availableStock(id) });
    },
  });
}

/**
 * Hook to update bundle stock
 */
export function useUpdateBundleStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, availableStock }: { id: string; availableStock: number }) =>
      bundleApi.updateStock(id, availableStock),

    onMutate: async ({ id, availableStock }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.all });

      const previousBundles = queryClient.getQueryData(queryKeys.bundles.lists());
      const previousBundle = queryClient.getQueryData<{ bundle: ProductBundle; items: BundleItem[] }>(
        queryKeys.bundles.detail(id)
      );

      // Optimistically update bundles list
      queryClient.setQueriesData(
        { queryKey: queryKeys.bundles.lists() },
        (old: { bundles: ProductBundle[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            bundles: old.bundles.map((bundle) =>
              bundle.id === id
                ? { ...bundle, availableStock, updatedAt: new Date() }
                : bundle
            ),
          };
        }
      );

      // Optimistically update bundle detail
      queryClient.setQueryData(
        queryKeys.bundles.detail(id),
        (old: { bundle: ProductBundle; items: BundleItem[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            bundle: { ...old.bundle, availableStock, updatedAt: new Date() },
          };
        }
      );

      return { previousBundles, previousBundle };
    },

    onError: (err, { id }, context) => {
      if (context?.previousBundles) {
        queryClient.setQueryData(queryKeys.bundles.lists(), context.previousBundles);
      }
      if (context?.previousBundle) {
        queryClient.setQueryData(queryKeys.bundles.detail(id), context.previousBundle);
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
    },
  });
}

/**
 * Hook to delete a bundle
 */
export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bundleApi.delete(id),

    // Optimistic delete from list
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.all });

      const previousBundles = queryClient.getQueryData(queryKeys.bundles.lists());

      // Optimistically remove from list
      queryClient.setQueriesData(
        { queryKey: queryKeys.bundles.lists() },
        (old: { bundles: ProductBundle[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            bundles: old.bundles.filter((bundle) => bundle.id !== id),
            total: old.total - 1,
          };
        }
      );

      return { previousBundles };
    },

    onError: (err, id, context) => {
      if (context?.previousBundles) {
        queryClient.setQueryData(queryKeys.bundles.lists(), context.previousBundles);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
    },
  });
}
