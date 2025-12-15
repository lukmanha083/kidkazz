/**
 * Batch Queries (React Query)
 *
 * Modern hooks using @tanstack/react-query for data fetching and caching.
 * Inventory Batches for FEFO (First Expired, First Out) tracking.
 *
 * Features:
 * - Expiration date tracking
 * - Alert date notifications
 * - Batch status management
 * - Type-safe API calls
 *
 * Note: Batch API endpoints are planned for Phase 7-8.
 * These hooks are prepared for when the backend is ready.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import type { InventoryBatch } from '../../lib/api';

// Batch API endpoints - to be implemented when backend is ready
const INVENTORY_SERVICE_URL =
  import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';

const batchApi = {
  getAll: async (filters?: {
    productId?: string;
    warehouseId?: string;
    status?: string;
  }): Promise<{ batches: InventoryBatch[]; total: number }> => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const url = `${INVENTORY_SERVICE_URL}/api/batches${params ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch batches: ${response.statusText}`);
    }
    return response.json();
  },

  getById: async (id: string): Promise<InventoryBatch> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/${id}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch batch: ${response.statusText}`);
    }
    return response.json();
  },

  getExpiring: async (days: number): Promise<{ batches: InventoryBatch[]; total: number }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/expiring?days=${days}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch expiring batches: ${response.statusText}`);
    }
    return response.json();
  },

  getExpired: async (): Promise<{ batches: InventoryBatch[]; total: number }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/expired`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch expired batches: ${response.statusText}`);
    }
    return response.json();
  },

  create: async (data: {
    inventoryId: string;
    productId: string;
    warehouseId: string;
    batchNumber: string;
    lotNumber?: string;
    expirationDate?: string;
    alertDate?: string;
    quantityAvailable: number;
  }): Promise<InventoryBatch> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create batch: ${response.statusText}`);
    }
    return response.json();
  },

  adjust: async (
    batchId: string,
    data: { quantity: number; reason: string }
  ): Promise<{ message: string }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/${batchId}/adjust`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to adjust batch: ${response.statusText}`);
    }
    return response.json();
  },

  updateStatus: async (
    batchId: string,
    status: 'active' | 'expired' | 'depleted' | 'quarantined'
  ): Promise<{ message: string }> => {
    const url = `${INVENTORY_SERVICE_URL}/api/batches/${batchId}/status`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update batch status: ${response.statusText}`);
    }
    return response.json();
  },
};

/**
 * Hook to fetch batches with optional filters
 *
 * @param filters.productId - Filter by product ID
 * @param filters.warehouseId - Filter by warehouse ID
 * @param filters.status - Filter by batch status
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useBatches(
  filters?: { productId?: string; warehouseId?: string; status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchApi.getAll(filters),
    enabled,
  });
}

/**
 * Hook to fetch a single batch by ID
 *
 * @param id - Batch ID
 * @param options.enabled - Enable/disable query (default: true)
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
 * Hook to fetch batches expiring within specified days
 * Useful for expiration alerts and FEFO planning
 *
 * @param days - Number of days to look ahead (default: 30)
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useExpiringBatches(
  days: number = 30,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.expiring(days),
    queryFn: () => batchApi.getExpiring(days),
    enabled,
    // Refresh frequently for accurate alerts
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch already expired batches
 * Used for quarantine and disposal processes
 *
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useExpiredBatches(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.batches.expired(),
    queryFn: () => batchApi.getExpired(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new batch
 *
 * Features:
 * - Automatic cache invalidation on success
 * - Invalidates inventory cache since quantity is affected
 */
export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

/**
 * Hook to adjust batch quantity
 *
 * Features:
 * - Automatic cache invalidation on success
 * - Invalidates inventory cache since quantity is affected
 */
export function useAdjustBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: { quantity: number; reason: string };
    }) => batchApi.adjust(batchId, data),

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
 * - Automatic cache invalidation on success
 */
export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      status,
    }: {
      batchId: string;
      status: 'active' | 'expired' | 'depleted' | 'quarantined';
    }) => batchApi.updateStatus(batchId, status),

    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.detail(batchId),
      });
    },
  });
}
