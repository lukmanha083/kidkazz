/**
 * React Query Hooks
 *
 * Centralized export for all query hooks
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
