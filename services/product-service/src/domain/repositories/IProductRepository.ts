import type { IRepository } from '@kidkazz/ddd-core';
import type { Product } from '../entities/Product';

/**
 * Product Repository Interface
 * Defines contract for product persistence
 */
export interface IProductRepository extends IRepository<Product> {
  /**
   * Find product by SKU
   */
  findBySKU(sku: string): Promise<Product | null>;

  /**
   * Find product by barcode
   */
  findByBarcode(barcode: string): Promise<Product | null>;

  /**
   * Find all products with optional filters
   */
  findAll(filters?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<Product[]>;

  /**
   * Find products by category
   */
  findByCategory(categoryId: string): Promise<Product[]>;
}
