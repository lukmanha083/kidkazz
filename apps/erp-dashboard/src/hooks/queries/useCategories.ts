/**
 * Category Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching.
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates for mutations
 * - Proper error handling and retry logic
 * - Type-safe API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  categoryApi,
  type Category,
  type CreateCategoryInput,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all categories
 *
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useCategories(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => categoryApi.getAll(),
    enabled,
  });
}

/**
 * Hook to fetch only active categories
 * Useful for dropdowns and selection lists
 *
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useActiveCategories(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.categories.active(),
    queryFn: () => categoryApi.getActive(),
    enabled,
  });
}

/**
 * Hook to fetch a single category by ID
 *
 * @param id - Category ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useCategory(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoryApi.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to create a new category
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) => categoryApi.create(data),

    // Optimistic update
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.categories.lists(),
      });

      const previousCategories = queryClient.getQueryData(
        queryKeys.categories.lists()
      );

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.categories.lists(),
        (old: { categories: Category[]; total: number } | undefined) => {
          if (!old) return old;

          const optimisticCategory: Partial<Category> = {
            id: `temp-${Date.now()}`,
            ...newCategory,
            status: newCategory.status || 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return {
            categories: [...old.categories, optimisticCategory as Category],
            total: old.total + 1,
          };
        }
      );

      return { previousCategories };
    },

    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Hook to update an existing category
 *
 * Features:
 * - Optimistic updates to the cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCategoryInput>;
    }) => categoryApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });

      const previousCategories = queryClient.getQueryData(
        queryKeys.categories.lists()
      );
      const previousCategory = queryClient.getQueryData(
        queryKeys.categories.detail(id)
      );

      // Update list cache
      queryClient.setQueryData(
        queryKeys.categories.lists(),
        (old: { categories: Category[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            categories: old.categories.map((c) =>
              c.id === id ? { ...c, ...data, updatedAt: new Date() } : c
            ),
          };
        }
      );

      // Update detail cache
      queryClient.setQueryData(
        queryKeys.categories.detail(id),
        (old: Category | undefined) => {
          if (!old) return old;
          return { ...old, ...data, updatedAt: new Date() };
        }
      );

      return { previousCategories, previousCategory };
    },

    onError: (err, { id }, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
      if (context?.previousCategory) {
        queryClient.setQueryData(
          queryKeys.categories.detail(id),
          context.previousCategory
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Hook to delete a category
 *
 * Features:
 * - Optimistic removal from cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });

      const previousCategories = queryClient.getQueryData(
        queryKeys.categories.lists()
      );

      // Remove from list cache
      queryClient.setQueryData(
        queryKeys.categories.lists(),
        (old: { categories: Category[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            categories: old.categories.filter((c) => c.id !== id),
            total: old.total - 1,
          };
        }
      );

      // Remove detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.categories.detail(id),
      });

      return { previousCategories };
    },

    onError: (err, id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          queryKeys.categories.lists(),
          context.previousCategories
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      // Invalidate products that might reference this category
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
