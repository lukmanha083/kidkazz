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

// Product hooks (with inventory integration)
export {
  useProducts,
  useProductsWithInventory,
  useProduct,
  useProductWithInventory,
  useProductStock,
  useProductLowStockStatus,
  useCreateProduct,
  useUpdateProduct,
  useUpdateProductPrice,
  useDeleteProduct,
  useProductBySKU,
} from './useProducts';

// Variant hooks
export {
  useVariants,
  useVariantsWithInventory,
  useVariant,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from './useVariants';

// Bundle hooks (with virtual stock calculation)
export {
  useBundles,
  useBundle,
  useBundleAvailableStock,
  useBundleWithStock,
  useCreateBundle,
  useUpdateBundle,
  useUpdateBundleItems,
  useDeleteBundle,
} from './useBundles';

// Batch hooks (for expiration tracking - FEFO)
export {
  useBatches,
  useBatch,
  useExpiringBatches,
  useExpiredBatches,
  useCreateBatch,
  useAdjustBatch,
  useUpdateBatchStatus,
} from './useBatches';

// Category hooks
export {
  useCategories,
  useActiveCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './useCategories';
