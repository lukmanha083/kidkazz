import { and, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Product } from '../../domain/entities/Product';
import type { IProductRepository } from '../../domain/repositories/IProductRepository';
import { products } from '../db/schema';

/**
 * Drizzle ORM implementation of Product Repository
 */
export class ProductRepository implements IProductRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.db.select().from(products).where(eq(products.id, id)).get();

    if (!result) {
      return null;
    }

    return Product.reconstitute(result as any);
  }

  async findBySKU(sku: string): Promise<Product | null> {
    const result = await this.db.select().from(products).where(eq(products.sku, sku)).get();

    if (!result) {
      return null;
    }

    return Product.reconstitute(result as any);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const result = await this.db.select().from(products).where(eq(products.barcode, barcode)).get();

    if (!result) {
      return null;
    }

    return Product.reconstitute(result as any);
  }

  async findAll(filters?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<Product[]> {
    let query = this.db.select().from(products);

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }

    if (filters?.category) {
      conditions.push(eq(products.categoryId, filters.category));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.sku, `%${filters.search}%`),
          like(products.barcode, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.all();

    return results.map((r) => Product.reconstitute(r as any));
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const results = await this.db
      .select()
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .all();

    return results.map((r) => Product.reconstitute(r as any));
  }

  async save(product: Product): Promise<void> {
    const data = product.toData();

    // Check if product exists
    const existing = await this.db.select().from(products).where(eq(products.id, data.id)).get();

    if (existing) {
      // Update
      await this.db
        .update(products)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.id))
        .run();
    } else {
      // Insert
      await this.db
        .insert(products)
        .values(data as any)
        .run();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id)).run();
  }
}
