import { Product } from '../entities/Product';
import { Result } from '../../shared/types';

/**
 * Product Repository Port (Interface)
 * Defines operations for Product aggregate persistence
 * This is a port in Hexagonal Architecture
 */
export interface IProductRepository {
  /**
   * Save a new product or update existing one
   */
  save(product: Product): Promise<Result<void>>;

  /**
   * Find product by ID
   */
  findById(id: string): Promise<Result<Product | null>>;

  /**
   * Find product by SKU
   */
  findBySKU(sku: string): Promise<Result<Product | null>>;

  /**
   * Find all active products
   */
  findAll(filters?: {
    availableForRetail?: boolean;
    availableForWholesale?: boolean;
    status?: 'active' | 'inactive' | 'discontinued';
  }): Promise<Result<Product[]>>;

  /**
   * Delete product by ID
   */
  delete(id: string): Promise<Result<void>>;
}
