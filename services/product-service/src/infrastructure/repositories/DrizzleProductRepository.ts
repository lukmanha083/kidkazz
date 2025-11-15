import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product } from '../../domain/entities/Product';
import { products } from '../db/schema';
import { Result, ResultFactory } from '@kidkazz/types';

/**
 * Drizzle Product Repository (Adapter)
 * Implements IProductRepository port using Drizzle ORM
 * This is an adapter in Hexagonal Architecture
 */
export class DrizzleProductRepository implements IProductRepository {
  constructor(private readonly db: DrizzleD1Database) {}

  async save(product: Product): Promise<Result<void>> {
    try {
      const existing = await this.db
        .select()
        .from(products)
        .where(eq(products.id, product.getId()))
        .get();

      const data = {
        id: product.getId(),
        name: product.getName(),
        sku: product.getSKU().getValue(),
        description: '',
        retailPrice: product.getRetailPrice()?.getValue() || null,
        basePrice: product.getWholesalePrice().getValue(),
        availableForRetail: product.getAvailability().isAvailableForRetail(),
        availableForWholesale: product.getAvailability().isAvailableForWholesale(),
        minimumOrderQuantity: product.getMinimumOrderQuantity(),
        status: product.getStatus(),
        updatedAt: new Date(),
      };

      if (existing) {
        // Update existing product
        await this.db
          .update(products)
          .set(data)
          .where(eq(products.id, product.getId()))
          .run();
      } else {
        // Insert new product
        await this.db
          .insert(products)
          .values({
            ...data,
            createdAt: new Date(),
          })
          .run();
      }

      return ResultFactory.ok(undefined);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async findById(id: string): Promise<Result<Product | null>> {
    try {
      const row = await this.db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .get();

      if (!row) {
        return ResultFactory.ok(null);
      }

      const product = this.toDomain(row);
      return ResultFactory.ok(product);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async findBySKU(sku: string): Promise<Result<Product | null>> {
    try {
      const row = await this.db
        .select()
        .from(products)
        .where(eq(products.sku, sku))
        .get();

      if (!row) {
        return ResultFactory.ok(null);
      }

      const product = this.toDomain(row);
      return ResultFactory.ok(product);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async findAll(filters?: {
    availableForRetail?: boolean;
    availableForWholesale?: boolean;
    status?: 'active' | 'inactive' | 'discontinued';
  }): Promise<Result<Product[]>> {
    try {
      const conditions = [];

      if (filters?.availableForRetail !== undefined) {
        conditions.push(eq(products.availableForRetail, filters.availableForRetail));
      }

      if (filters?.availableForWholesale !== undefined) {
        conditions.push(eq(products.availableForWholesale, filters.availableForWholesale));
      }

      if (filters?.status) {
        conditions.push(eq(products.status, filters.status));
      }

      const query = this.db.select().from(products);

      const rows = conditions.length > 0
        ? await query.where(and(...conditions)).all()
        : await query.all();

      const productList = rows.map((row) => this.toDomain(row));
      return ResultFactory.ok(productList);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.delete(products).where(eq(products.id, id)).run();
      return ResultFactory.ok(undefined);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: {
    id: string;
    name: string;
    sku: string;
    description: string | null;
    retailPrice: number | null;
    basePrice: number;
    availableForRetail: number;
    availableForWholesale: number;
    minimumOrderQuantity: number;
    status: string;
  }): Product {
    // Using a workaround since we can't directly instantiate Product
    // In production, we'd add a reconstitute factory method to Product entity
    const productResult = Product.create({
      name: row.name,
      sku: row.sku,
      description: row.description || '',
      retailPrice: row.retailPrice,
      wholesalePrice: row.basePrice,
      availability: {
        retail: Boolean(row.availableForRetail),
        wholesale: Boolean(row.availableForWholesale),
      },
      minimumOrderQuantity: row.minimumOrderQuantity,
    });

    if (!productResult.isSuccess) {
      throw new Error('Failed to reconstitute product from database');
    }

    // At this point we know value exists because isSuccess is true
    const product = productResult.value;
    if (!product) {
      throw new Error('Failed to reconstitute product from database');
    }

    return product;
  }
}
