/**
 * Product Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching.
 * Integrates Product catalog data with Inventory stock data (DDD-compliant).
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates for mutations
 * - Proper error handling and retry logic
 * - Type-safe API calls
 * - Product + Inventory integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productApi,
  inventoryApi,
  type Product,
  type ProductWithInventory,
  type CreateProductInput,
  type ProductStockResponse,
  type LowStockStatusResponse,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all products with optional inventory data
 *
 * @param filters.status - Filter by product status
 * @param filters.category - Filter by category ID
 * @param filters.search - Search term for product name/SKU
 * @param options.enabled - Enable/disable query (default: true)
 * @param options.includeInventory - Fetch inventory data for each product (default: false)
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
            const minimumStock = inventory.warehouses?.[0]?.minimumStock || 0;
            return {
              ...product,
              inventory: {
                totalAvailable: inventory.totalAvailable || 0,
                totalReserved: inventory.totalReserved || 0,
                totalInTransit: 0, // From transfers - Phase 7
                minimumStock,
                isLowStock: (inventory.totalAvailable || 0) < minimumStock,
                warehouses: inventory.warehouses || [],
              },
            };
          } catch {
            // Product might not have inventory yet
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
 * Hook to fetch products with inventory in a single efficient query
 * Uses parallel fetching for better performance
 */
export function useProductsWithInventory(
  filters?: { status?: string; category?: string; search?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: [...queryKeys.products.list(filters), 'with-inventory'] as const,
    queryFn: async () => {
      const { products, total } = await productApi.getAll(filters);

      // Batch fetch inventory for all products
      const inventoryPromises = products.map((product) =>
        inventoryApi.getByProduct(product.id).catch(() => null)
      );

      const inventoryResults = await Promise.all(inventoryPromises);

      const productsWithInventory: ProductWithInventory[] = products.map(
        (product, index) => {
          const inventory = inventoryResults[index];
          if (!inventory) {
            return product;
          }

          const minimumStock = inventory.warehouses?.[0]?.minimumStock || 0;
          return {
            ...product,
            inventory: {
              totalAvailable: inventory.totalAvailable || 0,
              totalReserved: inventory.totalReserved || 0,
              totalInTransit: 0,
              minimumStock,
              isLowStock: (inventory.totalAvailable || 0) < minimumStock,
              warehouses: inventory.warehouses || [],
            },
          };
        }
      );

      return { products: productsWithInventory, total };
    },
    enabled,
  });
}

/**
 * Hook to fetch a single product by ID
 *
 * @param id - Product ID
 * @param options.enabled - Enable/disable query (default: true)
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
 * Hook to fetch a single product with its inventory data
 *
 * @param id - Product ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useProductWithInventory(
  id: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: [...queryKeys.products.detail(id), 'with-inventory'] as const,
    queryFn: async (): Promise<ProductWithInventory> => {
      const [product, inventory] = await Promise.all([
        productApi.getById(id),
        inventoryApi.getByProduct(id).catch(() => null),
      ]);

      if (!inventory) {
        return product;
      }

      const minimumStock = inventory.warehouses?.[0]?.minimumStock || 0;
      return {
        ...product,
        inventory: {
          totalAvailable: inventory.totalAvailable || 0,
          totalReserved: inventory.totalReserved || 0,
          totalInTransit: 0,
          minimumStock,
          isLowStock: (inventory.totalAvailable || 0) < minimumStock,
          warehouses: inventory.warehouses || [],
        },
      };
    },
    enabled: enabled && !!id,
  });
}

/**
 * Hook to fetch product stock from Inventory Service (single source of truth)
 *
 * @param productId - Product ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useProductStock(
  productId: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.products.stock(productId),
    queryFn: () => productApi.getStock(productId),
    enabled: enabled && !!productId,
  });
}

/**
 * Hook to fetch product low stock status
 *
 * @param productId - Product ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useProductLowStockStatus(
  productId: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.products.lowStock(productId),
    queryFn: () => productApi.getLowStockStatus(productId),
    enabled: enabled && !!productId,
  });
}

/**
 * Hook to create a new product
 *
 * Features:
 * - Automatic cache invalidation on success
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => productApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook to update an existing product
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductInput> }) =>
      productApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });

      const previousProducts = queryClient.getQueryData(
        queryKeys.products.lists()
      );
      const previousProduct = queryClient.getQueryData(
        queryKeys.products.detail(id)
      );

      // Update list cache
      queryClient.setQueryData(
        queryKeys.products.lists(),
        (old: { products: Product[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p) =>
              p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
            ),
          };
        }
      );

      // Update detail cache
      queryClient.setQueryData(
        queryKeys.products.detail(id),
        (old: Product | undefined) => {
          if (!old) return old;
          return { ...old, ...data, updatedAt: new Date() };
        }
      );

      return { previousProducts, previousProduct };
    },

    onError: (err, { id }, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          queryKeys.products.lists(),
          context.previousProducts
        );
      }
      if (context?.previousProduct) {
        queryClient.setQueryData(
          queryKeys.products.detail(id),
          context.previousProduct
        );
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
    },
  });
}

/**
 * Hook to update product price
 */
export function useUpdateProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      priceType,
      newPrice,
    }: {
      id: string;
      priceType: 'retail' | 'wholesale' | 'base';
      newPrice: number;
    }) => productApi.updatePrice(id, { priceType, newPrice }),

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
      });
    },
  });
}

/**
 * Hook to delete a product
 *
 * Features:
 * - Optimistic removal from cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });

      const previousProducts = queryClient.getQueryData(
        queryKeys.products.lists()
      );

      // Remove from list cache
      queryClient.setQueryData(
        queryKeys.products.lists(),
        (old: { products: Product[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            products: old.products.filter((p) => p.id !== id),
            total: old.total - 1,
          };
        }
      );

      // Remove detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.products.detail(id),
      });

      return { previousProducts };
    },

    onError: (err, id, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          queryKeys.products.lists(),
          context.previousProducts
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to search products by SKU
 */
export function useProductBySKU(sku: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: [...queryKeys.products.all, 'sku', sku] as const,
    queryFn: () => productApi.getBySKU(sku),
    enabled: enabled && !!sku,
  });
}
