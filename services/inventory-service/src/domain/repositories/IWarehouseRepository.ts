import type { IRepository } from '@kidkazz/ddd-core';
import { Warehouse } from '../entities/Warehouse';

/**
 * Warehouse Repository Interface
 */
export interface IWarehouseRepository extends IRepository<Warehouse> {
  /**
   * Find warehouse by code
   */
  findByCode(code: string): Promise<Warehouse | null>;

  /**
   * Find all warehouses with optional status filter
   */
  findAll(status?: string): Promise<Warehouse[]>;

  /**
   * Find all active warehouses
   */
  findActive(): Promise<Warehouse[]>;
}
