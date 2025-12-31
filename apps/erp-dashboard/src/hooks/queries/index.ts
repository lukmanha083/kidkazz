/**
 * React Query Hooks
 *
 * Centralized export for all TanStack Query hooks.
 * Phase F2 - TanStack Query Completion with Product-Inventory Integration
 */

// Warehouse hooks
export {
  useWarehouses,
  useActiveWarehouses,
  useWarehouse,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from './useWarehouses';

// Inventory hooks
export {
  useInventory,
  useProductInventory,
  useProductWarehouseInventory,
  useInventoryMovements,
  useAdjustInventory,
  useSetMinimumStock,
} from './useInventory';

// Batch hooks (for expiration tracking - FEFO)
export {
  useBatches,
  useBatch,
  useExpiringBatches,
  useExpiredBatches,
  useCreateBatch,
  useAdjustBatch,
  useUpdateBatchStatus,
  useDeleteBatch,
} from './useBatches';

// Bundle hooks
export {
  useBundles,
  useBundle,
  useBundleAvailableStock,
  useCreateBundle,
  useUpdateBundle,
  useUpdateBundleItems,
  useUpdateBundleStock,
  useDeleteBundle,
} from './useBundles';
