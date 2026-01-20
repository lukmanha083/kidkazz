import type { IRepository } from '@kidkazz/ddd-core';
import type { Inventory } from '../entities/Inventory';

/**
 * Inventory Repository Interface
 */
export interface IInventoryRepository extends IRepository<Inventory> {
  /**
   * Find inventory by product and warehouse
   */
  findByProductAndWarehouse(productId: string, warehouseId: string): Promise<Inventory | null>;

  /**
   * Find all inventory for a product across warehouses
   */
  findByProduct(productId: string): Promise<Inventory[]>;

  /**
   * Find all inventory in a warehouse
   */
  findByWarehouse(warehouseId: string): Promise<Inventory[]>;

  /**
   * Find all inventory with optional filters
   */
  findAll(filters?: {
    productId?: string;
    warehouseId?: string;
  }): Promise<Inventory[]>;
}
