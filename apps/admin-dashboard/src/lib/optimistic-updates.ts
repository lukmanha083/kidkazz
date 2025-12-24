/**
 * Optimistic UI Update Utilities
 *
 * Provides utilities for optimistic updates with automatic rollback on error
 * Improves perceived performance by updating UI immediately before API confirmation
 *
 * Features:
 * - Immediate UI feedback
 * - Automatic rollback on error
 * - Type-safe with generic constraints
 * - Works with TanStack Query cache
 *
 * @see Phase 6: Optimistic UI Updates with Rollback
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Optimistically add a new item to the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param newItem - New item to add
 * @returns Rollback function to restore previous state
 */
export function optimisticCreate<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	newItem: T
) {
	// Save previous state for rollback
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	// Optimistically update the cache
	queryClient.setQueryData<T[]>(queryKey, (old) => [...(old || []), newItem]);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}

/**
 * Optimistically update an existing item in the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param id - ID of the item to update
 * @param updates - Partial updates to apply
 * @returns Rollback function to restore previous state
 */
export function optimisticUpdate<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	id: string,
	updates: Partial<T>
) {
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	queryClient.setQueryData<T[]>(queryKey, (old) =>
		(old || []).map((item) =>
			item.id === id ? { ...item, ...updates } : item
		)
	);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}

/**
 * Optimistically delete an item from the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param id - ID of the item to delete
 * @returns Rollback function to restore previous state
 */
export function optimisticDelete<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	id: string
) {
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	queryClient.setQueryData<T[]>(queryKey, (old) =>
		(old || []).filter((item) => item.id !== id)
	);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}

/**
 * Optimistically add multiple items to the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param newItems - Array of new items to add
 * @returns Rollback function to restore previous state
 */
export function optimisticBatchCreate<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	newItems: T[]
) {
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	queryClient.setQueryData<T[]>(queryKey, (old) => [
		...(old || []),
		...newItems,
	]);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}

/**
 * Optimistically update multiple items in the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param updates - Map of item IDs to their updates
 * @returns Rollback function to restore previous state
 */
export function optimisticBatchUpdate<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	updates: Record<string, Partial<T>>
) {
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	queryClient.setQueryData<T[]>(queryKey, (old) =>
		(old || []).map((item) =>
			updates[item.id] ? { ...item, ...updates[item.id] } : item
		)
	);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}

/**
 * Optimistically delete multiple items from the cache
 * @param queryClient - TanStack Query client instance
 * @param queryKey - Query key to update
 * @param ids - Array of item IDs to delete
 * @returns Rollback function to restore previous state
 */
export function optimisticBatchDelete<T extends { id: string }>(
	queryClient: QueryClient,
	queryKey: string[],
	ids: string[]
) {
	const previousData = queryClient.getQueryData<T[]>(queryKey);

	queryClient.setQueryData<T[]>(queryKey, (old) =>
		(old || []).filter((item) => !ids.includes(item.id))
	);

	return {
		rollback: () => {
			if (previousData) {
				queryClient.setQueryData(queryKey, previousData);
			}
		},
	};
}
