/**
 * Variant Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching.
 * DDD-compliant - stock is managed by Inventory Service.
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates for mutations
 * - Proper error handling and retry logic
 * - Type-safe API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  variantApi,
  inventoryApi,
  type ProductVariant,
  type VariantWithInventory,
  type CreateVariantInput,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all variants, optionally filtered by product
 *
 * @param productId - Optional product ID to filter variants
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useVariants(
  productId?: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.variants.list(productId),
    queryFn: () => variantApi.getAll(productId),
    enabled,
  });
}

/**
 * Hook to fetch variants with inventory data
 *
 * @param productId - Optional product ID to filter variants
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useVariantsWithInventory(
  productId?: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: [...queryKeys.variants.list(productId), 'with-inventory'] as const,
    queryFn: async () => {
      const { variants, total } = await variantApi.getAll(productId);

      // Fetch inventory for each variant in parallel
      const variantsWithInventory: VariantWithInventory[] = await Promise.all(
        variants.map(async (variant) => {
          try {
            // Inventory for variants uses variantId filter
            const inventoryData = await inventoryApi.getAll({
              productId: variant.productId,
            });

            // Find inventory entries for this specific variant
            const variantInventory = inventoryData.inventory.filter(
              (inv) => inv.variantId === variant.id
            );

            const totalAvailable = variantInventory.reduce(
              (sum, inv) => sum + inv.quantityAvailable,
              0
            );
            const totalReserved = variantInventory.reduce(
              (sum, inv) => sum + inv.quantityReserved,
              0
            );
            const minimumStock = variantInventory[0]?.minimumStock || 0;

            return {
              ...variant,
              inventory: {
                totalAvailable,
                totalReserved,
                totalInTransit: 0,
                minimumStock,
                isLowStock: totalAvailable < minimumStock,
                warehouses: variantInventory,
              },
            };
          } catch {
            return variant;
          }
        })
      );

      return { variants: variantsWithInventory, total };
    },
    enabled,
  });
}

/**
 * Hook to fetch a single variant by ID
 *
 * @param id - Variant ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useVariant(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.variants.detail(id),
    queryFn: () => variantApi.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to create a new variant
 *
 * Features:
 * - Automatic cache invalidation on success
 */
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVariantInput) => variantApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      // Also invalidate the parent product's detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
    },
  });
}

/**
 * Hook to update an existing variant
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<CreateVariantInput, 'productId'>>;
    }) => variantApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.variants.all });

      const previousVariants = queryClient.getQueryData(
        queryKeys.variants.lists()
      );
      const previousVariant = queryClient.getQueryData(
        queryKeys.variants.detail(id)
      );

      // Update detail cache
      queryClient.setQueryData(
        queryKeys.variants.detail(id),
        (old: ProductVariant | undefined) => {
          if (!old) return old;
          return { ...old, ...data, updatedAt: new Date() };
        }
      );

      return { previousVariants, previousVariant };
    },

    onError: (err, { id }, context) => {
      if (context?.previousVariants) {
        queryClient.setQueryData(
          queryKeys.variants.lists(),
          context.previousVariants
        );
      }
      if (context?.previousVariant) {
        queryClient.setQueryData(
          queryKeys.variants.detail(id),
          context.previousVariant
        );
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
    },
  });
}

/**
 * Hook to delete a variant
 *
 * Features:
 * - Automatic cache invalidation on success
 */
export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => variantApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}
