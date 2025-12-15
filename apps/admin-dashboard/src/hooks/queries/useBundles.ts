/**
 * Bundle Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching.
 * DDD-compliant - bundle stock is virtual (calculated from component availability).
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates for mutations
 * - Virtual stock calculation from Inventory Service
 * - Type-safe API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bundleApi,
  type ProductBundle,
  type BundleItem,
  type CreateBundleInput,
  type BundleStockResponse,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all bundles
 *
 * @param filters.status - Filter by bundle status
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useBundles(
  filters?: { status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.bundles.list(filters),
    queryFn: () => bundleApi.getAll(),
    enabled,
  });
}

/**
 * Hook to fetch a single bundle by ID with its items
 *
 * @param id - Bundle ID
 * @param options.enabled - Enable/disable query (default: true)
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
 * Returns real-time bundle availability calculated from component stock
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
    // Refresh frequently since it's calculated from live inventory
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Hook to fetch bundle with its available stock data
 *
 * @param id - Bundle ID
 * @param warehouseId - Optional warehouse ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useBundleWithStock(
  id: string,
  warehouseId?: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: [...queryKeys.bundles.detail(id), 'with-stock', warehouseId] as const,
    queryFn: async () => {
      const [bundleData, stockData] = await Promise.all([
        bundleApi.getById(id),
        bundleApi.getAvailableStock(id, warehouseId).catch(() => null),
      ]);

      return {
        ...bundleData,
        stockInfo: stockData,
      };
    },
    enabled: enabled && !!id,
    staleTime: 10 * 1000,
  });
}

/**
 * Hook to create a new bundle
 *
 * Features:
 * - Automatic cache invalidation on success
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
 * Hook to update an existing bundle
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<CreateBundleInput, 'items'>>;
    }) => bundleApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.all });

      const previousBundles = queryClient.getQueryData(
        queryKeys.bundles.lists()
      );
      const previousBundle = queryClient.getQueryData(
        queryKeys.bundles.detail(id)
      );

      return { previousBundles, previousBundle };
    },

    onError: (err, { id }, context) => {
      if (context?.previousBundles) {
        queryClient.setQueryData(
          queryKeys.bundles.lists(),
          context.previousBundles
        );
      }
      if (context?.previousBundle) {
        queryClient.setQueryData(
          queryKeys.bundles.detail(id),
          context.previousBundle
        );
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bundles.detail(id),
      });
    },
  });
}

/**
 * Hook to update bundle items
 *
 * Features:
 * - Automatic cache invalidation on success
 * - Invalidates stock calculation cache
 */
export function useUpdateBundleItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: BundleItem[] }) =>
      bundleApi.updateItems(id, items),

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bundles.detail(id),
      });
      // Invalidate available stock since items changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.bundles.availableStock(id),
      });
    },
  });
}

/**
 * Hook to delete a bundle
 *
 * Features:
 * - Optimistic removal from cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bundleApi.delete(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bundles.all });

      const previousBundles = queryClient.getQueryData(
        queryKeys.bundles.lists()
      );

      // Remove from list cache
      queryClient.setQueryData(
        queryKeys.bundles.lists(),
        (old: { bundles: ProductBundle[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            bundles: old.bundles.filter((b) => b.id !== id),
            total: old.total - 1,
          };
        }
      );

      // Remove detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.bundles.detail(id),
      });

      return { previousBundles };
    },

    onError: (err, id, context) => {
      if (context?.previousBundles) {
        queryClient.setQueryData(
          queryKeys.bundles.lists(),
          context.previousBundles
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles.all });
    },
  });
}
