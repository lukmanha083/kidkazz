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
 * Adds a new item to the query cache optimistically.
 *
 * @param queryClient - TanStack Query client used to read and write cache data
 * @param queryKey - Key identifying the cached array to update
 * @param newItem - Item to append to the cached array
 * @returns An object with a `rollback` method that restores the previous cached array if one was present
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
 * Apply a partial update to the cached item with the given id for the specified query key.
 *
 * @param queryKey - Query key identifying the cached array to update.
 * @param id - The id of the item to update.
 * @param updates - Fields to merge into the matched item.
 * @returns An object with `rollback()` that restores the previous cached array if one was present.
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
 * Remove the item with the given `id` from the cached array at `queryKey`.
 *
 * @param queryKey - The query key identifying the cached array to update
 * @param id - ID of the item to remove from the cache
 * @returns An object with `rollback()` that restores the previous cached array if it existed
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
 * Add multiple items to the cached array for the specified query key and provide a rollback to restore the prior cache state.
 *
 * Captures the previous array stored under `queryKey`, appends `newItems` to the cache, and returns an object whose `rollback()` restores the captured previous array if it existed.
 *
 * @param queryKey - The query key identifying the cached array to update
 * @param newItems - Items to append to the cached array
 * @returns An object with a `rollback()` method that restores the previous cached array value if one was captured
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
 * Apply multiple per-id partial updates to the array cached under the provided query key.
 *
 * Captures the current cached array, merges each provided partial update into the item with the matching `id`, and returns a rollback helper that restores the captured array if it existed.
 *
 * @param updates - Map from item `id` to the partial fields to merge into the matching item
 * @returns An object with `rollback()` that restores the previous cached array if it was present
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
 * Remove multiple items with the given IDs from the cached array for the specified query key, performing the change optimistically.
 *
 * @param queryClient - TanStack Query client whose cache will be modified
 * @param queryKey - Query key identifying the cached array to update
 * @param ids - IDs of items to remove from the cached array
 * @returns An object with `rollback()` that restores the previous cached array if it was present
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